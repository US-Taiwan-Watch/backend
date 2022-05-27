import { ContentType, RequestSource } from '../data-sync/sources/request-helper';
import { Container } from './azure-storage-manager';
import { FileDownloader } from './file-downloader';

export class MemberProPicDownloader extends FileDownloader<string> {
  container = Container.PUBLIC_IMAGE;
  source = RequestSource.BIO_GUIDE;

  protected getUrl(): string {
    return `https://bioguide.congress.gov/bioguide/photo/${this.key[0]}/${this.key}.jpg`;
  }

  protected getPath() {
    return `profile_pictures/${this.key}.jpg`;
  }

  protected getContentType(): ContentType {
    return 'jpg';
  }

}