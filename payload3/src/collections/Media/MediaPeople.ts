import path from 'node:path';
import { createProductionMediaHooks } from '../../runtime/media';
import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from 'payload'

const hooks = createProductionMediaHooks("media-people", "AZURE_STORAGE_CONTAINER_NAME_PEOPLE");

const Media: CollectionConfig = {
  slug: 'media-people',
  labels: {
    singular: 'Media - People',
    plural: 'Media - People'
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  upload: {
    // staticURL: '/media',
    // staticDir: 'media',
    disableLocalStorage: true,
    staticDir: path.resolve(process.cwd(), "runtime-storage/media-people"),
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
