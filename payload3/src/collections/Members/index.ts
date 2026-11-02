import { cmsAdminOnly, cmsAdminOrCurrentMember } from '../../access/cmsAccess';
import { PROVIDER_OPTIONS } from '../../configs/member'
import { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    singular: 'Member',
    plural: 'Member',
  },
  // auth: true,
  access: {
    read: cmsAdminOrCurrentMember,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ["fullName", "email", "providerId"],
    listSearchableFields: ["fullName"],
  },
  fields: [
    {
      name: "provider",
      label: "Provider",
      type: "select",
      options: PROVIDER_OPTIONS,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "providerId",
      label: "Provider Id",
      type: "text",
      required: true,
      unique: true,
      admin: { position: "sidebar" },
    },
    {
      name: "fullName",
      label: "Full Name",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "email",
      label: "Email",
      type: "text",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "subscribeBills",
      label: "Subscribe Bills",
      type: "relationship",
      relationTo: "bills",
      hasMany: true,
    },
    {
      name: "subscribePeoples",
      label: "Subscribe Peoples",
      type: "relationship",
      relationTo: "peoples",
      hasMany: true,
    },
    {
      name: "bookmarkUstwArticles",
      label: "Bookmark USTW Articles",
      type: "relationship",
      relationTo: "ustw-articles",
      hasMany: true,
    },
    {
      name: "bookmarkKetagalanArticles",
      label: "Bookmark Ketagalan Articles",
      type: "relationship",
      relationTo: "ketagalan-articles",
      hasMany: true,
    },
    {
      name: "submittedTaiwanRecords",
      label: "Submitted Taiwan Records",
      type: "relationship",
      relationTo: "taiwan-records",
      hasMany: true,
      hidden: true,
    },
    {
      name: "notificationSetting",
      label: "Notification Setting",
      type: "group",
      fields: [
        {
          name: "billRelease",
          label: "Bill Release",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "ustwArticleRelease",
          label: "USTW Article Release",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "ketagalanArticleRelease",
          label: "Ketagalan Article Release",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "podcastRelease",
          label: "Podcast Release",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "subscribedBillUpdate",
          label: "Subscribed Bill Update",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "subscribedPeopleUpdate",
          label: "Subscribed People Update",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "newsletter",
          label: "Subscribe to Newsletter",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    }
  ],
}
