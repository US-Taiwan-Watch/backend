import express from "express";
import bodyParser from "body-parser";
import * as _ from "lodash";
import config from "../config";
import { decrypt, sha256 } from "../util/cipher-helper";
import { Auth0EventHandler } from "./auth0-event-handler";

const router = express.Router();
router.use(bodyParser.json());

router.get("/password", (req, res) => {
  res.json({
    password: config.app.encryptPassword,
  });
});

router.post("/event", (req, res) => {
  const { headers, body, path, url, baseUrl, params, query } = req;
  const payload = { headers, body, path, url, baseUrl, params, query };
  console.log(payload);
  const payloadSign = headers.authorization;

  console.log(`[Auth0-Webhook] Payload Signature = ${payloadSign}`);

  if (payloadSign) {
    const verifySha256 = decrypt(payloadSign, config.app.encryptPassword);
    const payloadSha256 = sha256(JSON.stringify(body));

    console.log(`[Auth0-Webhook] Verify Body = `, JSON.stringify(body));
    console.log(`[Auth0-Webhook] Payload SHA 256 = ${payloadSha256}`);
    console.log(`[Auth0-Webhook] Verify SHA 256 = ${verifySha256}`);

    if (_.isEqual(payloadSha256, verifySha256)) {
      console.log("[Auth0-Webhook] PAYLOAD VERIFIED!");
      const handler = new Auth0EventHandler();
      handler.handleEvent(body);
      return res.json(payload);
    }
  }
  return res.json({
    error: "invalid payload",
  });
});

export default router;
