import Redis, { RedisOptions, Redis as IORedis } from "ioredis";
import config from "../config";
import { RedisPubSub } from "graphql-redis-subscriptions";

interface RedisClientEvents {
  keyInvalid: (key: string) => void;
}

class RedisClientImpl {
  public readonly CacheTime = {
    ONE_HOUR: 60 * 60,
    HALF_HOUR: 60 * 30,
    ONE_DAY: 60 * 60 * 24,
  };

  public readonly client: IORedis;
  private readonly subscriber: IORedis;
  private readonly listeners: {
    [K in keyof RedisClientEvents]?: RedisClientEvents[K];
  } = {};
  private readonly db = 0;

  public readonly pubsub: RedisPubSub;

  public constructor() {
    console.log(config.redis);

    const redisConf: RedisOptions = {
      host: config.redis.host,
      password: config.redis.password,
      db: this.db,
    };
    this.client = new Redis(redisConf);
    this.subscriber = new Redis(redisConf);
    this.pubsub = new RedisPubSub({
      publisher: this.client,
      subscriber: this.subscriber,
    });
  }

  public async set(
    key: string,
    val: string,
    expiredInSeconds?: number
  ): Promise<any> {
    return await new Promise((resolve, reject) => {
      const cb = (err: Error | null, res: string | null) =>
        err ? reject(err) : resolve(res);
      expiredInSeconds
        ? this.client.setex(key, expiredInSeconds, val, cb)
        : this.client.set(key, val, cb);
    });
  }

  public async get(key: string): Promise<string | undefined> {
    return await new Promise((resolve, reject) => {
      const cb = (err: Error | null, res: string | null) =>
        err ? reject(err) : resolve(res ?? undefined);
      this.client.get(key, cb);
    });
  }

  public on<K extends keyof RedisClientEvents>(
    key: K,
    cb: RedisClientEvents[K]
  ) {
    this.listeners[key] = cb;
  }
}

export const RedisClient = new RedisClientImpl();

if (require.main === module) {
  (async function () {
    const pid: number = parseInt(process.env.CLIENT_ID!);
    console.log(`Client ID = ${pid}`);
    const chName = "MEETING_ROOM_EVENT";
    RedisClient.pubsub.subscribe(chName, (m) =>
      console.log(`[ON-MESSAGE] ${JSON.stringify(m)}`)
    );
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const m: string = await new Promise((resolve, reject) => {
        rl.question("> ", resolve);
      });
      if (m.toLowerCase().startsWith("get")) {
        const [_, key] = m.split(" ");
        const val = await RedisClient.get(key);
        console.log(val);
      } else if (m.toLowerCase().startsWith("set")) {
        const [_, key, val] = m.split(" ");
        await RedisClient.set(key, val);
        console.log(val);
      } else {
        RedisClient.pubsub.publish(chName, m);
      }
    }
  })();
}
