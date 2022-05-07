require("dotenv").config();

export default {
  port: 5487,
  db_config: {
    db: "ustw",
    remote: {
      host: process.env.MONGO_DB_HOST as string,
      port: 27017,
      username: process.env.MONGO_DB_USER as string,
      password: process.env.MONGO_DB_PASS as string,
    },
  },
  auth: {
    jwksUri: "https://us-taiwan-watch.us.auth0.com/.well-known/jwks.json",
    s2s: {
      audience: "https://api.ustw.watch",
      client_id: ["CJuA2p7s2cRKp1TvPtVI18Lq8tecp7ev@clients"],
    },
    verifyOptions: {
      issuer: ["https://us-taiwan-watch.us.auth0.com/"],
    },
    auth0Management: {
      client_id: process.env.AUTH_AUTH0_MANAGEMENT_CLIENT_ID as string,
      client_secret: process.env.AUTH_AUTH0_MANAGEMENT_CLIENT_SECRET as string,
      audience: "https://us-taiwan-watch.us.auth0.com/api/v2/",
    },
  },
  redis: {
    host: process.env.REDIS_HOST as string,
    password: process.env.REDIS_PASS as string,
  },
  app: {
    encryptPassword: process.env.APP_ENCRYPT_PASSWORD as string,
  },
  logging: {
    application_insights_key: process.env.APP_INSIGHTS_KEY as string,
    application_insights_role: process.env.APP_INSIGHTS_ROLE as string,
    application_insights_app_id: process.env.APP_INSIGHTS_APP_ID as string,
    application_insights_api_key: process.env.APP_INSIGHTS_API_KEY as string,
  },
  storage: {
    connection_string: process.env.AZURE_STORAGE_CONNECTION_STRING as string,
  },
};
