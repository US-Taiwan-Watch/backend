import { cmsAdminOnly } from '../../../access/cmsAccess';
import { CollectionConfig } from 'payload'

export const UstwAuthors: CollectionConfig = {
  slug: 'ustw-authors',
  labels: {
    singular: 'USTW - Author',
    plural: 'USTW - Author',
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name"],
    listSearchableFields: ["name"],
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  fields: [
    {
      name: "name",
      label: "Full Name",
      type: "text",
      required: true,
    },
    {
      name: "bio",
      label: "Bio",
      type: "textarea",
      required: true,
    },
  ],
}
