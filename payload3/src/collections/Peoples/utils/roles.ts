import { CATEGORY_PEOPLE_ID_MAP } from "../../../configs/category-people";

// export const ROLE_IN_CONGRESS = (data, siblingData) => IS_ROLE(data, siblingData, ['Senator', 'House Representative'])

// export const ROLE_AS_SENATOR = (data, siblingData) => IS_ROLE(data, siblingData, ['Senator'])

// export const ROLE_AS_HOUSE = (data, siblingData) => IS_ROLE(data, siblingData, ['House Representative'])

// export const ROLE_AS_OFFICIAL = (data, siblingData) => IS_ROLE(data, siblingData, ['Official'])

// export const ROLE_AS_EXPERT = (data, siblingData) => IS_ROLE(data, siblingData, ['Expert'])

export const ROLE_IN_CONGRESS = (data, siblingData) => IS_ROLE(data, siblingData, [CATEGORY_PEOPLE_ID_MAP.SENATOR_ID, CATEGORY_PEOPLE_ID_MAP.HOUSE_ID])

export const ROLE_AS_SENATOR = (data, siblingData) => IS_ROLE(data, siblingData, [CATEGORY_PEOPLE_ID_MAP.SENATOR_ID])

export const ROLE_AS_HOUSE = (data, siblingData) => IS_ROLE(data, siblingData, [CATEGORY_PEOPLE_ID_MAP.HOUSE_ID])

export const ROLE_AS_OFFICIAL = (data, siblingData) => IS_ROLE(data, siblingData, [CATEGORY_PEOPLE_ID_MAP.OFFICIAL_ID])

export const ROLE_AS_EXPERT = (data, siblingData) => IS_ROLE(data, siblingData, [CATEGORY_PEOPLE_ID_MAP.EXPERT_ID])

export const IS_ROLE = (data, siblingData, roles) => {
  if (!data?.experiences || !Array.isArray(roles)) return true;

  const parent = data.experiences
    .find(({ positions }) =>
      Array.isArray(positions) &&
      positions.some(({ id }) => id === siblingData.id)
    );

  return roles.includes(parent.category);
};
