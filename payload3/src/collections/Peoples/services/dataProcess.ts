const TITLE_MAP = {
  "Chair": "chair",
  "Chairman": "chair",
  "Chairwoman": "chair",
  "Cochairman": "cochair",
  "Cochairwoman": "cochair",
  "Vice Chair": "viceChair",
  "Vice Chairman": "viceChair",
  "Vice Chairwoman": "viceChair",
  "Ranking Member": "ranking",
  "Ex Officio": "exOfficio"
};

export const STATE_MAP = {
  "AL": "alabama", "AK": "alaska", "AZ": "arizona", "AR": "arkansas", "CA": "california",
  "CO": "colorado", "CT": "connecticut", "DE": "delaware", "FL": "florida", "GA": "georgia",
  "HI": "hawaii", "ID": "idaho", "IL": "illinois", "IN": "indiana", "IA": "iowa",
  "KS": "kansas", "KY": "kentucky", "LA": "louisiana", "ME": "maine", "MD": "maryland",
  "MA": "massachusetts", "MI": "michigan", "MN": "minnesota", "MS": "mississippi", "MO": "missouri",
  "MT": "montana", "NE": "nebraska", "NV": "nevada", "NH": "newHampshire", "NJ": "newJersey",
  "NM": "newMexico", "NY": "newYork", "NC": "northCarolina", "ND": "northDakota", "OH": "ohio",
  "OK": "oklahoma", "OR": "oregon", "PA": "pennsylvania", "RI": "rhodeIsland", "SC": "southCarolina",
  "SD": "southDakota", "TN": "tennessee", "TX": "texas", "UT": "utah", "VT": "vermont",
  "VA": "virginia", "WA": "washington", "WV": "westVirginia", "WI": "wisconsin", "WY": "wyoming",
  "DC": "districtOfColumbia", "PR": "puertoRico", "GU": "guam", "VI": "virginIslands", "AS": "americanSamoa", "MP": "northernMarianaIslands"
};

export const processSocialMedia = (legislator, socialMediaData) => {
  const record = socialMediaData.find(s => s.id && s.id.bioguide === legislator.id.bioguide);
  const links = [];

  if (record && record.social) {
    const s = record.social;
    if (s.twitter) links.push({ type: 'twitter', title: `@${s.twitter}`, link: `https://x.com/${s.twitter}` });
    if (s.facebook) links.push({ type: 'facebook', title: `@${s.facebook}`, link: `https://facebook.com/${s.facebook}` });
    if (s.instagram) links.push({ type: 'instagram', title: `@${s.instagram}`, link: `https://instagram.com/${s.instagram}` });

    if (s.youtube_id) {
      links.push({
        type: 'youtube',
        title: s.youtube ? `@${s.youtube}` : `@${legislator.name.first}${legislator.name.last}`,
        link: `https://youtube.com/channel/${s.youtube_id}`
      });
    } else if (s.youtube) {
      links.push({ type: 'youtube', title: `@${s.youtube}`, link: `https://youtube.com/${s.youtube}` });
    }
  }
  return links;
};

