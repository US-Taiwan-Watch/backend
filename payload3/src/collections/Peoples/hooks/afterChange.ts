import { upsertAlgoliaRecord } from "../../../services/algolia";

export const syncAlgolia = async ({ doc }) => {
  const peopleIndexRecord = {
    type: 'people',
    i18n: {
      en: {
        displayName: doc.i18n?.en?.displayName || '',
        bio: doc.i18n?.en?.bio || '',
      },
      zh: {
        displayName: doc.i18n?.zh?.displayName || '',
        bio: doc.i18n?.zh?.bio || '',
      },
    }
  }

  await upsertAlgoliaRecord(doc.id, peopleIndexRecord);
}
