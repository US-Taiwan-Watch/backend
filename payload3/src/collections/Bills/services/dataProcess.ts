import { STATE_MAP } from "../../../collections/Peoples/services/dataProcess";
import { fetchUstwPeopleIds } from "./dataFetch";
import { createPeopleBatch } from "../../Peoples/services/peopleCreate";

export const processTracker = (trackers) => {
  if (!Array.isArray(trackers) || trackers.length === 0 || trackers.length > 100 ||
      trackers.some(t => typeof t?.stepName !== 'string' || !t.stepName.trim() || t.stepName.length > 200 || typeof t.selected !== 'boolean') ||
      trackers.filter(t => t.selected).length !== 1) {
    throw Object.assign(new Error('Bill status lookup unavailable; existing bill must remain unchanged'), { statusCode: 502, code: 'BILL_TRACKER_UNAVAILABLE' });
  }
  const steps = trackers.map(t => toCamel(t.stepName));
  if (steps.some(s => !s) || new Set(steps).size !== steps.length) {
    throw Object.assign(new Error('Bill status lookup unavailable; existing bill must remain unchanged'), { statusCode: 502, code: 'BILL_TRACKER_UNAVAILABLE' });
  }
  const currentIdx = trackers.findIndex(t => t.selected);
  return { currentStep: steps[currentIdx], passedSteps: steps.slice(0, currentIdx + 1), futureSteps: steps.slice(currentIdx + 1) };
};

export const processActions = (actions) => {
  if (!actions) return [];

  return actions.map(a => {
    let chamber = null;

    if (a.sourceSystem && a.sourceSystem.name) {
      if (a.sourceSystem.name.includes("Senate")) chamber = "senate";
      else if (a.sourceSystem.name.includes("House")) chamber = "house";
    }

    return {
      actionAt: {
        datetime: `${a.actionDate}T00:00:00.000Z`,
        precision: ["year", "month", "day"]
      },
      chamber,
      description: a.text
    };
  });
};

export const processPeople = async (sponsorsRaw, cosponsorsRaw, baseUrl, payload) => {
  // ---------- 1) Collect unique bioguideIds ----------
  const bioguideIds = new Set();

  if (sponsorsRaw) {
    sponsorsRaw.forEach((s) => {
      if (s.bioguideId) bioguideIds.add(s.bioguideId);
    });
  }

  if (cosponsorsRaw) {
    cosponsorsRaw.forEach((c) => {
      if (c.bioguideId) bioguideIds.add(c.bioguideId);
    });
  }

  const allBioguideIds = Array.from(bioguideIds);
  if (allBioguideIds.length === 0) {
    return { sponsor: null, cosponsors: [] };
  }

  // ---------- 2) Fetch existing mapping ----------
  let idMap = await fetchUstwPeopleIds(allBioguideIds, baseUrl);

  // ---------- 3) Find missing IDs ----------
  const missingBioguideIds = new Set();

  if (sponsorsRaw?.length) {
    const s = sponsorsRaw[0];
    if (s?.bioguideId && !idMap[s.bioguideId]) missingBioguideIds.add(s.bioguideId);
  }

  if (cosponsorsRaw?.length) {
    cosponsorsRaw.forEach((c) => {
      if (c?.bioguideId && !idMap[c.bioguideId]) missingBioguideIds.add(c.bioguideId);
    });
  }

  // ---------- 4) Batch create missing people (10 at a time), then refetch mapping ----------
  if (missingBioguideIds.size > 0) {
    const missingList = Array.from(missingBioguideIds);
    console.log("Missing CMS IDs for Bioguide IDs, creating:", missingList);

    await createPeopleBatch(baseUrl, payload, missingList);

    // refresh mapping after creation
    idMap = await fetchUstwPeopleIds(allBioguideIds, baseUrl);
  }

  // ---------- 5) Build final payload ----------
  let sponsor = null;
  if (sponsorsRaw?.length) {
    const s = sponsorsRaw[0];
    const cmsId = s?.bioguideId ? idMap[s.bioguideId] : null;
    if (cmsId) {
      sponsor = {
        people: cmsId,
        party: mapParty(s.party),
      };
    } else if (s?.bioguideId) {
      // still missing after create -> throw (safer) or keep null
      throw new Error(`Still missing CMS ID for sponsor bioguideId: ${s.bioguideId}`);
    }
  }

  const cosponsors = [];
  if (cosponsorsRaw?.length) {
    cosponsorsRaw.forEach((c) => {
      const cmsId = c?.bioguideId ? idMap[c.bioguideId] : null;
      if (cmsId) {
        cosponsors.push({
          people: cmsId,
          constituency: mapState(c.state),
          party: mapParty(c.party),
          cosponsoredAt: {
            datetime: c.sponsorshipDate ? `${c.sponsorshipDate}T00:00:00.000Z` : null,
            precision: ["year", "month", "day"],
          },
        });
      } else if (c?.bioguideId) {
        // still missing after create -> throw (safer) or skip
        throw new Error(`Still missing CMS ID for cosponsor bioguideId: ${c.bioguideId}`);
      }
    });
  }

  return { sponsor, cosponsors };
};

const toCamel = (s) => {
  const parts = s.split(/[^0-9A-Za-z]+/);
  const filteredParts = parts.filter(p => p); // drop empties
  if (filteredParts.length === 0) return '';

  const [first, ...rest] = filteredParts;
  return first.toLowerCase() + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
};

const mapParty = (party) => {
  if (!party) return 'independent';
  const p = party.toLowerCase();
  if (p === 'r' || p === 'republican') return 'republican';
  if (p === 'd' || p === 'democrat' || p === 'democratic') return 'democratic';
  return 'independent';
};

const mapState = (stateAbbr) => {
  if (!stateAbbr) return null;
  const upper = stateAbbr.toUpperCase();
  return STATE_MAP[upper] ?? null;
};
