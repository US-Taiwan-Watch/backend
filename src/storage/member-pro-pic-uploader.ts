import { AzureStorageManager, Container } from './azure-storage-manager';

export abstract class MemberProPicUploader {
  private static getPath(bioguideID: string) {
    return `profile_pictures/${bioguideID}.jpg`;
  }

  public static async exists(bioguideID: string): Promise<boolean> {
    return await AzureStorageManager.checkBlobExists(
      Container.PUBLIC_IMAGE,
      this.getPath(bioguideID)
    );
  }

  public static async upload(bioguideID: string, data: Buffer) {
    return await AzureStorageManager.uploadBlob(
      Container.PUBLIC_IMAGE,
      this.getPath(bioguideID),
      'jpg',
      data);
  }

}