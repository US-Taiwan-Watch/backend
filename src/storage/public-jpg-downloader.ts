import {
  ContentType,
  RequestSource,
} from "../data-sync/sources/request-helper";
import { Container } from "./azure-storage-manager";
import { FileDownloader } from "./file-downloader";

export class PublicJPGDownloader extends FileDownloader<{
  url: string;
  path: string;
}> {
  container = Container.PUBLIC_IMAGE;

  constructor(url: string, path: string, source: RequestSource) {
    super({ url, path }, source);
  }

  protected getUrl(): string {
    return this.key.url;
  }

  protected getPath() {
    return `${this.key.path}.jpg`;
  }

  protected getContentType(): ContentType {
    return "jpg";
  }
}
