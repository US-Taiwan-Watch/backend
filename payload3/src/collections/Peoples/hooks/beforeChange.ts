import { CATEGORY_PEOPLE_ID_MAP } from "../../../configs/category-people";


export const setSearchOptimizationContent: any = ({ data, originalDoc }) => {
  if (data.i18n && data.i18n.en && data.i18n.en.displayName) {
    data.displayName = data.i18n.en.displayName;
  }
  if (data.i18n && data.i18n.en && data.i18n.en.bio) {
    // data.bio = data.i18n.en.bio.map((node) => Node.string(node)).join('\n');
    data.bio = data.i18n.en.bio;
  }
  if (data.congressionalData && data.congressionalData.govTrackId) {
    data.govTrackId = data.congressionalData.govTrackId;
  }
}

export const setMidnight: any = ({ value }) => {
  if (!value) return value;
  const date = new Date(value);

  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export const cleanRoleData: any = ({ data }) => {
  if (!data?.experiences) return data;

  // Helper function to remove specific fields
  const removeFields = (position, fieldsToRemove) => {
    fieldsToRemove.forEach((field) => {
      if (position.hasOwnProperty(field)) {
        delete position[field];
      }
    });
  };

  // Iterate through all experiences
  data.experiences.forEach((experience) => {
    const { category, positions } = experience;

    if (!positions || !Array.isArray(positions)) return;

    // Determine fields to remove based on category
    let fieldsToRemove = [];
    switch (category) {
      // case "Senator":
      //   fieldsToRemove = ["district", "officialAreas", "companyType"];
      //   break;
      // case "House Representative":
      //   fieldsToRemove = ["officialAreas", "companyType"];
      //   break;
      // case "Official":
      //   fieldsToRemove = ["congresses", "party", "congress", "state", "district", "companyType"];
      //   break;
      // case "Expert":
      //   fieldsToRemove = ["congresses", "party", "congress", "state", "district", "officialAreas"];
      //   break;
      // case "Other":
      //   fieldsToRemove = ["congresses", "party", "congress", "state", "district", "officialAreas", "companyType"];
      //   break;
      case CATEGORY_PEOPLE_ID_MAP.SENATOR_ID:
        fieldsToRemove = ["district", "officialAreas", "companyType"];
        break;
      case CATEGORY_PEOPLE_ID_MAP.HOUSE_ID:
        fieldsToRemove = ["officialAreas", "companyType"];
        break;
      case CATEGORY_PEOPLE_ID_MAP.OFFICIAL_ID:
        fieldsToRemove = ["congresses", "party", "congress", "state", "district", "companyType"];
        break;
      case CATEGORY_PEOPLE_ID_MAP.EXPERT_ID:
        fieldsToRemove = ["congresses", "party", "congress", "state", "district", "officialAreas"];
        break;
      case CATEGORY_PEOPLE_ID_MAP.OTHER_ID:
        fieldsToRemove = ["congresses", "party", "congress", "state", "district", "officialAreas", "companyType"];
        break;
      default:
        return;
    }

    // Remove the fields from each position
    positions.forEach((position) => removeFields(position, fieldsToRemove));
  });

  return data;
};


export const transformRoleToCategory = async ({ req, data }) => {
  if (!Array.isArray(data.experiences)) {
    return data;
  }

  try {
    // Iterate through the experiences array
    for (const experience of data.experiences) {
      if (experience.category) {
        // Backup the original category value
        experience.roleName = experience.category;

        // Check if a matching category exists by _id
        const responseById = await req.payload.find({
          collection: "categories-people",
          where: {
            _id: { equals: experience.category },
          },
        });

        if (responseById.docs.length > 0) {
          // If found by _id, skip further checks for this experience
          continue;
        }

        // Check if a matching category exists by name
        const responseByName = await req.payload.find({
          collection: "categories-people",
          where: {
            nameEn: { equals: experience.category },
          },
        });

        if (responseByName.docs.length > 0) {
          // Update the category to the ID if found by name
          experience.category = responseByName.docs[0].id;
        }
      }
    }
  } catch (error) {
    console.error("Error transforming role to category in experiences:", error);
  }

  return data;
};
