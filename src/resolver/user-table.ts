import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { User } from "../../common/models";
import * as _ from "lodash";

export class UserTable extends MongoDBTableBase("user") {
  public addUser(user: User) {
    return this.putItem(user);
  }

  public getUserById(id: string, ...attrNamesToGet: (keyof User)[]) {
    return this.getItem<User>("_id", id);
  }

  public getAllUsers(): Promise<User[]> {
    return this.getAllItems<User>();
  }

  public getUserByIdx(idx: string[]) {
    return _.isEmpty(idx)
      ? Promise.resolve([])
      : this.getItems<User>("_id", idx);
  }

  public updateUser(id: string, update: Partial<User>) {
    return this.updateItemByObjectId<User>(id, update);
  }

  public async createOrReplaceUser(user: User) {
    const existing = await this.getUserById(user.id);
    if (existing) {
      const { id, ...updateUser } = user;
      this.updateUser(user.id, updateUser);
    } else {
      this.addUser(user);
    }
  }
}
