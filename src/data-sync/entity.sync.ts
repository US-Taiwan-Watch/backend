export interface EntitySyncer<T> {
  sync(entity: T, fields: string[]): Promise<T>;
}
