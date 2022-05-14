import { BlobServiceClient } from '@azure/storage-blob';
import { memoize } from 'lodash';
import config from "../config";
import { ContentType } from '../data-sync/sources/request-helper';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  config.storage.connection_string
);

export enum Container {
  TEST = 'test',
  PUBLIC_IMAGE = 'public-image',
  BILL = 'bill',
}

export abstract class AzureStorageManager {
  public static async checkBlobExists(container: Container, blobName: string): Promise<boolean> {
    const containerClient = blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  }

  public static async uploadBlob(container: Container, blobName: string, contentType: ContentType, data: Buffer) {
    const containerClient = blobServiceClient.getContainerClient(container);

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    let uploadBlobResponse;
    const options = {
      blobHTTPHeaders: { blobContentType: this.getMimeType(contentType) }
    };

    if (contentType === 'xml' || contentType === 'txt') {
      uploadBlobResponse = await blockBlobClient.upload(data, data.length, options);
    }
    else {
      uploadBlobResponse = await blockBlobClient.uploadData(data, options);
    }
    return uploadBlobResponse.lastModified;
  }

  private static getMimeType(contentType: ContentType): string {
    switch (contentType) {
      case 'xml':
        return 'text/xml';
      case 'txt':
        return 'text/plain';
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
        return 'image/jpeg';
    }
  }

}