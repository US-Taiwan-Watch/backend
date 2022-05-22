import _ from "lodash";
import { Resolver, Query, Arg } from "type-graphql";
import { Member } from "../../common/models";
import { MemberSyncer } from "../data-sync/member.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { MemberTable } from "./member-table";

@Resolver(Member)
export class MemberResolver extends TableProvider(MemberTable) {
  // TODO: false for debugging. Should be true while in real use
  private static shouldSave() {
    return false;
  }

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

  // For one-time use
  public async fetchAndSyncAllMembers(): Promise<Member[]> {
    const members = await MemberSyncer.fetchAll();
    return await this.syncMembers(members, true);
  }

  public async fetchAndSyncUpdatedMembers(): Promise<Member[]> {
    const members = await MemberSyncer.fetchUpdated();
    return await this.syncMembers(members, true);
  }

  public async syncMemberWithId(bioGuideId: string, fields?: (keyof Member)[]): Promise<Member | null> {
    return await this.syncMember({ id: bioGuideId }, true, fields);
  }

  private async syncMember(member: Member, compareExisting: boolean, fields?: (keyof Member)[]): Promise<Member> {
    if (compareExisting) {
      member = await this.member(member.id) || member;
    }
    try {
      await new MemberSyncer(member, fields).sync();
      if (MemberResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceMember(member);
      }
      // TODO: save update to DB
    } catch (e) {
      console.log(`Cannot sync member ${member.id}`);
    }
    return member;
  }

  private async syncMembers(members: Member[], compareExisting: boolean, fields?: (keyof Member)[]): Promise<Member[]> {
    // Get existing members from DB
    if (compareExisting) {
      const tbl = await this.table();
      const existingMembers = await tbl.getMembers(members.map(m => m.id));
      // Merge fields from updated over existing ones
      members = members.map(um => ({ ...existingMembers.find(em => em.id === um.id), ...um }));
    }
    // Fetch extra fields individually
    members = await Promise.all(members.map(member =>
      // Add some fields
      this.syncMember(member, false, fields)
    ));
    return members;
  }
}