export abstract class EntitySyncer<T> {
  constructor(protected entity: T, protected fields?: (keyof T)[]) { }

  public async sync(): Promise<boolean> {
    return await this.syncImpl();
  }

  protected abstract syncImpl(): Promise<boolean>;
}
