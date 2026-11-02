import { CollectionConfig } from 'payload'
import { cmsAdminOnly } from '../../access/cmsAccess';
import { memberStrategy } from '../../access/memberIdentity';

export const Admin: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Admin',
    plural: 'Admin',
  },
  auth: { strategies: [memberStrategy], cookies: { secure: true, sameSite: 'Lax' } },
  access: { admin: ({ req }) => req.user?.collection === 'users', read: cmsAdminOnly, create: cmsAdminOnly, update: cmsAdminOnly, delete: cmsAdminOnly },
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
