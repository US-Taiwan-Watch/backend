import { upsertAlgoliaRecord } from "../../../../services/algolia";

export const syncAlgolia = async ({ doc }) => {
  const billIndexRecord = {
    type: 'ustw-article',
    title: doc.title || '',
    excerpt: doc.excerpt || '',
  }

  await upsertAlgoliaRecord(doc.id, billIndexRecord);
}
