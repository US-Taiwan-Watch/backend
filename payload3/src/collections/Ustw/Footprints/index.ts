import { cmsAdminOnly } from '../../../access/cmsAccess';
import { CollectionConfig } from "payload";
import { setSearchOptimization } from "./hooks/beforeChange";
import { FOORPRINT_TYPE_OPTIONS } from "../../../configs/about";

export const UstwFootprints: CollectionConfig = {
  slug: "ustw-footprints",
  labels: {
    singular: "USTW - Footprint",
    plural: "USTW - Footprint",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "source", "type"],
    listSearchableFields: ["title", "source", "type"],
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
                      name: "title",
                      type: "text",
                      label: "Title",
                    },
                    {
                      name: "source",
                      type: "text",
                      label: "Source",
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
                    },
                    {
                      name: "source",
                      type: "text",
                      label: "來源",
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
      name: "type",
      label: "Footprint Type",
      type: "select",
      options: FOORPRINT_TYPE_OPTIONS,
      required: true,
      admin: {
        position: "sidebar"
      },
    },
    {
      name: "publishTime",
      label: "Publish Time",
      type: "date",
      required: true,
      admin: {
        position: "sidebar"
      },
    },
    {
      name: "link",
      type: "text",
      label: "Link",
      required: false,
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
          admin: {
            readOnly: true,
          },
        },
        {
          name: "source",
          type: "text",
          label: "Source",
          required: false,
          admin: {
            readOnly: true,
          },
        }
      ],
    },
  ],
  hooks: {
    beforeChange: [setSearchOptimization],
  },
};
