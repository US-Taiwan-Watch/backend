import { ApolloError } from "apollo-server";
import _ from "lodash";
import { Resolver, Query, Ctx, Arg, Authorized, Mutation } from "type-graphql";
import { Auth0RoleName } from "../../common/models";
import { User } from "../../common/models/user.interface";
import { IApolloContext } from "../@types/common.interface";
import { Auth0Management } from "../auth0/auth0-management";
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

  @Query(() => User)
  async getUser(@Arg("user_id") id: string): Promise<User | null> {
    const tbl = await this.table();
    return await tbl.getUserById(id);
  }

  @Query(() => [User])
  async getUsers(
    @Arg("user_id", () => [String]) idx: string[],
  ): Promise<User[]> {
    const tbl = await this.table();
    return await tbl.getUserByIdx(idx);
  }

  @Authorized<Auth0RoleName>([Auth0RoleName.Admin, Auth0RoleName.Editor])
  @Query(() => [User])
  async editors(): Promise<User[]> {
    async function userRoles(user: User) {
      const roles = await Auth0Management.api.getRoles(user.id);
      return { user, roles };
    }

    const tbl = await this.table();
    const users = await tbl.getAllUsers();
    const usersWithRoles = await Promise.all(
      users.map(user => userRoles(user)),
    );

    return usersWithRoles
      .filter(ur => ur.roles.includes(Auth0RoleName.Editor))
      .map(ur => ({ ...ur.user, name: ur.user.name || ur.user.email }));
  }

  @Authorized()
  @Mutation(() => User)
  async updateUser(
    @Ctx() ctx: IApolloContext,
    @Arg("name", { nullable: true }) name?: string,
    @Arg("nickname", { nullable: true }) nickname?: string,
    @Arg("picture", { nullable: true }) picture?: string,
  ): Promise<User> {
    const userId = ctx.currentUser.sub;
    const actions = [];
    let userInfo: User = { id: userId };

    if (name) {
      actions.push(
        Auth0Management.api.changeName(userId, name).then(suc => {
          if (suc) {
            userInfo = { ...userInfo, name };
          }
        }),
      );
    }
    if (nickname) {
      actions.push(
        Auth0Management.api.changeNickname(userId, nickname).then(suc => {
          if (suc) {
            userInfo = { ...userInfo, nickname };
          }
        }),
      );
    }
    if (picture) {
      actions.push(
        Auth0Management.api.changePicture(userId, picture).then(suc => {
          if (suc) {
            userInfo = { ...userInfo, picture };
          }
        }),
      );
    }
    await Promise.all(actions);

    const tbl = await this.table();
    await tbl.createOrReplaceUser(userInfo);
    const user = await this.imUser(ctx);
    if (!user) {
      throw new ApolloError("Server erorr");
    }
    return user;
  }
}
