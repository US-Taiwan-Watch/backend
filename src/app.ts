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
import config from "./config";
import * as bodyParser from "body-parser";
import cors from "cors";
import { ApolloServerPluginInlineTrace } from "apollo-server-core";
import { authChecker } from "./util/auth-helper";
import auth0RuleWebhookRouter from "./auth0/webhook";
import { appInsightsClient } from "./util/app-insights";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";

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
    resolvers: [UserResolver],
    validate: false,
    authChecker,
    // emitSchemaFile: true,
  });

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
    plugins: [ApolloServerPluginInlineTrace()],
  });

  const app = express();
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
  app.use(cors());

  app.use("/auth0-rule", auth0RuleWebhookRouter);

  await apollo.start();
  apollo.applyMiddleware({ app, path: "/" });

  // Create server
  const server: http.Server = http.createServer((req, res) => {
    appInsightsClient.trackNodeHttpRequest({ request: req, response: res });
    return app(req, res);
  });

  server.listen({ port: config.port }, async () => {
    // Add subscription support
    SubscriptionServer.create(
      { execute, subscribe, schema },
      {
        server,
        path: apollo.graphqlPath,
      }
    );

    console.log(
      `🚀 Server ready at PORT=${config.port} PATH=${apollo.graphqlPath}`
    );
  });
}

bootstrap().catch((err) => {
  console.log(err);
  console.log(JSON.stringify(err, null, 2));
});
