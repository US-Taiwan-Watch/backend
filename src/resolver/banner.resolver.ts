import { Query, Resolver } from "type-graphql";
import {
  AzureStorageManager,
  Container,
} from "../storage/azure-storage-manager";

@Resolver()
export class BannerResolver {
  @Query(() => [String])
  public async banners(): Promise<string[]> {
    return AzureStorageManager.getBlobs(
      Container.PUBLIC_IMAGE,
      "website/banners/",
      "order",
    );
  }
}
