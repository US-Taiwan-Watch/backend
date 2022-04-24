export interface EntitySyncer<T> {
  sync(entity: T, fields: (keyof T)[]): Promise<T>;
}
