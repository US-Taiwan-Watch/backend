import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from "payload";
import { setSearchOptimizationContent } from "./hooks/beforeChange";

export const generateCategoryConfig = (slug, label): CollectionConfig => ({
  slug: slug,
  labels: {
    singular: label,
    plural: label,
  },
  admin: {
    useAsTitle: "nameEn",
    defaultColumns: ["nameEn", "nameZh"],
    listSearchableFields: ["nameEn", "nameZh"],
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
        disableListColumn: true
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
                      name: "name",
                      type: "text",
                      label: "Name",
                      required: true,
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
                      name: "name",
                      type: "text",
                      label: "名稱",
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
    {
      type: "collapsible",
      label: "Search Optimization",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "nameEn",
          type: "text",
          label: "Name",
          required: false,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "nameZh",
          type: "text",
          label: "名稱",
          required: false,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [setSearchOptimizationContent],
  },
});
