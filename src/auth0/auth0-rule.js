/* eslint-disable no-undef */
function postToBackendAPI(user, context, callback) {
  console.log("[postToBackendAPI triggered]");
  console.log(JSON.stringify(user, null, 2));

  const baseUrl = "https://api.ustw.watch/auth0-rule";
  const request = require('request');
  const crypto = require('crypto');

  const printRequest = (json) => {
    console.log("[REQUEST]");
    console.log(JSON.stringify(json, null, 2));
    console.log();
  };

  const printResponse = (err, body) => {
    console.log("[RESPONSE]");
    console.log("[ERROR]");
    console.log(JSON.stringify(err, null, 2));
    console.log("[BODY]");
    console.log(JSON.stringify(body, null, 2));
    console.log();
  };

  const getPassword = (cb) => {
    const req = {
      method: "GET",
      url: baseUrl + "/password",
      json: true
    };
    printRequest(req);
    request(req, (err, response, body) => {
      printResponse(err, body);
      cb(err, body.password);
    });
  };

  const sha256 = (text) => {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    return hash.digest("hex");
  };

  const signPayload = (password, json) => {
    const text = sha256(JSON.stringify(json));
    const algorithm = "aes-256-cbc";
    let key = crypto.randomBytes(32);
    key = Buffer.concat([Buffer.from(password)], key.length);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  };

  const postWebhook = (data) => {
    getPassword((err, password) => {
      if (err) {
        return callback("Get password failed", user, context);
      }
      console.log("PASSWORD = ", password);


      const req = {
        method: "POST",
        url: baseUrl + "/event",
        headers: {
          "authorization": signPayload(password, data)
        },
        json: data
      };
      printRequest(req);

      request(req, (err, response, body) => {
        printResponse(err, body);
        return callback(err, user, context);
      });
    });
  };

  if (user.app_metadata) {
    const data = {
      event: "login",
      user
    };
    return postWebhook(data);
  } else {
    user.app_metadata = {
      asiania: true
    };
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata);
    const data = {
      event: "create",
      user
    };
    return postWebhook(data);
  }
}