import { cmsAdminOnly } from '../../../access/cmsAccess';
import { slateEditor } from "@payloadcms/richtext-slate";
import { CollectionConfig } from "payload";
import { SLATE_ELEMENT } from "../../../configs/slate";
import { syncAlgolia } from "./hooks/afterChange";
import { deleteAlgolia } from "./hooks/afterDelete";

export const UstwArticles: CollectionConfig = {
  slug: "ustw-articles",
  labels: {
    singular: "USTW - Article",
    plural: "USTW - Article",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "releaseTime", "authors"],
    listSearchableFields: ["title"],
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  fields: [
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
    },
    {
      name: "subtitle",
      label: "Subtitle",
      type: "text",
    },
    {
      name: "excerpt",
      label: "Excerpt",
      type: "textarea",
      required: true,
    },
    {
      name: "content",
      label: "Content",
      type: "richText",
      required: false,
      editor: slateEditor({
        admin: {
          elements: SLATE_ELEMENT,
        },
      }),
    },
    {
      type: "collapsible",
      label: "Sources",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "sources",
          label: " ",
          type: "array",
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "text",
              label: "Text",
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
      name: "podcast",
      label: "Podcast",
      type: "text",
      admin: {
        components: {
          Field: "/components/articlePodcastSelect#default",
        },
      },
    },
    {
      name: "media",
      label: "Media",
      type: "group",
      fields: [
        {
          name: "photo",
          label: "Photo",
          type: "upload",
          relationTo: "media-article",
          filterOptions: {
            mimeType: { contains: "image" },
          },
          required: true,
        },
        {
          name: "caption",
          type: "text",
          label: "Caption",
        },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isFeatured",
      label: "Is Featured",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "releaseTime",
      label: "Release Time",
      type: "date",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "authors",
      label: "Authors",
      type: "relationship",
      relationTo: "ustw-authors",
      required: false,
      hasMany: true,
      admin: { position: "sidebar" },
    },
    {
      name: "categories",
      label: "Categories",
      type: "relationship",
      relationTo: "categories-article",
      required: true,
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
  ],
  hooks: {
    afterChange: [
      syncAlgolia,
    ],
    afterDelete: [
      deleteAlgolia
    ]
  }
};