export const processCommittees = (bioguideId, membershipData, allCommittees) => {
  const myMemberships = [];
  for (const [committeeId, members] of Object.entries(membershipData)) {
    const memberEntry = (members as any).find(m => m.bioguide === bioguideId);
    if (memberEntry) {
      const mappedTitle = memberEntry.title ? (TITLE_MAP[memberEntry.title] || memberEntry.title) : undefined;
      myMemberships.push({ id: committeeId, title: mappedTitle });
    }
  }

  const committeesMap = new Map();

  for (const membership of myMemberships) {
    const targetId = membership.id.toLowerCase();
    const title = membership.title;

    for (const committee of allCommittees) {
      const rawComSystemCode = committee.systemCode || committee.thomas_id;
      if (!rawComSystemCode) continue;
      const comSystemCode = rawComSystemCode.toLowerCase();

      if (comSystemCode === targetId) {
        if (!committeesMap.has(comSystemCode)) {
          committeesMap.set(comSystemCode, {
            systemCode: comSystemCode,
            name: committee.name,
            subcommittees: []
          });
        }
        if (title) committeesMap.get(comSystemCode).title = title;
        break;
      }

      if (committee.subcommittees) {
        let subFound = false;
        for (const sub of committee.subcommittees) {
          const rawSubSystemCode = sub.systemCode || sub.thomas_id;
          const subCodePart = rawSubSystemCode ? rawSubSystemCode.toLowerCase() : '';

          let fullSubSystemCode = subCodePart;
          if (!subCodePart.startsWith(comSystemCode)) {
            fullSubSystemCode = comSystemCode + subCodePart;
          }

          if (fullSubSystemCode === targetId) {
            if (!committeesMap.has(comSystemCode)) {
              committeesMap.set(comSystemCode, {
                systemCode: comSystemCode,
                name: committee.name,
                subcommittees: []
              });
            }

            const subObj: any = { systemCode: fullSubSystemCode, name: sub.name };
            if (title) subObj.title = title;

            committeesMap.get(comSystemCode).subcommittees.push(subObj);
            subFound = true;
            break;
          }
        }
        if (subFound) break;
      }
    }
  }

  return Array.from(committeesMap.values()).map(committee => {
    if (committee.subcommittees && committee.subcommittees.length > 0) {
      committee.subcommittees.sort((a, b) => (a.systemCode < b.systemCode ? -1 : 1));
    }
    return committee;
  });
};

export const processTerms = (legislator) => {
  const rawTerms = legislator.terms.map(term => {
    const start = new Date(term.start);
    const end = new Date(term.end);

    // Calculate congress range
    const startCongress = getCongress(start);
    // For end date, subtract 1 day to get the effective congress of service
    const endDateForCalc = new Date(end.getTime() - 86400000);
    const endCongress = getCongress(endDateForCalc);

    const congresses = [];
    for (let c = startCongress; c <= endCongress; c++) {
      congresses.push(c);
    }

    let party = term.party ? term.party.toLowerCase() : 'independent';
    if (party === 'democrat') party = 'democratic';

    const stateFull = STATE_MAP[term.state.toUpperCase()] || term.state;
    return {
      title: term.type === 'rep' ? `Representative for district ${term.district}, ${stateFull}` : `Senator for ${stateFull}`,
      start, end,
      state: term.state,
      district: term.district,
      party,
      congresses, // Store array of congresses
      type: term.type
    };
  }).sort((a, b) => a.start - b.start);

  const partyChangeRecords = [];
  for (let i = 1; i < rawTerms.length; i++) {
    const prev = rawTerms[i - 1];
    const curr = rawTerms[i];
    if (prev.party !== curr.party && prev.party !== 'unknown' && curr.party !== 'independent') {
      partyChangeRecords.push({
        newParty: curr.party,
        oldParty: prev.party,
        changedAt: { datetime: curr.start.toISOString(), precision: ["year", "month", "day"] }
      });
    }
  }

  const mergedPositions = [];
  if (rawTerms.length > 0) {
    let currentPos = { ...rawTerms[0], congresses: [...rawTerms[0].congresses] };

    for (let i = 1; i < rawTerms.length; i++) {
      const nextTerm = rawTerms[i];
      const gap = nextTerm.start - currentPos.end;
      const oneMonthMs = 1000 * 60 * 60 * 24 * 32;

      const isSame = (
        nextTerm.title === currentPos.title &&
        nextTerm.state === currentPos.state &&
        nextTerm.district === currentPos.district &&
        nextTerm.party === currentPos.party
      );

      if (isSame && gap < oneMonthMs) {
        currentPos.end = nextTerm.end;
        // Merge congresses arrays
        nextTerm.congresses.forEach(c => {
          if (!currentPos.congresses.includes(c)) {
            currentPos.congresses.push(c);
          }
        });
      } else {
        mergedPositions.push(currentPos);
        currentPos = { ...nextTerm, congresses: [...nextTerm.congresses] };
      }
    }
    mergedPositions.push(currentPos);
  }

  const finalPositions = mergedPositions.map(p => ({
    title: p.title,
    start: { datetime: p.start.toISOString(), precision: ["year", "month", "day"] },
    end: { datetime: p.end.toISOString(), precision: ["year", "month", "day"] },
    state: STATE_MAP[p.state.toUpperCase()] || p.state,
    district: p.district,
    party: p.party,
    congresses: p.congresses.sort((a, b) => a - b)
  }));

  return { rawTerms, finalPositions, partyChangeRecords };
};

