import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from "payload";
import {
  addBillCount,
  addRecords,
  addCosponsorBills,
  addSponsorBills,
  addVotes,
  transformCategoryToRole,
  addCurrentParty,
} from "./hooks/afterRead";
import {
  cleanRoleData,
  setSearchOptimizationContent,
  setMidnight,
  transformRoleToCategory,
} from "./hooks/beforeChange";
import {
  COMPANY_TYPE_OPTIONS,
  AREA_OPTIONS,
  GENDER_OPTIONS,
  LINK_OPTIONS,
  REGION_OPTIONS,
  STATE_OPTIONS,
  DATETIME_PRECISION_OPTIONS,
  SUBCOMMITTEE_TITLE_OPTIONS,
} from "../../configs/people";
import { PARTY_OPTIONS } from "../../configs/bill";
import {
  ROLE_AS_EXPERT,
  ROLE_AS_HOUSE,
  ROLE_AS_OFFICIAL,
  ROLE_IN_CONGRESS,
} from "./utils/roles";
import { syncAlgolia } from "./hooks/afterChange";
import { deleteAlgolia } from "./hooks/afterDelete";
import { aiBiographyHandler } from "./endpoints/aiBiography";
import { syncPeopleHandler } from "./endpoints/syncPeople";
import { fetchPeopleHandler } from "./endpoints/fetchPeople";
import { upsertPeopleHandler } from "./endpoints/upsertPeople";
import { withHeaderSecret } from "../../middlewares/auth-internal";

