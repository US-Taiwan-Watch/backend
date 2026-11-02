import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from "payload";
import { PARTY_OPTIONS, TRACKER_OPTIONS, TYPE_OPTIONS } from '../../configs/bill';
import { setSearchOptimizationContent, setLatestActionTime } from './hooks/beforeChange';
import { setMidnight } from '../Peoples/hooks/beforeChange';
import { DATETIME_PRECISION_OPTIONS, REGION_OPTIONS, STATE_OPTIONS } from '../../configs/people';
import { aiSummaryHandler } from "./endpoints/aiSummary";
import { syncBillHandler } from "./endpoints/syncBill";
import { fetchBillHandler } from "./endpoints/fetchBill";
import { updateBillHandler } from "./endpoints/updateBill";
import { syncAlgolia, syncAzureSearch } from "./hooks/afterChange";
import { deleteAlgolia, deleteAzureSearch } from "./hooks/afterDelete";
import { withHeaderSecret } from "../../middlewares/auth-internal";

export const Bills: CollectionConfig = {
  slug: "bills",
  labels: {
    singular: 'Bill',
    plural: 'Bill'
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "number", "congress"],
    listSearchableFields: ["title"],
    components: {
      edit: {
        SaveButton: "/components/billSyncSection#default",
      }
    },
  },
  access: {
    read: () => true,
    // create: ({ req }) => req.user.collection === 'users',
    create: cmsAdminOnly,
    // update: ({ req }) => req.user.collection === 'users',
    update: cmsAdminOnly,
    // delete: ({ req }) => req.user.collection === 'users',
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
                      name: "title",
                      type: "text",
                      label: "Title",
                      required: true,
                    },
                    {
                      name: "summary",
                      label: "Summary",
                      type: "textarea",
                      required: true,
                      admin: {
                        components: {
                          Field: "/components/billSummarySection#default",
                        },
                      },
                    },
                    {
                      name: "actionsOverview",
                      label: "Actions Overview",
                      type: "json",
                      required: false,
                    },
                    {
                      name: "actionsAll",
                      label: "Actions All",
                      type: "json",
                      required: false,
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
                      name: "title",
                      type: "text",
                      label: "標題",
                      required: true,
                    },
                    {
                      name: "summary",
                      label: "摘要",
                      type: "textarea",
                    },
                    {
                      name: "actionsOverview",
                      label: "審議進度 (摘要)",
                      type: "json",
                      required: false,
                    },
                    {
                      name: "actionsAll",
                      label: "審議進度 (所有)",
                      type: "json",
                      required: false,
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
      name: "congress",
      label: "Congress Number",
      type: "number",
      required: true,
      admin: { position: "sidebar" },
      validate: (value) => {
        if (value > 0) {
          return true;
        } else {
          return "Congress Number must be a positive number";
        }
      },
    },
    {
      name: "number",
      label: "Bill Number",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "type",
      label: "Bill Type",
      type: "select",
      options: TYPE_OPTIONS,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "introducedAt",
      label: " ",
      type: "group",
      admin: {
        position: "sidebar",
        disableListColumn: true,
        style: { border: "none", padding: 0, margin: 0 }
      },
      fields: [
        {
          name: "datetime",
          label: "Introduced Date",
          type: "date",
          required: true,
          admin: { style: { marginTop: -10 } },
          hooks: { beforeChange: [setMidnight] },
        },
        {
          name: "precision",
          label: "Introduced Precision",
          type: "select",
          options: DATETIME_PRECISION_OPTIONS,
          hasMany: true,
          required: true,
          admin: { style: { marginTop: 25, marginBottom: 25 } },
          defaultValue: ["year", "month", "day"],
        },
      ],
    },
    {
      name: "isFeatured",
      label: "Is Featured",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "categories",
      label: "Categories",
      type: "relationship",
      relationTo: "categories-bill",
      hasMany: true,
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
      label: "Status Tracker",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          name: "statusTracker",
          type: "group",
          label: " ",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "currentStep",
              label: "Current Step",
              type: "select",
              options: TRACKER_OPTIONS,
              required: true,
            },
            {
              name: "passedSteps",
              label: "Passed Steps",
              type: "select",
              options: TRACKER_OPTIONS,
              required: true,
              hasMany: true,
            },
            {
              name: "futureSteps",
              label: "Future Steps",
              type: "select",
              options: TRACKER_OPTIONS,
              required: false,
              hasMany: true,
            },
          ],
        }
      ],
    },
    {
      type: "collapsible",
      label: "Sponsor",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          name: "sponsor",
          label: " ",
          type: "group",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "people",
                  label: "Sponsor",
                  type: "relationship",
                  required: true,
                  relationTo: "peoples",
                },
                {
                  name: "party",
                  label: "Party",
                  type: "select",
                  required: true,
                  options: PARTY_OPTIONS,
                },
              ],
            },
          ],
        }
      ]
    },
    {
      type: "collapsible",
      label: "Cosponsors",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          name: "cosponsors",
          label: " ",
          type: "array",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "people",
              label: "People",
              type: "relationship",
              relationTo: "peoples",
              hasMany: false,
              required: true,
            },
            {
              type: "row",
              fields: [
                {
                  name: "constituency",
                  label: "Constituency",
                  type: "select",
                  options: STATE_OPTIONS.concat(REGION_OPTIONS),
                  required: true,
                },
                {
                  name: "party",
                  label: "Party",
                  type: "select",
                  options: PARTY_OPTIONS,
                  required: true
                },
              ],
            },
            {
              name: "cosponsoredAt",
              label: " ",
              type: "group",
              admin: { style: { border: "none", marginTop: -36 } },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "datetime",
                      label: "Cosponsored Date",
                      type: "date",
                      required: true,
                      hooks: { beforeChange: [setMidnight] },
                    },
                    {
                      name: "precision",
                      label: "Cosponsored Precision",
                      type: "select",
                      options: DATETIME_PRECISION_OPTIONS,
                      hasMany: true,
                      required: true,
                      defaultValue: ["year", "month", "day"],
                    },
                  ],
                }
              ],
            },
          ],
        }]
    },
    {
      type: "collapsible",
      label: "Bill Context",
      admin: {
        initCollapsed: true
      },
      fields: [
        {
          name: "congressGovUrl",
          label: "Government URL",
          type: "text",
          required: true,
        },
        {
          name: 'popularityRank',
          type: 'number',
          label: 'Popularity Rank',
          required: false,
          validate: (value) => {
            if (!value) return true;
            if (value > 0) {
              return true;
            } else {
              return "Popularity rank must be a positive number";
            }
          },
        },
        {
          name: "relatedBills",
          label: "Related Bills",
          type: "relationship",
          relationTo: "bills",
          hasMany: true,
        },
      ]
    },
    {
      type: "collapsible",
      label: "Search Optimization",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
          required: false,
          hidden: false,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "summary",
          type: "textarea",
          label: "Summary",
          required: false,
          hidden: false,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      name: "latestActionTime",
      type: "date",
      label: "Latest Action Time",
      required: false,
      admin: {
        hidden: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      setLatestActionTime,
      setSearchOptimizationContent,
    ],
    afterChange: [
      syncAlgolia,
      syncAzureSearch,
    ],
    afterDelete: [
      deleteAlgolia,
      deleteAzureSearch
    ]
  },
  endpoints: [
    {
      path: '/ai-summary',
      method: 'post',
      handler: withHeaderSecret(aiSummaryHandler),
    },
    {
      path: '/sync-bill',
      method: 'post',
      handler: withHeaderSecret(syncBillHandler),
    },
    {
      path: '/fetch-bill',
      method: 'post',
      handler: withHeaderSecret(fetchBillHandler),
    },
    {
      path: '/update-bill',
      method: 'post',
      handler: withHeaderSecret(updateBillHandler),
    },
  ],
};