export const processExperiences = (finalPositions, categoriesData) => {
  if (!finalPositions || finalPositions.length === 0) return [];

  const experiences = [];
  let currentGroup = {
    type: null,
    positions: []
  };

  // Helper to determine type from position title
  const getType = (title) => title.startsWith('Representative') ? 'rep' : 'sen';

  finalPositions.forEach(pos => {
    const type = getType(pos.title);

    if (currentGroup.type && currentGroup.type !== type) {
      // Push current group and start new one
      const categoryId = getCategoryId(currentGroup.type, categoriesData);
      const isCurrent = currentGroup.positions.some(p => new Date(p.end.datetime) > new Date());

      experiences.push({
        company: currentGroup.type === 'rep' ? "United States House of Representatives" : "United States Senate",
        category: categoryId,
        isCurrent,
        positions: currentGroup.positions
      });

      currentGroup = { type, positions: [] };
    }

    if (!currentGroup.type) currentGroup.type = type;
    currentGroup.positions.push(pos);
  });

  // Push last group
  if (currentGroup.positions.length > 0) {
    const categoryId = getCategoryId(currentGroup.type, categoriesData);
    const isCurrent = currentGroup.positions.some(p => new Date(p.end.datetime) > new Date());

    experiences.push({
      company: currentGroup.type === 'rep' ? "United States House of Representatives" : "United States Senate",
      category: categoryId,
      isCurrent,
      positions: currentGroup.positions
    });
  }

  return experiences;
};

export const processPhoto = async (bioguideId, displayName, baseUrl) => {
  try {
    const id = String(bioguideId).toUpperCase();
    const lower = id.toLowerCase();
    const letter = id[0];

    const urls = [
      // 1) primary
      `https://unitedstates.github.io/images/congress/original/${id}.jpg`,
      // 2) fallback1 (mostly House)
      `https://historycms.house.gov/uploadedImages/People/Listing/${letter}/${id}.jpg`,
      // 3) fallback2 (House + Senate)
      `https://www.congress.gov/img/member/${lower}_200.jpg`,
    ];

    const fetchFirstAvailable = async (urlList) => {
      for (const url of urlList) {
        const resp = await fetch(url);
        if (resp.ok) {
          const buf = await resp.arrayBuffer();
          return { url, buf };
        }
      }
      return null;
    };

    const picked = await fetchFirstAvailable(urls);
    if (!picked) {
      throw new Error(`Failed to fetch image from all sources for ${id}`);
    }

    const altText = `${displayName.replace(/ /g, "_")}.jpg`;
    const payload = {
      alt: altText,
      sizes: {
        tablet: {},
        mobile: {},
        desktop: {},
        thumbnail: {}
      }
    };

    const formData = new FormData();
    formData.append('file', new Blob([picked.buf], { type: 'image/jpeg' }), altText);
    formData.append('_payload', JSON.stringify(payload));

    const uploadUrl = `${baseUrl}/api/media-people?depth=0&fallback-locale=null`;
    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResp.ok) {
      throw new Error(`Failed to upload image: ${uploadResp.statusText}`);
    }

    const result = await uploadResp.json();
    return result?.doc?.id || null;
  } catch (error) {
    console.error("Error processing image:", error);
    return null;
  }
};

const getCategoryId = (latestType, categoriesData) => {
  if (categoriesData && categoriesData.docs) {
    const targetName = latestType === 'rep' ? 'House Representative' : (latestType === 'sen' ? 'Senator' : null);
    if (targetName) {
      const cat = categoriesData.docs.find(c => c.i18n?.en?.name === targetName);
      if (cat) return cat.id;
    }
  }
  return null;
};

const getCongress = (date) => {
  const year = date.getFullYear();
  let congress = Math.floor((year - 1789) / 2) + 1;
  // If odd year and before Jan 3, it belongs to previous congress
  if (year % 2 !== 0 && (date.getMonth() === 0 && date.getDate() < 3)) {
    congress -= 1;
  }
  return congress;
};
