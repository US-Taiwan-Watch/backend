import _ from "lodash";
import { Resolver, Query, Ctx, Arg, Authorized, Mutation } from "type-graphql";
import { Auth0RoleName } from "../../common/models";
import { User } from "../../common/models/user.interface";
import { IApolloContext } from "../@types/common.interface";
import { TableProvider } from "../mongodb/mongodb-manager";
import { UserTable } from "./user-table";

@Resolver(User)
export class UserResolver extends TableProvider(UserTable) {
  // Non-Admin operations

  @Query(() => User, { nullable: true })
  async imUser(@Ctx() ctx: IApolloContext): Promise<User | null> {
    const userId = ctx.currentUser && ctx.currentUser.sub;
    if (userId) {
      const tbl = await this.table();
      const user = await tbl.getUserById(userId);
      return user;
    }
    return null;
  }

  @Authorized<Auth0RoleName>([Auth0RoleName.Admin])
  @Mutation(() => Boolean, { nullable: true })
  async createOrUpdateUser(
    @Arg("user_id") id: string,
    @Arg("email") email: string,
    @Arg("name", { nullable: true }) name?: string,
    @Arg("nickname", { nullable: true }) nickname?: string,
    @Arg("picture", { nullable: true }) picture?: string,
  ): Promise<boolean> {
    const user = <User>{
      id,
      email: _.isEmpty(email) ? undefined : email,
      name,
      nickname,
      picture,
    };
    const tbl = await this.table();
    await tbl.createOrReplaceUser(user);
    return true;
  }
}
