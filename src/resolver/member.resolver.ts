import _ from "lodash";
import { Resolver, Query, Arg, FieldResolver, Root, Args } from "type-graphql";
import { Member, MemberRole } from "../../common/models";
import { MemberSyncer } from "../data-sync/member.sync";
import { getMergedMemberData } from "../helper/member.helper";
import { TableProvider } from "../mongodb/mongodb-manager";
import { MemberTable } from "./member-table";
import { PaginatedMembers, PaginationArgs } from "../util/pagination";
import { MemberFiltersInput } from "../../common/models/member.filters-input";

@Resolver(Member)
export class MemberResolver extends TableProvider(MemberTable) {
  private static shouldSave() {
    // false for debugging (won't update DB). Should be true while in real use
    return true;
  }

  @Query(() => PaginatedMembers, { nullable: false })
  public async members(
    @Args() pageInfo: PaginationArgs,
    @Arg("filters", { nullable: true }) filters?: MemberFiltersInput,
  ): Promise<PaginatedMembers> {
    const tbl = await this.table();
    let query: any = {};
    if (filters?.bioGuideIds) {
      query["_id"] = { $in: filters.bioGuideIds };
    }
    if (filters?.congress) {
      query["congressRoles.congressNumbers"] = filters.congress;
    }
    if (filters?.state) {
      query["congressRoles.state"] = filters.state;
    }
    const [members, count] = await tbl.queryItemsWithTotalCount<Member>(
      query,
      pageInfo.offset,
      pageInfo.limit,
    );
    return new PaginatedMembers(pageInfo, members, true, count);
  }

  @Query(() => Member, { nullable: true })
  public async member(
    @Arg("bioGuideId") bioGuideId: string,
  ): Promise<Member | null> {
    const tbl = await this.table();
    return await tbl.getMember(bioGuideId);
  }

  //TODO: @Query for member by name (fuzzy search)

  //
  // Public Functions
  //

  // get all members and update data from APIs
  public async fetchAndSyncAllMembers(): Promise<Member[]> {
    const members = await MemberSyncer.getAllMembers();
    return await this.syncMembers(members, true);
  }

  // get members of specific congress and update data from external sources
  public async fetchAndSyncMemberByCongress(
    chamber: "senate" | "house",
    congressNum: number,
  ): Promise<Member[]> {
    const members = await MemberSyncer.getMemberList(chamber, congressNum);
    return await this.syncMembers(members, true);
  }

  // get the given member (by ID) and update data from external sources
  public async fetchAndSyncMemberById(reqId: string): Promise<Member | null> {
    return await this.syncMember(new Member(reqId), new Member(reqId), true);
  }

  // get the given member (by ID) and update data with what given
  public async updateMemberWithData(
    memberData: Member,
  ): Promise<Member | null> {
    return await this.syncMember(new Member(memberData.id), memberData, true);
  }

  //
  // Private Functions
  //

  private resolveMemberFields(member: Member): Member {
    // (1) store outter member data as user data if it is different from sync-ed data: old data
    // (2) store mergedMember(with userData) as outter member: for query
    let outterData: any;
    let mergedDataWithoutUser: any;

    if (!member.userWroteMember) {
      member.userWroteMember = new Member(member.id);
    }

    outterData = member.firstName;
    mergedDataWithoutUser = getMergedMemberData(member, "firstName", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] firstName conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.firstName = outterData;
    }
    member.firstName = getMergedMemberData(member, "firstName") || "";

