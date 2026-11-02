import { deleteAlgoliaRecord } from "../../../../services/algolia";

export const deleteAlgolia = async ({ doc }) => {
  await deleteAlgoliaRecord(doc.id);
}
