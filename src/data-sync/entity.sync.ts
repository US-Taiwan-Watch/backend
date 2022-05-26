export abstract class EntitySyncer<T> {
  constructor(protected entity: T, protected fields?: (keyof T)[]) { }

  public async sync(): Promise<T> {
    try {
      await this.syncImpl();
    } catch (e) {
    }
    return this.entity;
  }

  protected abstract syncImpl(): Promise<void>;
}
