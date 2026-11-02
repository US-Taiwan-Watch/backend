import path from 'node:path';
import { createProductionMediaHooks } from '../../runtime/media';
import { cmsAdminOnly } from '../../access/cmsAccess';
import { CollectionConfig } from 'payload'

const hooks = createProductionMediaHooks("media-project", "AZURE_STORAGE_CONTAINER_NAME_PROJECT");

const Media: CollectionConfig = {
  slug: 'media-project',
  labels: {
    singular: 'Media - Project',
    plural: 'Media - Project'
  },
  access: {
    read: () => true,
    create: cmsAdminOnly,
    update: cmsAdminOnly,
    delete: cmsAdminOnly,
  },
  upload: {
    disableLocalStorage: true,
    staticDir: path.resolve(process.cwd(), "runtime-storage/media-project"),
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
