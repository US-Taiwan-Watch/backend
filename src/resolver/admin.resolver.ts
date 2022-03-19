import { Ctx, Query, Resolver } from "type-graphql";
import { Auth0RoleName } from "../../common/models";
import { IApolloContext } from "../@types/common.interface";
import { Auth0Management } from "../auth0/auth0-management";
import { isTargetS2S } from "../util/auth-helper";

@Resolver()
export class AdminResolver {
  @Query(() => Boolean, { nullable: false })
  async isAdmin(@Ctx() ctx: IApolloContext): Promise<boolean> {
    if (
      ctx.currentUser &&
      ctx.currentUser.sub &&
      !isTargetS2S(ctx.currentUser)
    ) {
      const userId = ctx.currentUser.sub;
      const isAdmin = await Auth0Management.api.isAdmin(userId);
      return isAdmin;
    }
    return false;
  }

  @Query(() => [Auth0RoleName], { nullable: true })
  async myRoles(@Ctx() ctx: IApolloContext): Promise<Auth0RoleName[] | null> {
    if (ctx.currentUser && ctx.currentUser.sub) {
      const userId = ctx.currentUser.sub;
      const roles = await Auth0Management.api.getRoles(userId);
      return roles;
    }
    return null;
  }

  @Query(() => String, { nullable: true })
  public test() {
    return "Hello!";
  }
}
