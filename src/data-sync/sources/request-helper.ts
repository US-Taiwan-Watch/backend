import _ from "lodash";
import { Logger } from "../../util/logger";
import request from "request";

const logger = new Logger('RequestHelper');

export type ContentType = 'xml' | 'txt' | 'pdf' | 'jpg';

export enum RequestSource {
  GOV_INFO = 'gov_info',
  PROPUBLICA = 'propublica',
  CONGRESS_GOV = 'congress.gov',
}

const requestCoolDown = {
  [RequestSource.CONGRESS_GOV]: 500,
  [RequestSource.GOV_INFO]: 500,
  [RequestSource.PROPUBLICA]: 500,
}

interface RequestTask {
  options: request.OptionsWithUrl;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class RequestHelper {
  private static requestQueueMap: { [key: string]: RequestTask[] } = {};
  private static queueRunning: { [key: string]: boolean } = {};

  private constructor(private source: RequestSource) { }

  public static from(source: RequestSource): RequestHelper {
    return new this(source);
  }

  public getFile(
    url: string,
    contentType: ContentType,
    options?: request.CoreOptions,
  ): Promise<Buffer> {
    if (contentType === 'pdf' || contentType === 'jpg') {
      options = { ...options, encoding: null }
    }
    return this.get(url, options).then(v => v as Buffer);
  }

  public get(url: string, options?: request.CoreOptions): Promise<any> {
    const promise = this.pushTask({ url, ...options });
    this.startScheduling();
    return promise;
  }

  // Should only use for debugging purpose. Will not queue up. Update to public to test.
  private static get(url: string, options?: request.CoreOptions): Promise<any> {
    return this.getImpl({ url, ...options });
  }

  private static getImpl(options: request.OptionsWithUrl): Promise<any> {
    return new Promise((resolve, reject) => {
      request.get(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          // TODO: log
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
  }

  private pushTask(options: request.OptionsWithUrl): Promise<any> {
    logger.in('pushTask').log(`Queue ${this.source}: ${options.url} pushed`);
    return new Promise((resolve, reject) => {
      if (!(this.source in RequestHelper.requestQueueMap)) {
        RequestHelper.requestQueueMap[this.source] = [];
      }
      RequestHelper.requestQueueMap[this.source].push({ options, resolve, reject });
    });
  }

  private startScheduling() {
    if (RequestHelper.queueRunning[this.source]) {
      logger.in('startScheduling').log(`Queue ${this.source} is already running.`);
      return;
    }
    logger.in('startScheduling').log(`Queue ${this.source} starts running.`);
    RequestHelper.queueRunning[this.source] = true;
    this.runFirstTask();
  }

  private runFirstTask() {
    const _logger = logger.in('runFirstTask');
    const task = RequestHelper.requestQueueMap[this.source].shift();
    if (task === undefined) {
      _logger.log(`Queue ${this.source} is empty. Stopped running.`);
      RequestHelper.queueRunning[this.source] = false;
      return;
    }
    _logger.log(`Queue ${this.source} starts fetching ${task.options.url}`);
    RequestHelper.getImpl(task.options)
      .then(value => task.resolve(value))
      .catch(reason => task.reject(reason))
      .finally(() => {
        _logger.log(`Queue ${this.source} finished fetching ${task.options.url}`);
        this.scheduleNextTask();
      });
  }

  private scheduleNextTask() {
    // logger.in('scheduleNextTask').log(`Queue ${source} scheduled!`);
    setTimeout(() => {
      this.runFirstTask();
    }, requestCoolDown[this.source]);
  }

}