import { Field, ObjectType, Query, Resolver } from "type-graphql";
import {
  AzureStorageManager,
  Container,
} from "../storage/azure-storage-manager";

@ObjectType()
class Banner {
  @Field(() => String)
  imageSource!: string;

  @Field(() => String, { nullable: true })
  cta?: string;
}

@Resolver()
export class BannerResolver {
  @Query(() => [Banner])
  public async banners(): Promise<Banner[]> {
    const blobs = await AzureStorageManager.getBlobs(
      Container.PUBLIC_IMAGE,
      "website/banners/",
    );
    return blobs
      .filter(b => b.metadata.order != null)
      .sort((a, b) => parseInt(a.metadata.order) - parseInt(b.metadata.order))
      .map(b => ({ imageSource: b.url, cta: b.metadata.cta }));
  }
}
