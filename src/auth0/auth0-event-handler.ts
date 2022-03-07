/**

[Example]

const user = {
  _id: "3455294c1b07a7c33a366741e2d810bc",
  clientID: "alY7W780uX9Krk3qLuGQq0ohJGCObiHz",
  created_at: "2020-04-07T14:16:56.525Z",
  email: "yingpo.liao@gmail.com",
  email_verified: true,
  family_name: "Liao",
  given_name: "Ying-po",
  identities: [
    {
      user_id: "10220492169271655",
      access_token:
        "EAADC1UblH44BAHPuQPpGKaE8m1TTyG7Jm2LZBdqLCNM9NWH1iXZAqQ9FjRx9aTP5TNTxvVFSPWqDa5cFkOpuoMMS82oo8qpFPrMpA64h95NbKjBtyiaeKskog4wojkOJP4yNATZB5GDzcW0LpB6K11dsScPPvZCm06mXgGtAPAZDZD",
      provider: "facebook",
      connection: "facebook",
      isSocial: true,
    },
  ],
  install_type: "UNKNOWN",
  installed: true,
  middle_name: "Robin",
  name: "Ying-po Robin Liao",
  name_format: "{first} {last}",
  nickname: "yingpo.liao",
  picture:
    "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10220492169271655&height=50&width=50&ext=1589870271&hash=AeQNgg54NLUQGI5R",
  picture_large:
    "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10220492169271655&width=999999&ext=1589870271&hash=AeRCgU3SmhPcOVCx",
  security_settings: {
    secure_browsing: {
      enabled: true,
    },
  },
  short_name: "Ying-po",
  updated_at: "2020-04-19T06:37:51.346Z",
  user_id: "facebook|10220492169271655",
  video_upload_limits: {
    length: 14460,
    size: 28633115306,
  },
  viewer_can_send_gift: false,
  global_client_id: "2Q2vGfXI1aSeDaBkUc7uH0RXYb8zICtm",
  persistent: {},
  app_metadata: {
    asiania: true,
  },
};
 */

import { UserResolver } from "../resolver/user.resolver";
import * as _ from "lodash";

export type Connection =
  | "Username-Password-Authentication"
  | "apple"
  | "facebook"
  | "google-oauth2";

export interface IAuth0UserIdentity {
  connection: Connection;
  user_id: string;
  provider: string;
  isSocial: boolean;
}

export interface IAuth0UserIdentity {
  connection: Connection;
  user_id: string;
  provider: string;
  isSocial: boolean;
}

export interface IAuth0User {
  user_id: string;
  name: string;
  nickname: string;
  short_name: string;
  middle_name: string;
  family_name: string;
  given_name: string;
  email: string;
  picture: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  logins_count: number;
  identities: IAuth0UserIdentity[];
}

export interface IAuth0Event {
  event: "create" | "login";
  user: IAuth0User;
}

export class Auth0EventHandler {
  public handleEvent(evt: IAuth0Event) {
    const { event: eventType, user } = evt;
    const { user_id, name } = user;
    console.log("eventType = ", eventType);
    console.log("user_id = ", user_id);
    console.log("name = ", name);
    const resolver = new UserResolver();
    if (eventType === "create") {
      resolver.createUser(user.user_id, user.email);
    }
  }
}
