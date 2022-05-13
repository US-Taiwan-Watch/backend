import * as mongodbUri from "mongodb-uri";
import * as mongodb from "mongodb";
import { Logger } from "../util/logger";
import * as _ from "lodash";
import { v4 as uuid } from "uuid";
import config from "../config";

type WithId<T> = T & { id?: any; _id?: any };

export type MongoDBProjectQueryType = { [key: string]: 1 };

export abstract class MongoDBTable {
  public static readonly AZURE_MAX_QUERY_ITEMS = 500;

  public abstract get tableName(): string;
  protected abstract get suggestPageSize(): number;
  protected db: mongodb.Db;

  constructor(db: mongodb.Db) {
    this.db = db;
  }

  protected getTable<T>(): mongodb.Collection<T> {
    return this.db.collection<T>(this.tableName);
  }

  protected putItem<T>(obj: T): Promise<T> {
    return new Promise((resolve, reject) => {
      const copyObj: WithId<T> = _.cloneDeep(obj);
      copyObj["_id"] = copyObj["id"] || <string>uuid();
      delete copyObj["id"];
      this.getTable<WithId<T>>()
        .replaceOne({ _id: copyObj._id } as any, copyObj, { upsert: true })
        .then(() => resolve(copyObj))
        .catch((err) => reject(err));
    });
  }

  protected async getAllItems<T>(attrNamesToGet?: (keyof T)[]): Promise<T[]> {
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    return this.getTable<T>()
      .find({}, prjFields)
      .toArray()
      .then((res) => this.addBackIdField(res as T[]));
  }

  protected getItem<T, KeyType = string>(
    keyName: string,
    keyValue: KeyType,
    attrNamesToGet?: (keyof T)[]
  ): Promise<T | null> {
    const query: any = {};
    query[keyName] = keyValue;
    return this.queryItemOne<T>(query, attrNamesToGet);
  }

  protected getItems<T, KeyType = string>(
    keyName: string,
    keyValues: KeyType[],
    attrNamesToGet?: (keyof T)[]
  ): Promise<T[]> {
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    const makeQuery = (chunk: any): Promise<T[]> => {
      const query: any = {};
      query[keyName] = { $in: chunk };
      return this.getTable<T>()
        .find(query, prjFields)
        .toArray()
        .then((res) => this.addBackIdField(res) as T[]);
    };

    const chunks = _.chunk(keyValues, MongoDBTable.AZURE_MAX_QUERY_ITEMS);
    const promises: Promise<T[]>[] = [];
    _.each(chunks, (chunk) => promises.push(makeQuery(chunk)));
    return Promise.all(promises).then((results) => _.flatten(results));
  }

  // CMS
  public getItemByMultiKeys<T, KeyType = any>(
    keyNames: string[],
    keyValues: KeyType[],
    attrNamesToGet?: (keyof T)[]
  ): Promise<T | null> {
    const query: any = {};
    keyNames.map((keyName, index) => {
      query[keyName] = keyValues[index];
    });
    return this.queryItemOne<T>(query, attrNamesToGet);
  }

  public getItemByArrayContains<T, KeyType = string>(
    arrayPropPath: string,
    keyValue: KeyType[]
  ): Promise<T[] | null> {
    const query: any = {};
    query[arrayPropPath] = {
      $in: keyValue,
    };
    return this.queryItems<T>(query);
  }

  public getItemByElementMatch<T, KeyType = string>(
    keyName: string,
    keyValue: KeyType
  ): Promise<T[] | null> {
    const query: any = {};
    query[keyName] = {
      $elemMatch: keyValue,
    };
    return this.queryItems<T>(query);
  }

  public updateItemByCustomQuery<T>(
    find: object,
    query: object
  ): Promise<mongodb.UpdateResult> {
    return this.getTable<T>().updateOne(find, query);
  }

  // ============

  protected queryItemsWorking<T>(
    query: any,
    attrNamesToGet?: (keyof T)[]
  ): Promise<T[]> {
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    return this.getTable<T>()
      .find(query, prjFields)
      .limit(100)
      .toArray()
      .then((res) => this.addBackIdField(res) as T[]);
  }

