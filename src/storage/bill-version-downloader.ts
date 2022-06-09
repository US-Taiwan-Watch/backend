import { TextVersionCode } from '../../common/models';
import { ContentType, RequestSource } from '../data-sync/sources/request-helper';
import { Container } from './azure-storage-manager';
import { FileDownloader } from './file-downloader';

type BillVersionKeys = {
  billId: string;
  versionCode: TextVersionCode;
  contentType: ContentType;
  publ?: string;
}

export class BillVersionDownloader extends FileDownloader<BillVersionKeys> {
  container: Container = Container.BILL;
  source = RequestSource.CONGRESS_GOV;

  protected getUrl(): string {
    const ext = this.key.contentType === 'txt' ? 'htm' : this.key.contentType;
    const [c, t, n] = this.key.billId.split('-');
    if (this.key.versionCode === 'pl') {
      if (!this.key.publ) {
        throw new Error('Downloading public law needs id. ');
      }
      const key = this.key.publ.replace(c, '');
      return `https://www.congress.gov/${c}/plaws/${key}/PLAW-${this.key.publ}.${ext}`;
    }
    if (this.key.publ) {
      return `https://www.congress.gov/${c}/bills/${t}${n}/BILLS-${c}${t}${n}${this.key.publ}.${ext}`;
    }
    return `https://www.congress.gov/${c}/bills/${t}${n}/BILLS-${c}${t}${n}${this.key.versionCode}.${ext}`;
  }

  protected getPath() {
    return `${this.key.billId.replace(/-/g, '/')}/${this.key.versionCode}.${this.key.contentType}`;
  }

  protected getContentType(): ContentType {
    return this.key.contentType;
  }

  protected process(data: Buffer): Buffer {
    if (this.key.contentType !== 'txt') {
      return data;
    }
    const tagsRemoved = data.toString().replace(/<\/?[^>]+(>|$)/g, '');
    return Buffer.from(tagsRemoved);
  }

  public static getContentTypes(): ContentType[] {
    return ['xml', 'pdf', 'txt'];
  }
}
