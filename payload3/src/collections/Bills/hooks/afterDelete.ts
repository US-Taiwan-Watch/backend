import { deleteAzureSearchRecord } from "../../../services/azureSearch";
import { deleteAlgoliaRecord } from "../../../services/algolia";

export const deleteAlgolia = async ({ doc }) => {
  await deleteAlgoliaRecord(doc.id);
}


export const deleteAzureSearch = async ({ doc }) => {
  await deleteAzureSearchRecord(doc.id);
}
