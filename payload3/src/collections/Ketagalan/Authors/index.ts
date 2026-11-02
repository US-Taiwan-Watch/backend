import { cmsAdminOnly } from '../../../access/cmsAccess';
import { CollectionConfig } from 'payload'

export const KetagalanAuthors: CollectionConfig = {
  slug: 'ketagalan-authors',
  labels: {
    singular: 'Ketagalan - Author',
    plural: 'Ketagalan - Author',
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
