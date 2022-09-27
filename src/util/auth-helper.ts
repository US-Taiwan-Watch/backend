import _ from "lodash";
import { AuthChecker } from "type-graphql";
import { Auth0RoleName } from "../../common/models";
import { IApolloContext } from "../@types/common.interface";
import { AdminResolver } from "../resolver/admin.resolver";
import config from "../config";

export const isTargetS2S = (currentUser: IApolloContext["currentUser"]) =>
  currentUser?.aud === config.auth.s2s.audience &&
  config.auth.s2s.client_id.includes(currentUser?.sub);

export const authChecker: AuthChecker<IApolloContext, Auth0RoleName> = async (
  { context },
  rolesTargets: Auth0RoleName[]
): Promise<boolean | never> => {
  if (isTargetS2S(context.currentUser)) {
    return rolesTargets.includes(Auth0RoleName.S2S);
  }
  const adminRsvr = new AdminResolver();
  const myRoles = (await adminRsvr.myRoles(context)) ?? [];
  return !_.isEmpty(rolesTargets)
    ? _.some(rolesTargets.map(target => myRoles.includes(target)))
    : !!context.currentUser;
};

export interface VerifyEmailTokenInput {
  userId: string;
  email: string;
}
