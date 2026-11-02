import path from 'node:path';
import { createProductionMediaHooks } from '../../runtime/media';
import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from 'payload'

const hooks = createProductionMediaHooks("media-member", "AZURE_STORAGE_CONTAINER_NAME_MEMBER");

const Media: CollectionConfig = {
  slug: 'media-member',
  labels: {
    singular: 'Media - Member',
    plural: 'Media - Member'
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  upload: {
    disableLocalStorage: true,
    staticDir: path.resolve(process.cwd(), "runtime-storage/media-member"),
    imageSizes: [
      {
        name: 'desktop',
        width: 1920,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'tablet',
        width: 1024,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'mobile',
        width: 414,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'thumbnail',
        width: 300,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  hooks
}

export default Media
