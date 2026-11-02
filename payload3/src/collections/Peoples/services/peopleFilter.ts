import {
  fetchCurrentBioguideIds,
  fetchUstwAllBioguideIds,
  fetchUstwCurrentBioguideIds
} from "./dataFetch";

export const getInsertBioguideIds = async (db) => {
  const currentBioguideIds = await fetchCurrentBioguideIds();
  const ustwAllBioguideIds = await fetchUstwAllBioguideIds(db);

  const ustwSet = new Set(ustwAllBioguideIds);
  const newBioguideIds = Array.from(
    new Set(currentBioguideIds.filter((id) => !ustwSet.has(id)))
  ).sort();
  return newBioguideIds;
}

export const getUpdateBioguideIds = async (db) => {
  const existingBioguideIds = await fetchUstwCurrentBioguideIds(db);
  return existingBioguideIds;
}
