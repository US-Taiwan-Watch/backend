import { CollectionConfig } from 'payload'
import { enforceRecordChange, recordRead, recordCreate, recordUpdate } from '../../access/records';
import { cmsAdminOnly } from '../../access/cmsAccess';
import { STATUS_OPTIONS } from '../../configs/taiwan-record';
import { approveHandler } from './endpoints/approve';
import { rejectHandler } from './endpoints/reject';
import { unpublishHandler } from './endpoints/unpublish';

export const TaiwanRecords: CollectionConfig = {
  slug: 'taiwan-records',
  labels: {
    singular: 'Taiwan Record',
    plural: 'Taiwan Record',
  },
  admin: {
    useAsTitle: 'title',
    components: {
      // views: {
      //   Edit: {
      //     MyCustomTab: {
      //       Component: ApproveButton,
      //       path: '/taiwan-records/approve',
      //       Tab: ApproveButton
      //     },
      //     MyCustomTab2: {
      //       Component: RejectButton,
      //       path: '/taiwan-records/reject',
      //       Tab: RejectButton
      //     },
      //   }
      // }
      edit: {
        SaveButton: "/components/recordReviewSection#default",
      }
    },
    defaultColumns: ["title", "status", "people"],
    listSearchableFields: ["title"],
  },
  access: {
    read: recordRead,
    create: recordCreate,
    update: recordUpdate,
    delete: cmsAdminOnly,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true
    },
    {
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: 'people',
      label: "People",
      type: 'relationship',
      relationTo: 'peoples',
      hasMany: false,
      required: true,
      admin: {
        position: "sidebar"
      },
    },
    {
      name: 'author',
      label: "Author",
      type: 'relationship',
      relationTo: 'members',
      hasMany: false,
      admin: {
        readOnly: true,
        position: "sidebar"
      },
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      required: true,
      defaultValue: "drafted",
      admin: {
        readOnly: true,
        position: "sidebar"
      },
    },
    {
      type: "collapsible",
      label: "Sources",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'sources',
          label: ' ',
          type: 'array',
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "link",
              label: "Link",
              type: "text",
              required: true,
            },
          ],
        },
      ]
    },
    {
      type: "collapsible",
      label: "Photos",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'photos',
          label: ' ',
          type: 'array',
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: 'photo',
              label: 'Photo',
              type: 'upload',
              relationTo: 'media-taiwan-record',
              required: true,
            },
          ],
        },
      ]
    },
    {
      type: "collapsible",
      label: "Versions",
      admin: {
        initCollapsed: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'versions',
          label: ' ',
          type: 'array',
          admin: {
            disableListColumn: true
          },
          fields: [
            {
              name: "version",
              label: "Version",
              type: "number",
              required: true,
              validate: (value) => {
                if (value > 0) {
                  return true;
                } else {
                  return "Version Number must be a positive number";
                }
              },
            },
            {
              name: "data",
              label: "Data",
              type: "json"
            },
            {
              name: "approvedAt",
              label: "Approved At",
              type: "date",
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
              },
            },
          ],
        },
      ]
    }
  ],
  hooks: {
    beforeChange: [enforceRecordChange]
  },
  endpoints: [
    {
      path: '/approve/:id',
      method: 'post',
      handler: approveHandler
    },
    {
      path: '/reject/:id',
      method: 'post',
      handler: rejectHandler
    },
    {
      path: '/unpublish/:id',
      method: 'post',
      handler: unpublishHandler
    }
  ],
}
