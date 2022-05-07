import { BlobServiceClient } from '@azure/storage-blob';
import { memoize } from 'lodash';
import config from "../config";
import { ContentType } from '../data-sync/sources/request-helper';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  config.storage.connection_string
);

export enum Container {
  TEST = 'test',
}

export abstract class AzureStorageManager {
  // public static async createContainerIfNotExist(containerName: string): Promise<boolean> {
  //   const containerClient = blobServiceClient.getContainerClient(containerName);
  //   if (await containerClient.exists()) {
  //     return false;
  //   }
  //   const createContainerResponse = await containerClient.create();
  //   return true;
  // }

  public static async uploadBlob(container: Container, blobName: string, contentType: ContentType, data: Buffer) {
    const containerClient = blobServiceClient.getContainerClient(container);

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const uploadBlobResponse = await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: { blobContentType: this.getMimeType(contentType) }
    });
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