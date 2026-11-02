export const addBillCount = async ({ req, doc }) => {
  try {
    const db = req.payload.db;
    const billCount = await db.collections['bills'].countDocuments({
      'sponsor.people': doc.id,
    });
    doc.billCount = billCount;

    return doc;
  } catch (error) {
    console.error('Error fetching bill count:', error.message);
    doc.billCount = 0; // Default to 0 in case of an error
    return doc;
  }
}

export const addCurrentParty = async ({ req, doc }) => {
  if (!doc?.experiences || !Array.isArray(doc.experiences)) return doc;

  const now = new Date();
  let currentParty = null;

  const isCurrentPosition = (position) => {
    if (!position?.party) return false;

    const endValue = position?.end?.datetime ?? position?.end;
    if (!endValue) return true;

    const endDate = new Date(endValue);
    if (Number.isNaN(endDate.getTime())) return false;

    return endDate > now;
  };

  doc.experiences.forEach((experience) => {
    if (!experience?.positions || !Array.isArray(experience.positions)) return;

    experience.positions.forEach((position) => {
      if (isCurrentPosition(position)) {
        currentParty = position.party; // 目前會以「最後一個符合條件的」為準
      }
    });
  });

  doc.currentParty = currentParty ?? "independent";
  return doc;
};

export const addSponsorBills = async ({ req, doc }) => {
  try {
    const db = req.payload.db;

    const bills = await db.collections["bills"].find({
      'sponsor.people': doc.id,
    });
    doc.sponsorBills = bills.map(b => b._id.toString());

    return doc;
  } catch (error) {
    console.error("Error fetching sponsor bills", error.message);
    doc.records = [];
    return doc;
  }
};

export const addCosponsorBills = async ({ req, doc }) => {
  try {
    const db = req.payload.db;

    const bills = await db.collections["bills"].find({
      cosponsors: { $elemMatch: { people: doc.id } }
    });
    doc.cosponsorBills = bills.map(b => b._id.toString());

    return doc;
  } catch (error) {
    console.error("Error fetching cosponsor bills", error.message);
    doc.records = [];
    return doc;
  }
};

export const addRecords = async ({ req, doc }) => {
  try {
    const db = req.payload.db;

    const records = await db.collections["taiwan-records"].find({
      people: doc.id,
      status: "published"
    });
    doc.records = records.map(r => r._id.toString());

    return doc;
  } catch (error) {
    console.error("Error fetching records", error.message);
    doc.records = [];
    return doc;
  }
};

export const addVotes = async ({ req, doc }) => {
  try {
    const db = req.payload.db;

    const votes = await db.collections["votes"].find({
      $or: [
        { 'result.noes': { $elemMatch: { id: doc.id } } },
        { 'result.ayes': { $elemMatch: { id: doc.id } } },
        { 'result.present': { $elemMatch: { id: doc.id } } },
        { 'result.notVoting': { $elemMatch: { id: doc.id } } }
      ]
    });

    doc.votes = [];

    votes.forEach(vote => {
      const findStanceAndParty = () => {
        for (const [stance, voters] of Object.entries(vote.result)) {
          const matchedVoter = (voters as any).find(voter => voter.id === doc.id);
          if (matchedVoter) {
            return { stance, party: matchedVoter.party || null };
          }
        }
        return { stance: null, party: null };
      };

      const { stance, party } = findStanceAndParty();

      if (stance) {
        doc.votes.push({
          vote: vote._id.toString(),
          stance: stance,
          party: party,
        });
      }
    });

    return doc;
  } catch (error) {
    console.error("Error fetching votes", error.message);
    doc.votes = [];
    return doc;
  }
};

export const transformCategoryToRole = async ({ req, doc }) => {
  if (!Array.isArray(doc.experiences)) {
    return doc;
  }

  try {
    for (const experience of doc.experiences) {
      if (experience.category) {
        const category = await req.payload.findByID({
          collection: "categories-people",
          id: experience.category,
        });
        if (category) {
          experience.category = category.nameEn;
        }
      }
    }
  } catch (error) {
    console.error("Error transforming category in experiences:", error);
  }

  return doc;
};
