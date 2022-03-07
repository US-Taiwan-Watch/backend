import * as request from "request-promise";
import config from "../config";
import * as _ from "lodash";
import { RedisClient } from "../redis/redis-client";
import { IAuth0User } from "./auth0-event-handler";
import { getCacheKey } from "../redis/cache-key";
import { RestClient } from "../util/rest-client";
import { registerEnumType } from "type-graphql";
import { Auth0RoleName } from "../../common/models";

interface IdToken {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

interface Auth0Role {
  id: string;
  name: Auth0RoleName;
  description: string;
  sources: {
    source_id: string;
    source_type: string;
    source_name: string;
  }[];
}

/**
 * register Auth0RoleName
 */
registerEnumType(Auth0RoleName, { name: "Auth0RoleName" });

const Auth0RoleIdMap: { [key in Auth0RoleName]: string } = {
  [Auth0RoleName.Admin]: "rol_c3oKfG2GuW967l60",
  [Auth0RoleName.S2S]: "N/A",
};

export class Auth0Management {
  public static readonly api = new Auth0Management();

  private readonly mangApiEndpoint =
    "https://us-taiwan-watch.us.auth0.com/api/v2";
  private cachedToken: IdToken | undefined;

  private async getToken(): Promise<string> {
    if (
      !this.cachedToken ||
      this.cachedToken.expires_in <= new Date().getTime()
    ) {
      const token: IdToken = await request.post(
        "https://us-taiwan-watch.us.auth0.com/oauth/token",
        {
          body: {
            client_id: config.auth.auth0Management.client_id,
            client_secret: config.auth.auth0Management.client_secret,
            audience: config.auth.auth0Management.audience,
            grant_type: "client_credentials",
          },
          json: true,
        }
      );

      this.cachedToken = {
        ...token,
        expires_in: new Date().getTime() + token.expires_in * 1000,
      };

      console.log(
        `Refreshed Auth0 Management API token expires_in = ${new Date(
          this.cachedToken.expires_in
        )}`
      );
    }
    return this.cachedToken?.access_token;
  }

  public async getRoles(
    userId: string,
    noCache?: boolean
  ): Promise<Auth0RoleName[]> {
    const cacheKey = getCacheKey("AUTH0_ROLE", userId);
    const cacheVal = await RedisClient.get(cacheKey);
    let roles: Auth0RoleName[] = [];
    if (cacheVal && !noCache) {
      console.log("getRoles() - use cache");
      roles = JSON.parse(cacheVal);
    } else {
      const token = await this.getToken();
      const auth0Res: Auth0Role[] = await request.get(
        `${this.mangApiEndpoint}/users/${userId}/roles`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
          json: true,
        }
      );
      roles = _.map(auth0Res, (r) => r.name);
      console.log("getRoles() - updating cache...");
      await RedisClient.set(
        cacheKey,
        JSON.stringify(roles),
        RedisClient.CacheTime.HALF_HOUR
      );
      console.log("getRoles() - updating cache...Done!");
    }
    return roles;
  }

  public async isAdmin(userId: string): Promise<boolean> {
    const roles = await this.getRoles(userId);
    return roles.includes(Auth0RoleName.Admin);
  }

  public async addRole(userId: string, role: Auth0RoleName) {
    const currentRoles = await this.getRoles(userId, true);
    if (!currentRoles.includes(role)) {
      const roles: Auth0RoleName[] = [role, ...currentRoles];
      const roleIdx = roles.map((r) => Auth0RoleIdMap[r]);
      const token = await this.getToken();
      await RestClient.create(
        `${this.mangApiEndpoint}/users/${userId}/roles`,
        {
          roles: roleIdx,
        },
        {
          additionalHeaders: {
            authorization: `Bearer ${token}`,
            "cache-control": "no-cache",
          },
        }
      );
      // flush cache
      return await this.getRoles(userId, true);
    }
  }

  public async changeName(userId: string, name: string) {
    const token = await this.getToken();
    try {
      await RestClient.update(
        `${this.mangApiEndpoint}/users/${userId}`,
        {
          name,
        },
        {
          additionalHeaders: {
            authorization: `Bearer ${token}`,
            "cache-control": "no-cache",
          },
        }
      );
      console.log(`changeName(${userId}) - reset cache...`);
      RedisClient.client.del([getCacheKey("AUTH0_USER", userId)]);
      console.log(`changeName(${userId}) - reset cache... done`);
    } catch (err) {
      console.log(`changeName(${userId}) - error ${err}`);
    }
    return true;
  }

  public async changeEmail(userId: string, email: string) {
    const token = await this.getToken();
    try {
      await RestClient.update(
        `${this.mangApiEndpoint}/users/${userId}`,
        {
          email,
        },
        {
          additionalHeaders: {
            authorization: `Bearer ${token}`,
            "cache-control": "no-cache",
          },
        }
      );
      console.log(`changeEmail(${userId}) - reset cache...`);
      RedisClient.client.del([getCacheKey("AUTH0_USER", userId)]);
      console.log(`changeEmail(${userId}) - reset cache... done`);
    } catch (err) {
      console.log(`changeEmail(${userId}) - error ${err}`);
    }
    return true;
  }

  public async changePicture(userId: string, picture: string) {
    const token = await this.getToken();
    try {
      await RestClient.update(
        `${this.mangApiEndpoint}/users/${userId}`,
        {
          picture,
        },
        {
          additionalHeaders: {
            authorization: `Bearer ${token}`,
            "cache-control": "no-cache",
          },
        }
      );
      console.log(`changePicture(${userId}) - reset cache...`);
      RedisClient.client.del([getCacheKey("AUTH0_USER", userId)]);
      console.log(`changePicture(${userId}) - reset cache... done`);
    } catch (err) {
      console.log(`changePicture(${userId}) - error ${err}`);
    }
    return true;
  }

  public async getUser(userId: string): Promise<IAuth0User> {
    const cacheKey = getCacheKey("AUTH0_USER", userId);
    const cacheVal = await RedisClient.get(cacheKey);
    if (cacheVal) {
      console.log(`getUser(${userId}) - use cache`);
      const json = JSON.parse(cacheVal);
      return json;
    } else {
      const token = await this.getToken();
      const user: IAuth0User = await request.get(
        `${this.mangApiEndpoint}/users/${userId}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
          json: true,
        }
      );
      console.log(`getUser(${userId}) - updating cache...`);
      await RedisClient.set(
        cacheKey,
        JSON.stringify(user),
        RedisClient.CacheTime.HALF_HOUR
      );
      console.log(`getUser(${userId}) - updating cache...Done!`);
      return user;
    }
  }

  public async listUsers(): Promise<IAuth0User[]> {
    const token = await this.getToken();

    const users: IAuth0User[] = await request.get(
      `${this.mangApiEndpoint}/users`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
        json: true,
      }
    );

    // update cache
    for (const user of users) {
      const userId = user.user_id;
      const cacheKey = getCacheKey("AUTH0_USER", userId);
      console.log(`getUser(${userId}) - updating cache...`);
      await RedisClient.set(
        cacheKey,
        JSON.stringify(user),
        RedisClient.CacheTime.HALF_HOUR
      );
      console.log(`getUser(${userId}) - updating cache...Done!`);
    }

    return users;
  }
}
