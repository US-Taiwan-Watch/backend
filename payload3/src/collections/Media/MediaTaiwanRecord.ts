import { cmsAdminOnly } from '../../access/cmsAccess';
import { recordCreate, taiwanMediaRead } from '../../access/records';
import path from 'node:path';
import { createProductionMediaHooks } from '../../runtime/media';
import { CollectionConfig } from 'payload'

const hooks = createProductionMediaHooks("media-taiwan-record", "AZURE_STORAGE_CONTAINER_NAME_TAIWAN_RECORD");

const MediaTaiwanRecord: CollectionConfig = {
  slug: 'media-taiwan-record',
  labels: {
    singular: 'Media - Taiwan Record',
    plural: 'Media - Taiwan Record',
  },
  access: {
    read: taiwanMediaRead,
    create: recordCreate,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  upload: {
    // staticURL: '/media',
    // staticDir: 'media',
    disableLocalStorage: true,
    staticDir: path.resolve(process.cwd(), "runtime-storage/media-taiwan-record"),
    imageSizes: [
      {
        name: 'tablet',
        width: 1024,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'members', admin: { hidden: true }, access: { create: () => false, update: () => false } },
    { name: 'publishedForRecord', type: 'checkbox', defaultValue: false, admin: { hidden: true }, access: { create: () => false, update: () => false } },
    {
      name: 'alt',
      type: 'text',
    },
  ],
  hooks
}

export default MediaTaiwanRecord
