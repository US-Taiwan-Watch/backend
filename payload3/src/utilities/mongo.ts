import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import { APIError, type Payload } from 'payload';

export const mongoAdapter = (payload: Payload) => payload.db as MongooseAdapter;

// Aggregations do not use Mongoose's query casting. Use the adapter's BSON type.
export function mongoID(payload: Payload, id: string) {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) throw new APIError('Invalid document ID', 400);
  return new (mongoAdapter(payload).connection.base.Types.ObjectId)(id);
}

export function statisticsLimit(value: number | null | undefined, fallback: number) {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new APIError('Limit must be a positive integer', 400);
  return Math.min(value, 100);
}
