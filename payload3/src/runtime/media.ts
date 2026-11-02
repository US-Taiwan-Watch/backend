import { azureStorage } from '@payloadcms/storage-azure';
import type { CollectionConfig } from 'payload';
import { isMember } from '../access/records';
import { MEDIA_CONTAINERS, STORAGE_ORIGIN, productionConfig } from './config';
export function storagePlugins() {
  const config = productionConfig();
  return Object.keys(MEDIA_CONTAINERS).map(slug => azureStorage({
    collections: { [slug]: { disablePayloadAccessControl: false } },
    connectionString: config.storageConnection, containerName: config.containers[slug],
    baseURL: STORAGE_ORIGIN, allowContainerCreate: false, containerAccess: 'private', clientUploads: false,
  }));
}
export function createProductionMediaHooks(slug: string, containerVariable: string): CollectionConfig['hooks'] {
  return {
    beforeChange: [({ data, operation, req }) => {
      if (req.file) data.prefix = 'payload3';
      if (operation === 'create' && slug === 'media-taiwan-record') {
        data.owner = isMember(req.user) ? req.user.id : undefined;
        data.publishedForRecord = false;
      }
      return data;
    }],
    afterRead: [({ doc }) => {
      if (doc.prefix === 'payload3' || slug === 'media-taiwan-record') {
        doc.thumbnailURL ||= doc.sizes?.thumbnail?.url || doc.sizes?.tablet?.url || doc.url;
        return doc;
      }
      // Preserve historical public URLs; submission media stays behind Payload access checks.
      const container = process.env[containerVariable];
      if (container && doc.filename) {
        const url = (filename: string) => `${STORAGE_ORIGIN}/${container}/${encodeURIComponent(filename)}`;
        doc.url = url(doc.filename);
        for (const size of Object.values(doc.sizes || {}) as any[]) if (size?.filename) size.url = url(size.filename);
        doc.thumbnailURL = url(doc.sizes?.thumbnail?.filename || doc.sizes?.tablet?.filename || doc.filename);
      }
      return doc;
    }],
  };
}