  public async queryItems<T>(
    query: any,
    attrNamesToGet?: (keyof T)[],
    sort?: any,
    limit?: number,
    throwsError = false
  ): Promise<T[]> {
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    // For some unknown reason, the skip()-and-limit() based pagination
    // did not work with azure cosmosdb. Duplicates were returned at the
    // beginning of some pages. Here we use sorted-id based pagination.
    if (!sort) {
      sort = {};
    }
    sort["_id"] = 1;
    const pageSize = MongoDBTable.AZURE_MAX_QUERY_ITEMS;
    const runQuery = (maxId: string, numItems: number) => {
      const q = query;
      q["_id"] = { $gt: maxId };
      const cursor = this.getTable<WithId<T>>()
        .find(q, prjFields)
        .sort(sort)
        .limit(numItems);
      return cursor
        .toArray()
        .then((res) => this.addBackIdField(res as WithId<T>[]));
    };

    const NUM_RETRIES = 3;
    const RETRY_DELAY = 1000; // ms

    let results: T[] = [];
    let retryCount = 0;
    let maxId = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const numItems = limit && limit < pageSize ? limit : pageSize;
        console.log(
          `[MongoDBTable::queryItems()] getting ` +
          `${numItems} items, maxId=${maxId}`
        );
        const batch = await runQuery(maxId, numItems);
        console.log(`[MongoDBTable::queryItems()] got ${batch.length} items`);
        retryCount = 0;
        if (batch && batch.length > 0) {
          maxId = batch[batch.length - 1]["id"]!;
          results = _.concat(results, batch);
          if (limit) {
            limit -= batch.length;
            if (limit <= 0) {
              return results;
            }
          }
          if (batch.length < numItems) {
            return results;
          }
        } else {
          return results;
        }
      } catch (err) {
        if (retryCount >= NUM_RETRIES) {
          console.log(
            `[MongoDBTable::queryItems()] DB Error after ` +
            `${NUM_RETRIES} retries: ${JSON.stringify(err, null, 2)}`
          );
          if (throwsError) {
            throw err;
          }
          return results;
        }
        ++retryCount;
        console.log(
          `[MongoDBTable::queryItems()] DB Error = ` +
          `${err}.\nRetry ${retryCount} ...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  protected queryItemOne<T>(
    query: any,
    attrNamesToGet?: (keyof T)[]
  ): Promise<T | null> {
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    return this.getTable<T>()
      .findOne(query, prjFields)
      .then((res) => (res ? this.addBackIdField(res as T) : null));
  }

  protected getItemsHavingAttributes<T>(
    keys: (keyof T)[],
    ...attrNamesToGet: (keyof T)[]
  ): Promise<T[]> {
    const query: any = {};
    _.each(keys, (key) => (query[<string>key] = { $exists: true }));
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    return this.getTable<T>()
      .find(query, prjFields)
      .toArray()
      .then((res) => this.addBackIdField(res as T[]));
  }

  protected getItemsNotHavingAttributes<T>(
    keys: (keyof T)[],
    ...attrNamesToGet: (keyof T)[]
  ): Promise<T[]> {
    const query: any = {};
    _.each(keys, (key) => (query[<string>key] = { $exists: false }));
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);
    return this.getTable<T>()
      .find(query, prjFields)
      .toArray()
      .then((res) => this.addBackIdField(res as T[]));
  }

  public async forEachBatch<T>(
    callback: (batch: T[]) => Promise<boolean | void>,
    attrNamesToGet?: (keyof T)[]
  ): Promise<void> {
    const pageSize = Math.min(
      this.suggestPageSize,
      MongoDBTable.AZURE_MAX_QUERY_ITEMS
    );
    let pageId = 0;
    const prjFields = this.composeProjectFields<T>(attrNamesToGet);

    do {
      try {
        const batch = (await this.getTable<T>()
          .find({}, prjFields)
          .skip(pageSize * pageId)
          .limit(pageSize)
          .toArray()) as T[];
        if (!batch || _.isEmpty(batch)) {
          break;
        }
        let goNext: boolean | void = await callback(batch);
        if (typeof goNext === "boolean") {
          goNext = <boolean>goNext;
        } else {
          goNext = true;
        }
        if (!goNext) {
          break;
        }
      } catch (e) {
        console.log(
          `[MongoDBManager::forEachBatch()] Unexpected error = ${JSON.stringify(
            e,
            null,
            2
          )}`
        );
        Promise.resolve();
      }
    } while (++pageId);
    return Promise.resolve();
  }

  public async addItems<T>(newItem: WithId<Partial<T>>[]): Promise<T[]> {
    _.each(newItem, (item) => {
      if (!item["_id"]) {
        item["_id"] = uuid();
      }
    });
    console.log(newItem);
    return this.getTable<WithId<T>>()
      .insertMany(newItem as any[])
      .then(() => newItem as T[]);
  }

  public updateItemByObjectId<T>(
    objectId: string,
    updateItem: Partial<T>
  ): Promise<mongodb.UpdateResult> {
    const query = { $set: updateItem };
    return this.getTable<T>().updateOne({ _id: objectId } as WithId<T>, query);
  }

  public deleteItems(idx: string[]): Promise<mongodb.DeleteResult> {
    return this.getTable().deleteMany({ _id: { $in: idx } });
  }

  public deleteAttributesFromItem<T, KeyType = string>(
    objectId: KeyType,
    attrName: (keyof T)[]
  ): Promise<mongodb.UpdateResult> {
    const unset = _.transform<keyof T, { [key in keyof T]?: "" }>(
      attrName,
      (res, val, key) => (res[val] = ""),
      {}
    );
    const query: any = { $unset: unset };
    return this.getTable<T>().updateOne({ _id: objectId }, query);
  }

  protected composeProjectFields<T>(
    attrNamesToGet?: (keyof T)[]
  ): MongoDBProjectQueryType {
    const r: MongoDBProjectQueryType = {};
    if (attrNamesToGet) {
      _.each(attrNamesToGet, (key) => (r[<string>key] = 1));
    }
    if (_.includes(<string[]>attrNamesToGet, "id")) {
      r["_id"] = 1;
    }
    return r;
  }

  // '_id' to 'id'
  protected addBackIdField<T>(items: T): T {
    if (!items) {
      return items;
    }

    const convert = (b: any) => {
      if (b["_id"]) {
        b["id"] = b["_id"];
        delete b["_id"];
      }
      return b;
    };

    return _.isArray(items) ? _.each(items, convert) : convert(items);
  }

  protected composeQueryOfSingleOrMultipleValues<T>(
    key: string,
    val: T | T[]
  ): any {
    const query: any = {};

    if (!val) {
      return query;
    }

    if (_.isArray(val)) {
      if (val.length === 1 && val[0]) {
        query[key] = val[0];
      } else if (val.length > 1) {
        query[key] = { $in: val };
      }
    } else {
      query[key] = val;
    }
    return query;
  }
}

export class MongoDBManager {
  private static _instance: MongoDBManager;
  private tables: { [name: string]: MongoDBTable } = {};
  private logger = new Logger("MongoDBManager");
  private db: mongodb.Db | undefined;

  private constructor() {
    this.db = undefined;
  }

  public static async instance(
    ...TblClasses: { new(db: mongodb.Db): MongoDBTable }[]
  ): Promise<MongoDBManager> {
    if (!MongoDBManager._instance) {
      MongoDBManager._instance = new MongoDBManager();
    }
    await MongoDBManager._instance.init();
    const db = MongoDBManager._instance.db!;
    if (TblClasses) {
      const tables = [
        ..._.values(MongoDBManager._instance.tables),
        ..._.map(TblClasses, (Clz) => new Clz(db)),
      ];
      MongoDBManager._instance.tables = _.keyBy(tables, (tbl) => tbl.tableName);
    }
    return MongoDBManager._instance;
  }

  public dropDatabase(): Promise<boolean> {
    return this.db ? this.db.dropDatabase() : Promise.resolve(true);
  }

  public insertObjects<
    T = any,
    R extends Required<WithId<T>> = Required<WithId<T>>
  >(tableName: string, objs: T[]): Promise<mongodb.InsertManyResult<R>> {
    const fLog = this.logger.in("insertObjects");
    return this.getCollection(tableName).then((collection) => {
      fLog.log(`[INSERT] TABLE = ${tableName}, OBJS = ${objs.length}`);
      return new Promise<mongodb.InsertManyResult<R>>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          try {
            const res = await collection.insertMany(objs);
            resolve(res);
          } catch (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        }
      );
    });
  }

  public getTable<T extends MongoDBTable>(TblClass: {
    new(db: mongodb.Db): T;
  }): T {
    const tbl = _.find(this.tables, (t) => t instanceof TblClass);
    console.log(`tbl.tableName = ${tbl && tbl.tableName}`);
    return <T>(tbl as MongoDBTable);
  }

  public getCollection(name: string): Promise<mongodb.Collection<any>> {
    return this.db!.collections().then((collections) => {
      const collection = _.find(collections, (x) => x.collectionName === name);
      if (collection) {
        return collection;
      } else {
        return new Promise<mongodb.Collection<any>>((resolve, reject) => {
          this.db!.createCollection(name, (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res!);
            }
          });
        });
      }
    });
  }

  private init(): Promise<void> {
    const fLog = this.logger.in("init");
    if (this.db) {
      return Promise.resolve();
    } else {
      const dbUrl = MongoDBManager.getUrl();
      fLog.log(`DB_URL = ${dbUrl}`);
      return mongodb.MongoClient.connect(dbUrl)
        .then((client) => {
          const db = client.db(config.db_config.db);
          fLog.log(`DB connected`);
          this.db = db;
        })
        .catch((err) => {
          fLog.log(`DB connect error = ${JSON.stringify(err, null, 2)}`);
          throw err;
        });
    }
  }

  public static getUrl(): string {
    const urlComponents = MongoDBManager.getUriComponents();
    const ret = {
      scheme: "mongodb",
      username: urlComponents["username"],
      password: urlComponents["password"],
      hosts: [
        {
          host: urlComponents["host"],
          port: urlComponents["port"],
        },
      ],
      options: {
        authSource: "admin",
      },
    };
    return mongodbUri.format(ret);
  }

  public static getUriComponents(): {
    username: string;
    password: string;
    host: string;
    port: number;
  } {
    return config.db_config.remote;
  }
}

export function MongoDBTableBase(tableName: string, suggestPageSize?: number) {
  abstract class X extends MongoDBTable {
    public readonly tableName = tableName;
    protected readonly suggestPageSize =
      suggestPageSize ?? MongoDBTable.AZURE_MAX_QUERY_ITEMS;

    public constructor(db: mongodb.Db) {
      super(db);
    }
  }
  return X;
}

export function TableProvider<TableType extends MongoDBTable>(TableClass: {
  new(db: mongodb.Db): TableType;
}) {
  class X {
    private static _db: MongoDBManager;
    protected async table(): Promise<TableType> {
      X._db = await MongoDBManager.instance(TableClass);
      return X._db.getTable(TableClass);
    }
  }
  return X;
}
