import _ from "lodash";
import { Resolver, Query, Arg } from "type-graphql";
import { Member } from "../../common/models";
import { MemberSyncer } from "../data-sync/member.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { MemberTable } from "./member-table";

@Resolver(Member)
export class MemberResolver extends TableProvider(MemberTable) {
  @Query(() => [Member], { nullable: false })
  public async members(): Promise<Member[]> {
    const tbl = await this.table();
    return await tbl.getAllMembers();
  }

  @Query(() => Member, { nullable: true })
  public async member(@Arg("bioGuideId") bioGuideId: string): Promise<Member | null> {
    const tbl = await this.table();
    return await tbl.getMember(bioGuideId);
  }

  public async syncMember(member: Member, fields: (keyof Member)[]): Promise<Member> {
    return await new MemberSyncer().sync(member, fields);
  }

  public async syncMemberWithKey(bioGuideId: string, fields: (keyof Member)[]): Promise<Member | null> {
    let member = await this.member(bioGuideId);
    if (!member) {
      return null;
    }
    new MemberSyncer().sync(member, fields);
    // TODO: save update to DB
    return member;
  }

  // public async syncAllmember(fields: (keyof member)[]) {
  //   let allmembers = await this.getAllmembers();
  //   allmembers.forEach(async member =>
  //     await this.syncmember(member, fields)
  //   );
  // }

}
