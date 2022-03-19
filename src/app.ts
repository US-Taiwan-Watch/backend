import "reflect-metadata";
import * as http from "http";
import { buildSchemaSync } from "type-graphql";
import { IApolloContext, JWTDecodedObject } from "./@types/common.interface";
import * as jwt from "jsonwebtoken";
import { VerifyErrors } from "jsonwebtoken";
import { ApolloServer, AuthenticationError } from "apollo-server-express";
import express from "express";
import { RedisClient } from "./redis/redis-client";
import { UserResolver } from "./resolver/user.resolver";
import { MessagingResolver } from "./resolver/messaging.resolver";
import { SubscriptionResolver } from "./resolver/subscription.resolver";
import config from "./config";
import * as bodyParser from "body-parser";
import cors from "cors";
import { ApolloServerPluginInlineTrace } from "apollo-server-core";
import { authChecker } from "./util/auth-helper";
import auth0RuleWebhookRouter from "./auth0/webhook";
import { appInsightsClient } from "./util/app-insights";
import WS from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";

async function bootstrap() {
  const jwks = require("jwks-rsa");
  const jwksClient = jwks({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: config.auth.jwksUri,
  });

  const getKey = (header: any, callback: any) => {
    jwksClient.getSigningKey(header.kid, (err: any, key: any) => {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  };

  const validateToken = (authToken: string) =>
    new Promise<JWTDecodedObject>((resolve, reject) => {
      // ... validate token and return a Promise, rejects in case of an error
      console.log(`authToken = ${authToken}`);

      if (!authToken) {
        reject("Auth token required");
      }

      jwt.verify(
        authToken,
        getKey,
        { algorithms: ["RS256"] },
        (err: VerifyErrors | null, decode: any) => {
          if (err) {
            reject(err);
          } else {
            const expectedIss = config.auth.verifyOptions.issuer ?? [];
            if (expectedIss.indexOf(decode.iss) === -1) {
              reject(
                `Unexpected Issuer ${decode.iss}. Expected: ${expectedIss}`
              );
            } else {
              console.log(JSON.stringify(decode, null, 2));
              resolve(decode as JWTDecodedObject);
            }
          }
        }
      );
    });

  // build TypeGraphQL executable schema
  const schema = buildSchemaSync({
    pubSub: RedisClient.pubsub,
    // resolvers: [__dirname + "/**/*.resolver.{ts,js}"]
    resolvers: [SubscriptionResolver, MessagingResolver, UserResolver],
    validate: false,
    authChecker,
    // emitSchemaFile: true,
  });

  const app = express();
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
  app.use(cors());

  app.use("/auth0-rule", auth0RuleWebhookRouter);

  // Create server
  const httpServer: http.Server = http.createServer((req, res) => {
    appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
    return app(req, res);
  });

  // Set up WebSocket server.
  const wsServer = new WS.Server<WS.WebSocket>({
    server: httpServer,
    path: "/",
  });
  const serverCleanup = useServer({ schema }, wsServer);

  // Set up ApolloServer.
  const apollo = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // get the user token from the headers
      try {
        const token = req?.headers.authorization?.replace("Bearer ", "");
        if (token) {
          const decoded = await validateToken(token);
          return <IApolloContext>{
            currentUser: decoded,
            token,
          };
        }
      } catch (err) {
        console.log(`ERR = ${err}`);
        throw new AuthenticationError("You must be logged in.");
      }
    },
    plugins: [
      ApolloServerPluginInlineTrace(),
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apollo.start();
  apollo.applyMiddleware({ app, path: "/" });

  // Now that our HTTP server is fully set up, actually listen.
  httpServer.listen({ port: config.port }, async () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${config.port}${apollo.graphqlPath}`
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${config.port}${apollo.graphqlPath}`
    );
  });
}

bootstrap().catch((err) => {
  console.log(err);
  console.log(JSON.stringify(err, null, 2));
});
