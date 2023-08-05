import { BlobServiceClient } from "@azure/storage-blob";
import config from "../config";
import { ContentType } from "../data-sync/sources/request-helper";
import { STATIC_URL } from "../../common/constants/general-constants";

export enum Container {
  TEST = "test",
  PUBLIC_IMAGE = "public-image",
  BILL = "bill",
}

export abstract class AzureStorageManager {
  static blobServiceClient = BlobServiceClient.fromConnectionString(
    config.storage.connection_string,
  );

  public static async getCounts(
    container: Container,
    prefix: string,
  ): Promise<number> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const it = containerClient.listBlobsFlat({ prefix });
    let item = await it.next();
    let count = 0;
    while (!item.done) {
      count++;
      item = await it.next();
    }
    return count;
  }

  public static async getBlobs(
    container: Container,
    prefix: string,
    sortBy?: string,
  ): Promise<string[]> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const it = containerClient.listBlobsFlat({
      prefix,
      includeMetadata: true,
    });
    let item = await it.next();
    let results = [];
    while (!item.done) {
      results.push(item.value);
      item = await it.next();
    }
    if (sortBy) {
      results.sort((a, b) =>
        a.metadata && b.metadata
          ? parseInt(a.metadata[sortBy]) - parseInt(b.metadata[sortBy])
          : 0,
      );
    }
    return results.map(r => this.getBlobUrl(container, r.name));
  }

  public static async checkBlobExists(
    container: Container,
    blobName: string,
  ): Promise<boolean> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  }

  public static async uploadBlob(
    container: Container,
    blobName: string,
    contentType: ContentType,
    data: Buffer,
  ) {
    const mimeType = AzureStorageManager.getMimeType(contentType);
    if (contentType === "pdf" || contentType === "jpg") {
      return this.uploadBlobData(container, blobName, mimeType, data);
    }

    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const uploadBlobResponse = await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    if (uploadBlobResponse.errorCode) {
      throw new Error(uploadBlobResponse.errorCode);
    }
    return this.getBlobUrl(container, blobName);
  }

  public static async uploadBlobData(
    container: Container,
    blobName: string,
    mimeType: string,
    data: Buffer,
  ) {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const uploadBlobResponse = await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    if (uploadBlobResponse.errorCode) {
      throw new Error(uploadBlobResponse.errorCode);
    }
    return this.getBlobUrl(container, blobName);
  }

  public static getBlobUrl(container: Container, blobName: string) {
    return `${STATIC_URL}/${container}/${blobName}`;
  }

  private static getMimeType(contentType: ContentType): string {
    switch (contentType) {
      case "xml":
        return "text/xml";
      case "txt":
        return "text/plain";
      case "pdf":
        return "application/pdf";
      case "jpg":
        return "image/jpeg";
    }
  }
}