export const Peoples: CollectionConfig = {
  slug: "peoples",
  labels: {
    singular: "People",
    plural: "People",
  },
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "govTrackId", "currentParty"],
    listSearchableFields: ["displayName"],
    components: {
      edit: {
        SaveButton: "/components/peopleSyncSection#default",
      }
    },
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  fields: [
    {
      name: "i18n",
      label: " ",
      type: "group",
      admin: {
        disableListColumn: true,
      },
      fields: [
        {
          type: "tabs",
          tabs: [
            {
              label: "English",
              fields: [
                {
                  name: "en",
                  type: "group",
                  label: " ",
                  fields: [
                    {
                      name: "firstName",
                      label: "First Name",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "lastName",
                      label: "Last Name",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "middleName",
                      label: "Middle Name",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "displayName",
                      label: "Display Name",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "bio",
                      label: "Bio",
                      type: "textarea",
                      required: true,
                      admin: {
                        components: {
                          Field: "/components/peopleBioSection#default",
                        },
                      },
                    },
                    {
                      name: "otherNames",
                      label: "Other Names",
                      type: "array",
                      fields: [
                        {
                          name: "otherName",
                          label: "Names",
                          type: "text",
                          required: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              label: "中文",
              fields: [
                {
                  name: "zh",
                  type: "group",
                  label: " ",
                  fields: [
                    {
                      name: "firstName",
                      label: "名字",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "lastName",
                      label: "姓氏",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "middleName",
                      label: "中間名",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "displayName",
                      label: "顯示名稱",
                      type: "text",
                      required: false,
                    },
                    {
                      name: "bio",
                      label: "人物介紹",
                      type: "textarea",
                      required: false,
                    },
                    {
                      name: "otherNames",
                      label: "其他名稱",
                      type: "array",
                      fields: [
                        {
                          name: "otherName",
                          label: "名稱",
                          type: "text",
                          required: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "photo",
      label: "Photo",
      type: "upload",
      relationTo: "media-people",
      filterOptions: {
        mimeType: { contains: "image" },
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "birthday",
      label: " ",
      type: "group",
      admin: {
        position: "sidebar",
        style: { border: "none", padding: 0, margin: 0 },
        disableListColumn: true,
      },
      fields: [
        {
          name: "datetime",
          label: "Birthday",
          type: "date",
          hooks: { beforeChange: [setMidnight] },
        },
        {
          name: "precision",
          label: "Birthday Precision",
          type: "select",
          options: DATETIME_PRECISION_OPTIONS,
          hasMany: true,
          admin: { style: { marginBottom: 25 } },
          defaultValue: [],
        },
      ],
    },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: GENDER_OPTIONS,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "tags",
      label: "Tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      admin: { position: "sidebar" },
    },
    {
      type: "collapsible",
      label: "Congressional Data",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "congressionalData",
          label: " ",
          type: "group",
          admin: {
            style: { border: "none", padding: 0, margin: 0 },
            disableListColumn: true
          },
          fields: [
            {
              name: "bioGuideId",
              label: "Bio Guide ID",
              type: "text",
            },
            {
              name: "govTrackId",
              label: "Government Track ID",
              type: "number",
              validate: (value) => {
                if (!value) {
                  return true;
                } else if (value > 0) {
                  return true;
                } else {
                  return "Gov Track Id must be a positive number";
                }
              },
              admin: {
                style: { paddingBottom: 20 },
              },
            },
            {
              type: "collapsible",
              label: "Committees",
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  label: " ",
                  name: "committees",
                  type: "array",
                  fields: [
                    {
                      name: "systemCode",
                      label: "System Code",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "name",
                      label: "Name",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "title",
                      label: "Title",
                      type: "select",
                      options: SUBCOMMITTEE_TITLE_OPTIONS,
                    },
                    {
                      name: "subcommittees",
                      label: " ",
                      type: "array",
                      fields: [
                        {
                          name: "systemCode",
                          label: "System Code",
                          type: "text",
                          required: true,
                        },
                        {
                          name: "name",
                          label: "Name",
                          type: "text",
                          required: true,
                        },
                        {
                          name: "title",
                          label: "Title",
                          type: "select",
                          options: SUBCOMMITTEE_TITLE_OPTIONS,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Experiences",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          label: " ",
          name: "experiences",
          type: "array",
          admin: {
            disableListColumn: true,
          },
          fields: [
            {
              name: "company",
              label: "Company",
              type: "text",
              required: true,
            },
            // {
            //   name: "category",
            //   label: "Category",
            //   type: "text",
            //   required: true,
            //   admin: {
            //     components: {
            //       Field: "/components/peopleRoleSelect#default",
            //     },
            //   },
            // },
            {
              name: "category",
              label: "Category",
              type: "relationship",
              required: true,
              relationTo: "categories-people",
            },
            {
              name: "isCurrent",
              type: "checkbox",
              label: "Is Current",
              defaultValue: false,
            },
            {
              name: "positions",
              label: "Positions",
              type: "array",
              fields: [
                {
                  name: "title",
                  label: "Title",
                  type: "text",
                  required: true,
                },
                {
                  name: "description",
                  label: "Description",
                  type: "text",
                  required: false,
                },
                {
                  name: "start",
                  label: " ",
                  type: "group",
                  admin: { style: { border: "none", padding: 0, margin: 0 } },
                  fields: [
                    {
                      name: "datetime",
                      label: "Start Date",
                      type: "date",
                      required: true,
                      hooks: { beforeChange: [setMidnight] },
                      admin: { style: { marginTop: -10 } },
                    },
                    {
                      name: "precision",
                      label: "Start Precision",
                      type: "select",
                      options: DATETIME_PRECISION_OPTIONS,
                      hasMany: true,
                      required: true,
                      admin: { style: { marginBottom: 25 } },
                      defaultValue: ["year", "month", "day"],
                    },
                  ],
                },
                {
                  name: "end",
                  label: " ",
                  type: "group",
                  admin: { style: { border: "none", padding: 0, margin: 0 } },
                  fields: [
                    {
                      name: "datetime",
                      label: "End Date",
                      type: "date",
                      hooks: { beforeChange: [setMidnight] },
                      admin: { style: { marginTop: -10 } },
                    },
                    {
                      name: "precision",
                      label: "End Precision",
                      type: "select",
                      options: DATETIME_PRECISION_OPTIONS,
                      hasMany: true,
                      admin: { style: { marginBottom: 25 } },
                      defaultValue: [],
                    },
                  ],
                },
                {
                  name: "state",
                  label: "State / Region",
                  type: "select",
                  required: true,
                  options: STATE_OPTIONS.concat(REGION_OPTIONS),
                  admin: {
                    condition: (data, siblingData) =>
                      ROLE_IN_CONGRESS(data, siblingData),
                  },
                },
                {
                  name: "district",
                  label: "District (Number)",
                  type: "number",
                  required: true,
                  validate: (value) => {
                    if (!value) {
                      return true
                    } else if (value >= 0) {
                      return true;
                    } else {
                      return "District Number must be a positive number or zero";
                    }
                  },
                  admin: {
                    condition: (data, siblingData) =>
                      ROLE_AS_HOUSE(data, siblingData),
                  },
                },
                {
                  name: "party",
                  label: "Party",
                  type: "select",
                  options: PARTY_OPTIONS,
                  required: true,
                  admin: {
                    condition: (data, siblingData) =>
                      ROLE_IN_CONGRESS(data, siblingData),
                  },
                },
                {
                  name: "congresses",
                  label: "Congresses",
                  type: "number",
                  hasMany: true,
                  required: true,
                  admin: {
                    components: {
                      Field: "/components/peopleCongressSelect#default",
                    },
                    condition: (data, siblingData) =>
                      ROLE_IN_CONGRESS(data, siblingData),
                  },
                },
                {
                  name: "officialAreas",
                  label: "Official Areas",
                  type: "select",
                  options: AREA_OPTIONS,
                  hasMany: true,
                  required: true,
                  admin: {
                    condition: (data, siblingData) =>
                      ROLE_AS_OFFICIAL(data, siblingData),
                  },
                },
                {
                  name: "companyType",
                  label: "Company Type",
                  type: "select",
                  options: COMPANY_TYPE_OPTIONS,
                  required: true,
                  admin: {
                    condition: (data, siblingData) =>
                      ROLE_AS_EXPERT(data, siblingData),
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Publications",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          name: "publications",
          label: " ",
          type: "array",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
            },
            {
              name: "abstract",
              label: "Abstract",
              type: "text",
            },
            {
              name: "link",
              label: "Link",
              type: "text",
            },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Links",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          label: " ",
          name: "links",
          type: "array",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "type",
              label: "Type",
              type: "select",
              options: LINK_OPTIONS,
              required: true,
            },
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
            },
            {
              name: "link",
              label: "Link",
              type: "text",
              required: true,
            },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Party Change Records",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          label: " ",
          name: "partyChangeRecords",
          type: "array",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "newParty",
              label: "New Party",
              type: "select",
              options: PARTY_OPTIONS,
              required: true,
            },
            {
              name: "oldParty",
              label: "Old Party",
              type: "select",
              options: PARTY_OPTIONS,
              required: true,
            },
            {
              name: "changedAt",
              label: " ",
              type: "group",
              admin: {
                position: "sidebar",
                style: { border: "none", padding: 0, margin: 0 },
              },
              fields: [
                {
                  name: "datetime",
                  label: "Changed At",
                  type: "date",
                  required: true,
                  admin: { style: { marginTop: -10 } },
                  hooks: { beforeChange: [setMidnight] },
                },
                {
                  name: "precision",
                  label: "Changed Precision",
                  type: "select",
                  options: DATETIME_PRECISION_OPTIONS,
                  hasMany: true,
                  required: true,
                  admin: { style: { marginBottom: 25 } },
                  defaultValue: ["year", "month", "day"],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "viewCount",
      type: "number",
      defaultValue: 0,
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: "sidebar", disableListColumn: true },
    },
    {
      name: "billCount",
      label: "Bill Count",
      type: "number",
      admin: {
        disabled: true,
      },
    },
    {
      name: "currentParty",
      type: "text",
      admin: {
        readOnly: true,
        position: "sidebar",
      },
    },
    {
      name: "records",
      type: "relationship",
      relationTo: "taiwan-records",
      hasMany: true,
      admin: {
        disabled: true,
      },
    },
    {
      name: "sponsorBills",
      type: "relationship",
      relationTo: "bills",
      hasMany: true,
      admin: {
        disabled: true,
      },
    },
    {
      name: "cosponsorBills",
      type: "relationship",
      relationTo: "bills",
      hasMany: true,
      admin: {
        disabled: true,
      },
    },
    {
      name: "votes",
      label: " ",
      type: "array",
      admin: {
        disabled: true,
      },
      fields: [
        {
          name: "vote",
          type: "relationship",
          relationTo: "votes",
        },
        {
          name: "stance",
          type: "text",
        },
        {
          name: "party",
          type: "text",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Search Optimization",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "displayName",
          type: "text",
          label: "Display Name",
          required: false,
          hidden: false,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "bio",
          type: "textarea",
          label: "Bio",
          required: false,
          hidden: false,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "govTrackId",
          type: "text",
          label: "Government Track ID",
          required: false,
          hidden: false,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    // {
    //   name: 'myCustomUIField', // required
    //   type: 'ui', // required
    //   admin: {
    //     components: {
    //       Field: ApproveButton,
    //       Cell: ApproveButton,
    //     },
    //   },
    // },
  ],
  hooks: {
    beforeChange: [
      setSearchOptimizationContent,
      cleanRoleData,
      // transformRoleToCategory,
    ],
    afterRead: [
      addBillCount,
      addCurrentParty,
      addRecords,
      addSponsorBills,
      addCosponsorBills,
      addVotes,
      // transformCategoryToRole,
    ],
    afterChange: [
      syncAlgolia,
    ],
    afterDelete: [
      deleteAlgolia
    ]
  },
  endpoints: [
    {
      path: '/ai-biography',
      method: 'post',
      handler: withHeaderSecret(aiBiographyHandler),
    },
    {
      path: '/sync-people',
      method: 'post',
      handler: withHeaderSecret(syncPeopleHandler),
    },
    {
      path: '/fetch-people',
      method: 'post',
      handler: withHeaderSecret(fetchPeopleHandler),
    },
    {
      path: '/upsert-people',
      method: 'post',
      handler: withHeaderSecret(upsertPeopleHandler),
    },
  ],
};