    outterData = member.lastName;
    mergedDataWithoutUser = getMergedMemberData(member, "lastName", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] lastName conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.lastName = outterData;
    }
    member.lastName = getMergedMemberData(member, "lastName") || "";

    outterData = member.nickname;
    mergedDataWithoutUser = getMergedMemberData(member, "nickname", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] nickname conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.nickname = outterData;
    }
    member.nickname = getMergedMemberData(member, "nickname") || "";

    outterData = member.firstName_zh;
    mergedDataWithoutUser = getMergedMemberData(member, "firstName_zh", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] firstName_zh conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.firstName_zh = outterData;
    }
    member.firstName_zh = getMergedMemberData(member, "firstName_zh") || "";

    outterData = member.lastName_zh;
    mergedDataWithoutUser = getMergedMemberData(member, "lastName_zh", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] lastName_zh conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.lastName_zh = outterData;
    }
    member.lastName_zh = getMergedMemberData(member, "lastName_zh") || "";

    outterData = member.gender;
    mergedDataWithoutUser = getMergedMemberData(member, "gender", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] gender conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.gender = outterData;
    }
    member.gender = getMergedMemberData(member, "gender") || "";

    outterData = member.birthday;
    mergedDataWithoutUser = getMergedMemberData(member, "birthday", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] birthday conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.birthday = outterData;
    }
    member.birthday = getMergedMemberData(member, "birthday") || "";

    outterData = member.website;
    mergedDataWithoutUser = getMergedMemberData(member, "website", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] website conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.website = outterData;
    }
    member.website = getMergedMemberData(member, "website") || "";

    outterData = member.office;
    mergedDataWithoutUser = getMergedMemberData(member, "office", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] office conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.office = outterData;
    }
    member.office = getMergedMemberData(member, "office") || "";

    outterData = member.phone;
    mergedDataWithoutUser = getMergedMemberData(member, "phone", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] phone conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.phone = outterData;
    }
    member.phone = getMergedMemberData(member, "phone") || "";

    outterData = member.cspanId;
    mergedDataWithoutUser = getMergedMemberData(member, "cspanId", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] cspanId conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.cspanId = outterData;
    }
    member.cspanId = getMergedMemberData(member, "cspanId") || "";

    outterData = member.twitterId;
    mergedDataWithoutUser = getMergedMemberData(member, "twitterId", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] twitterId conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.twitterId = outterData;
    }
    member.twitterId = getMergedMemberData(member, "twitterId") || "";

    outterData = member.facebookId;
    mergedDataWithoutUser = getMergedMemberData(member, "facebookId", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] facebookId conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.facebookId = outterData;
    }
    member.facebookId = getMergedMemberData(member, "facebookId") || "";

    outterData = member.youtubeId;
    mergedDataWithoutUser = getMergedMemberData(member, "youtubeId", true);
    if (outterData && outterData !== mergedDataWithoutUser) {
      console.log(`[Resolve][${member.id}] youtubeId conflict > "${outterData}" / "${mergedDataWithoutUser}"`);
      member.userWroteMember.youtubeId = outterData;
    }
    member.youtubeId = getMergedMemberData(member, "youtubeId") || "";

    // profile Pic is directly sync to outter member, no need to resolve

    if (member.congressRoles && !member.userWroteMember.congressRoles) {
      member.userWroteMember.congressRoles = member.congressRoles;
    }
    member.congressRoles = getMergedMemberData(member, "congressRoles") || [];

    return member;
  }

  private async syncMember(
    member: Member,
    memberData: Member,
    isFromDB: boolean,
  ): Promise<Member> {
    // member - the based data for member sync (overwritten by data in DB if isFromDB is true)
    // memberData - the data requested to be overwritten onto member
    if (isFromDB) {
      member = (await this.member(member.id)) || member;
    }

    try {
      await new MemberSyncer(member, memberData).sync();

      // update sync result in resolved member field
      this.resolveMemberFields(member);

      if (MemberResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceMember(member);
      }
    } catch (e) {
      console.log(`Cannot sync member ${member.id}`);
    }
    return member;
  }

  private async syncMembers(
    members: Member[],
    isFromDB: boolean,
  ): Promise<Member[]> {
    // Get existing members from DB
    if (isFromDB) {
      const tbl = await this.table();
      const existingMembers = await tbl.getMembers(members.map(m => m.id));
      // Merge fields from updated over existing ones
      members = members.map(um => ({
        ...existingMembers.find(em => em.id === um.id),
        ...um,
      }));
    }

    // Fetch from the united states source in advance for caching
    await MemberSyncer.getAllMembers();

    // Fetch extra fields individually
    members = await Promise.all(
      members.map(member =>
        // Add some fields
        this.syncMember(member, new Member(member.id), false),
      ),
    );

    return members;
  }
}
