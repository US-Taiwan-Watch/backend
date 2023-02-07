import { ApolloError } from "apollo-server";
import _ from "lodash";
import { Resolver, Query, Ctx, Arg, Authorized, Mutation } from "type-graphql";
import { Auth0RoleName, Tag } from "../../common/models";
import { User } from "../../common/models/user.interface";
import { IApolloContext } from "../@types/common.interface";
import { Auth0Management } from "../auth0/auth0-management";
import { NotionTagSyncer } from "../data-sync/notion.tag.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { TagTable } from "./tag-table";
import { UserTable } from "./user-table";

@Resolver(Tag)
export class TagResolver extends TableProvider(TagTable) {
  public async insertTags() {
    const tbl = await this.table();
    const tags = await tbl.getAllTags();
    const result = await new NotionTagSyncer().create(tags[0]);
    console.log(result);
  }
}
