import {
  ContentType,
  RequestHelper,
  RequestSource,
} from "../data-sync/sources/request-helper";
import { Logger } from "../util/logger";
import { AzureStorageManager, Container } from "./azure-storage-manager";

const logger = new Logger("FileDownloader");

export abstract class FileDownloader<T> {
  abstract container: Container;

  constructor(protected key: T, private source: RequestSource) {}

  protected abstract getUrl(): string;
  protected abstract getPath(): string;
  protected abstract getContentType(): ContentType;
  // Override if needed
  protected process(data: Buffer): Buffer {
    return data;
  }

  public async downloadAndUpload(): Promise<boolean> {
    try {
      if (await this.exists()) {
        logger.log(`File ${this.getPath()} exists. Did not download.`);
        return true;
      }
      // logger.log(`Starts downloading and update file ${this.getPath()}`);
      const file = await this.download();
      await this.upload(this.process(file));
    } catch (e) {
      logger.log(`Failed to download and update file ${this.getPath()}: ${e}`);
      return false;
    }
    return true;
  }

  public async download(): Promise<Buffer> {
    return await RequestHelper.from(this.source).getFile(
      this.getUrl(),
      this.getContentType(),
    );
  }

  public async exists(): Promise<boolean> {
    return await AzureStorageManager.checkBlobExists(
      this.container,
      this.getPath(),
    );
  }

  public getPublicUrl() {
    return AzureStorageManager.getBlobUrl(this.container, this.getPath());
  }

  public async upload(data: Buffer) {
    return await AzureStorageManager.uploadBlob(
      this.container,
      this.getPath(),
      this.getContentType(),
      data,
    );
  }
}
