import { cmsAdminOnly } from '../../../access/cmsAccess';
import { CollectionConfig } from "payload";
import { setSearchOptimization } from "./hooks/beforeChange";
import { MEMBER_TYPE_OPTIONS } from "../../../configs/about";

export const KetagalanMembers: CollectionConfig = {
  slug: "ketagalan-members",
  labels: {
    singular: "Ketagalan - Member",
    plural: "Ketagalan - Member",
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "description", "type"],
    listSearchableFields: ["name", "description", "type"],
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
                      name: "name",
                      type: "text",
                      label: "名稱",
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
      relationTo: "media-member",
      filterOptions: {
        mimeType: { contains: "image" },
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "type",
      label: "Member Type",
      type: "select",
      options: MEMBER_TYPE_OPTIONS,
      required: true,
      admin: {
        position: "sidebar"
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
          name: "name",
          type: "text",
          label: "Name",
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
