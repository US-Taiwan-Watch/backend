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
    return true;
  }

  @Query(() => [Member], { nullable: false })
  public async members(
    @Arg('bioGuideIds', () => [String], { nullable: true }) bioGuideIds: string[] | null = null
  ): Promise<Member[]> {
    const tbl = await this.table();
    if (!bioGuideIds) {
      return await tbl.getAllMembers();
    }
    return await tbl.getMembers(bioGuideIds);
  }

  @Query(() => Member, { nullable: true })
  public async member(@Arg("bioGuideId") bioGuideId: string): Promise<Member | null> {
    const tbl = await this.table();
    return await tbl.getMember(bioGuideId);
  }

  //TODO: @Query for member by name (fuzzy search)

  // get all members and update data from APIs
  public async fetchAndSyncAllMembers(): Promise<Member[]> {
    const members = await MemberSyncer.getAllMembers();
    return await this.syncMembers(members, true);
  }

  // get members of specific congress and update data from external sources
  public async fetchAndSyncMemberByCongress(chamber: 'senate' | 'house', congressNum: number): Promise<Member[]> {
    const members = await MemberSyncer.getMemberList(chamber, congressNum);
    return await this.syncMembers(members, true);
  }

  // get the given member (by ID) and update data from external sources
  public async fetchAndSyncMemberById(reqId: string): Promise<Member | null> {
    return await this.syncMember(new Member(reqId), new Member(reqId), true);
  }

  // get the given member (by ID) and update data with what given
  public async updateMemberWithData(memberData: Member): Promise<Member | null> {
    return await this.syncMember(new Member(memberData.id), memberData, true);
  }

  private async syncMember(member: Member, memberData: Member, isFromDB: boolean): Promise<Member> {
    // member - the based data for member sync (overwritten by data in DB if isFromDB is true)
    // memberData - the data requested to be overwritten onto member
    if (isFromDB) {
      member = await this.member(member.id) || member;
    }

    try {
      await new MemberSyncer(member, memberData).sync();

      if (MemberResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceMember(member);
      }
    } catch (e) {
      console.log(`Cannot sync member ${member.id}`);
    }
    return member;
  }

  private async syncMembers(members: Member[], isFromDB: Boolean): Promise<Member[]> {
    // Get existing members from DB
    if (isFromDB) {
      const tbl = await this.table();
      const existingMembers = await tbl.getMembers(members.map(m => m.id));
      // Merge fields from updated over existing ones
      members = members.map(um => ({ ...existingMembers.find(em => em.id === um.id), ...um }));
    }

    // Fetch from the united states source in advance for caching
    await MemberSyncer.getAllMembers();

    // Fetch extra fields individually
    members = await Promise.all(members.map(member =>
      // Add some fields
      this.syncMember(member, new Member(member.id), false)
    ));

    return members;
  }
}