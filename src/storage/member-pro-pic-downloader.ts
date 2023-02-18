import { RequestSource } from "../data-sync/sources/request-helper";
import { PublicJPGDownloader } from "./public-jpg-downloader";

export class MemberProPicDownloader extends PublicJPGDownloader {
  // this.key - bioguide ID string
  constructor(key: string) {
    super(
      `https://bioguide.congress.gov/bioguide/photo/${key[0]}/${key}.jpg`,
      `profile_pictures/${key}`,
      RequestSource.BIO_GUIDE,
    );
  }
}
