import { v4 as uuid } from "uuid";
import { inspect } from "util";

export class Logger {
  protected _id: string;
  protected _methodName: string | undefined;


  constructor(protected _className: string = "", private debugMode = false) {
    this._id = uuid();
  }

  public in(methodName: string, debugMode = false): Logger {
    const o = new Logger(this._className, debugMode);
    o._id = this._id;
    o._methodName = methodName;
    return o;
  }

  public log(msg: any, debug = false) {
    const prefix =
      (this._methodName
        ? `${this._className}.${this._methodName}`
        : `${this._className}`) + `:${this._id}`;
    Logger.log(msg, prefix);
  }

  public debug(msg: any) {
    if (this.debugMode) {
      this.log(msg);
    }
  }

  public static log(msg: any, prefix?: string,) {
    if (typeof msg !== "string") {
      const colors = process.env.IS_LOCAL ? true : false;
      msg = inspect(msg, { depth: null, colors: colors });
    }
    const date = new Date();
    const y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const dateString = `[${y}-${M}-${d} ${h}:${m}:${s}]`;
    if (prefix !== undefined) {
      console.log(`${dateString}[${prefix}] ${msg}`);
    } else {
      console.log(`${dateString} ${msg}`);
    }
  }
}
