import { fetchJson } from '../../../services/fetchJson';

const DATA_URLS = {
  legislatorsHistorical: 'https://unitedstates.github.io/congress-legislators/legislators-historical.json',
  legislatorsCurrent: 'https://unitedstates.github.io/congress-legislators/legislators-current.json',
  socialMedia: 'https://unitedstates.github.io/congress-legislators/legislators-social-media.json',
  committeesCurrent: 'https://unitedstates.github.io/congress-legislators/committees-current.json',
  committeesHistorical: 'https://unitedstates.github.io/congress-legislators/committees-historical.json',
  committeeMembership: 'https://unitedstates.github.io/congress-legislators/committee-membership-current.json',
  categories: '/api/categories-people'
};

const CURRENT_CONGRESS_COMPANIES = [
  "United States House of Representatives",
  "United States Senate",
] as const;


export const fetchAllData = async (baseUrl) => {
  const [
    legislatorsHistorical,
    legislatorsCurrent,
    legislatorsSocialMedia,
    committeeMembershipCurrent,
    committeesCurrent,
    committeesHistorical,
    categoriesData
  ] = await Promise.all([
    fetchJson(DATA_URLS.legislatorsHistorical),
    fetchJson(DATA_URLS.legislatorsCurrent),
    fetchJson(DATA_URLS.socialMedia),
    fetchJson(DATA_URLS.committeeMembership),
    fetchJson(DATA_URLS.committeesCurrent),
    fetchJson(DATA_URLS.committeesHistorical),
    fetchJson(baseUrl + DATA_URLS.categories)
  ]);

  if (![legislatorsHistorical, legislatorsCurrent, legislatorsSocialMedia, committeesCurrent, committeesHistorical].every(Array.isArray) ||
      !committeeMembershipCurrent || typeof committeeMembershipCurrent !== 'object' || Array.isArray(committeeMembershipCurrent) ||
      !categoriesData || typeof categoriesData !== 'object' || !Array.isArray((categoriesData as any).docs)) {
    throw new Error('Invalid legislative catalog response; update stopped');
  }
  return {
    allLegislators: [...(legislatorsHistorical as any[]), ...(legislatorsCurrent as any[])],
    legislatorsSocialMedia,
    committeeMembershipCurrent,
    allCommittees: [...(committeesCurrent as any[]), ...(committeesHistorical as any[])],
    categoriesData
  };
};

export const fetchCurrentBioguideIds = async (): Promise<string[]> => {
  const data = await fetchJson(DATA_URLS.legislatorsCurrent);
  if (!Array.isArray(data) || !data.length || !data.every(x => /^[A-Z][0-9]{6}$/.test(x?.id?.bioguide ?? ''))) {
    throw new Error('Invalid current legislator catalog; update stopped');
  }
  return Array.from(new Set<string>(data.map(x => x.id.bioguide))).sort();
};

export const fetchUstwCurrentBioguideIds = async (db): Promise<string[]> => {
  try {
    const query = {
      experiences: {
        $elemMatch: {
          isCurrent: true,
          company: { $in: [...CURRENT_CONGRESS_COMPANIES] },
        },
      },
      "congressionalData.bioGuideId": { $exists: true, $type: "string", $ne: "" },
    };
    const ids = await db.collections["peoples"].distinct("congressionalData.bioGuideId", query);
    return ids.filter((v: any): v is string => typeof v === "string" && v.length > 0).sort();
  } catch {
    throw new Error('Current legislator selection failed; update stopped');
  }
};

export const fetchUstwAllBioguideIds = async (db): Promise<string[]> => {
  try {
    const query = {
      "congressionalData.bioGuideId": { $exists: true, $type: "string", $ne: "" },
    };
    const ids = await db.collections["peoples"].distinct("congressionalData.bioGuideId", query);
    return ids.filter((v: any): v is string => typeof v === "string" && v.length > 0).sort();
  } catch {
    throw new Error('Existing legislator selection failed; update stopped');
  }
};
