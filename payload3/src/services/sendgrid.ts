export type DigestPodcast = {
  id: string;
  title: string;
  url: string;
  description: string;
  createdAt: string;
};

export type DigestArticle = {
  id: string;
  title: string;
  url: string;
  description: string;
  createdAt: string;
};

export type DigestBillUpdate = {
  id: string;
  title: string;
  url: string;
  description: string;
  updatedAt: string;
};

export type DigestBillRelease = {
  id: string;
  title: string;
  url: string;
  description: string;
  createdAt: string;
};

export type DigestPeopleUpdate = {
  id: string;
  name: string;
  url: string;
  description: string;
  updatedAt: string;
};

export type WeeklyDigestVariables = {
  podcastRelease: DigestPodcast[];
  ustwArticleRelease: DigestArticle[];
  ketagalanArticleRelease: DigestArticle[];
  billRelease: DigestBillRelease[];
  subscribedBillUpdate: DigestBillUpdate[];
  subscribedPeopleUpdate: DigestPeopleUpdate[];
};

interface SendNotificationOptions {
  to: string;
  name: string;
  templateId: string;
  variables: WeeklyDigestVariables;
}

export async function sendNotificationEmail(_args: any) { throw Error('Newsletters are disabled for this release.'); }
