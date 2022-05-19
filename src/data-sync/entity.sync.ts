export abstract class EntitySyncer<T> {
  constructor(protected entity: T, protected fields?: (keyof T)[]) { }

  abstract sync(): Promise<T>;
}
