import type { Access } from 'payload';

/** Editorial writes require a Payload CMS administrator, not a site member. */
export const cmsAdminOnly: Access = ({ req }) => req.user?.collection === 'users';

/** Auth0 members may read only their own profile; CMS administrators may manage all. */
export const cmsAdminOrCurrentMember: Access = ({ req }) => {
  if (req.user?.collection === 'users') return true;
  // The custom identity strategy returns a non-password member collection.
  // Payload's generated user type includes password-auth collections only.
  const member = req.user as unknown as { collection?: string; providerId?: string; id?: string };
  if (member?.collection === 'members' && member.providerId && member.id) return { id: { equals: member.id } };
  return false;
};
