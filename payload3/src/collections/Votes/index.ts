import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from 'payload'
import { setMidnight } from '../Peoples/hooks/beforeChange';
import { TYPE_OPTIONS } from '../../configs/vote';
import { DATETIME_PRECISION_OPTIONS } from '../../configs/people';

export const Votes: CollectionConfig = {
  slug: 'votes',
  labels: {
    singular: 'Vote',
    plural: 'Vote',
  },
  admin: {
    useAsTitle: "voteNumber",
    defaultColumns: ["voteNumber", "amendmentAuthor", "question", "bill"],
    listSearchableFields: ["voteNumber"],
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  fields: [
    {
      name: "rollCall",
      label: "Roll Call Number",
      type: "number",
      required: true,
      validate: (value) => {
        if (value > 0) {
          return true;
        } else {
          return "Roll Call Number must be a positive number";
        }
      },
      admin: { position: "sidebar" },
    },
    {
      name: "congress",
      label: "Congress Number",
      type: "number",
      required: true,
      validate: (value) => {
        if (value > 0) {
          return true;
        } else {
          return "Congress Number must be a positive number";
        }
      },
      admin: { position: "sidebar" },
    },
    {
      name: "session",
      label: "Session Number",
      type: "number",
      required: true,
      validate: (value) => {
        if (value > 0) {
          return true;
        } else {
          return "Session Number must be a positive number";
        }
      },
      admin: { position: "sidebar" },
    },
    {
      name: "voteNumber",
      label: "Vote Number",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "type",
      label: "Vote Type",
      type: "select",
      options: TYPE_OPTIONS,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      label: "Status",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "votedAt",
      label: " ",
      type: "group",
      admin: {
        position: "sidebar",
        disableListColumn: true,
        style: { border: "none", padding: 0, margin: 0 },
      },
      fields: [
        {
          name: "datetime",
          label: "Voted Date",
          type: "date",
          required: true,
          admin: { style: { marginTop: -10 } },
          hooks: { beforeChange: [setMidnight] },
        },
        {
          name: "precision",
          label: "Voted Precision",
          type: "select",
          options: DATETIME_PRECISION_OPTIONS,
          hasMany: true,
          required: true,
          // admin: { hidden: true },
          admin: { style: { marginTop: 25, marginBottom: 25 } },
          defaultValue: ["year", "month", "day"],
        },
      ],
    },
    {
      name: "link",
      label: "Link",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "question",
      label: "Question",
      type: "text",
      required: true
    },
    {
      name: "amendmentAuthor",
      label: "Amendment Author",
      type: "relationship",
      relationTo: "peoples",
      required: true,
      hasMany: false,
    },
    {
      name: "result",
      label: "Result",
      type: "json",
      required: false,
    },
    {
      name: "bill",
      label: "Bill",
      type: "relationship",
      relationTo: "bills",
      required: true,
      hasMany: false,
    },
  ],
}
