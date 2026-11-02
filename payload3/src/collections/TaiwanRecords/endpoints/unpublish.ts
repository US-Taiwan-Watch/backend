import { moderateRecord } from '../moderation';
export const unpublishHandler = moderateRecord('unpublish');
