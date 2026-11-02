import { upsertAzureSearchRecord } from "../../../services/azureSearch";
import { upsertAlgoliaRecord } from "../../../services/algolia";

export const syncAlgolia = async ({ doc }) => {
  const billIndexRecord = {
    type: 'bill',
    i18n: {
      en: {
        title: doc.i18n?.en?.title || '',
        summary: doc.i18n?.en?.summary || '',
      },
      zh: {
        title: doc.i18n?.zh?.title || '',
        summary: doc.i18n?.zh?.summary || '',
      },
    }
  }

  await upsertAlgoliaRecord(doc.id, billIndexRecord);
}

export const syncAzureSearch = async ({ doc }) => {
  const billIndexRecord = {
    title: doc.i18n?.en?.title || '',
    summary: doc.i18n?.en?.summary || '',
  }

  await upsertAzureSearchRecord(doc.id, billIndexRecord);
}
