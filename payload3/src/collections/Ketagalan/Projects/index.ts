import { cmsAdminOnly } from '../../../access/cmsAccess';
import { CollectionConfig } from "payload";
import { setSearchOptimization } from "./hooks/beforeChange";

export const KetagalanProjects: CollectionConfig = {
  slug: "ketagalan-projects",
  labels: {
    singular: "Ketagalan - Project",
    plural: "Ketagalan - Project",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "description"],
    listSearchableFields: ["title", "description"],
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
                      required: true,
                    },
                    {
                      name: "description",
                      type: "text",
                      label: "Description",
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
                      name: "title",
                      type: "text",
                      label: "標題",
                      required: true,
                    },
                    {
                      name: "description",
                      type: "text",
                      label: "描述",
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
      name: "photo",
      label: "Photo",
      type: "upload",
      relationTo: "media-project",
      filterOptions: {
        mimeType: { contains: "image" },
      },
      admin: {
        position: "sidebar",
      },
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
          name: "description",
          type: "text",
          label: "Description",
          required: false,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [setSearchOptimization],
  },
};
