import _ from "lodash";
import {
  Resolver,
  Query,
  Arg,
  FieldResolver,
  Root,
  Args,
  Info,
} from "type-graphql";
import {
  I18NText,
  Member,
  MemberRole,
  MemberRoleSnapshot,
} from "../../common/models";
import { MemberSyncer } from "../data-sync/member.sync";
import { getMergedMemberData } from "../helper/member.helper";
import { TableProvider } from "../mongodb/mongodb-manager";
import { MemberTable } from "./member-table";
import { PaginatedMembers, PaginationArgs } from "../util/pagination";
import { MemberFiltersInput } from "../../common/models/member.filters-input";
import { CongressUtils } from "../../common/utils/congress-utils";
import { GraphQLResolveInfo } from "graphql";

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
    @Arg("snapshotDate", { nullable: true }) _snapshotDate?: string,
  ): Promise<PaginatedMembers> {
    const tbl = await this.table();
    const query: any = {};
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
    @Arg("snapshotDate", { nullable: true }) _snapshotDate?: string,
  ): Promise<Member | null> {
    const tbl = await this.table();
    return await tbl.getMember(bioGuideId);
  }

  @FieldResolver(() => MemberRoleSnapshot, { nullable: true })
  public async congressRoleSnapshot(
    @Root() member: Member,
    @Info() info: GraphQLResolveInfo,
  ): Promise<MemberRoleSnapshot | null> {
    const date = info.variableValues.snapshotDate;
    if (!date) {
      return null;
    }
    const memberRoles = member.congressRoles || [];
    const congress = CongressUtils.getCongress(date);
    const memberRole = memberRoles.filter(
      role =>
        role.congressNumbers.includes(congress) &&
        role.startDate <= date &&
        role.endDate >= date,
    )[0];
    if (!memberRole) {
      return null;
    }
    return {
      ...memberRole,
      congressNumber: congress,
      party: memberRole.parties.filter(
        party => party.startDate <= date && party.endDate >= date,
      )[0]?.party,
    };
  }

  //TODO: @Query for member by name (fuzzy search)

  //
  // Field Resolvers
  //

  @FieldResolver(() => I18NText, { nullable: true })
  displayName(@Root() member: Member): I18NText {
    const en = [member.firstName, member.lastName]
      .filter(s => !!s)
      .join(" ");
    const zh =
      [member.firstName_zh, member.lastName_zh]
        .filter(s => !!s)
        .join("·") || en;
    return { en, zh };
  }

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

  private async resolveMemberFields(member: Member): Promise<Member> {
    // (1) store outter member data as user data if it is different from sync-ed data: old data
    // (2) store mergedMember(with userData) as outter member: for query
    let outterData: any;
    let mergedDataWithoutUser: any;

    if (!member.userWroteMember) {
      member.userWroteMember = new Member(member.id);
    }

    outterData = member.firstName;
    mergedDataWithoutUser = getMergedMemberData(member, "firstName", true);
    if (!member.userWroteMember.firstName && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.firstName = outterData;
    }
    if (member.userWroteMember.firstName && mergedDataWithoutUser) {
      if (member.userWroteMember.firstName === mergedDataWithoutUser)
        delete member.userWroteMember.firstName;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] firstName conflict with userData > "${member.userWroteMember.firstName}" / "${mergedDataWithoutUser}"`);
    }
    member.firstName = getMergedMemberData(member, "firstName") || "";

    outterData = member.lastName;
    mergedDataWithoutUser = getMergedMemberData(member, "lastName", true);
    if (!member.userWroteMember.lastName && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.lastName = outterData;
    }
    if (member.userWroteMember.lastName && mergedDataWithoutUser) {
      if (member.userWroteMember.lastName === mergedDataWithoutUser)
        delete member.userWroteMember.lastName;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] lastName conflict with userData > "${member.userWroteMember.lastName}" / "${mergedDataWithoutUser}"`);
    }
    member.lastName = getMergedMemberData(member, "lastName") || "";

    outterData = member.nickname;
    mergedDataWithoutUser = getMergedMemberData(member, "nickname", true);
    if (!member.userWroteMember.nickname && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.nickname = outterData;
    }
    if (member.userWroteMember.nickname && mergedDataWithoutUser) {
      if (member.userWroteMember.nickname === mergedDataWithoutUser)
        delete member.userWroteMember.nickname;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] nickname conflict with userData > "${member.userWroteMember.nickname}" / "${mergedDataWithoutUser}"`);
    }
    member.nickname = getMergedMemberData(member, "nickname") || "";

    outterData = member.firstName_zh;
    mergedDataWithoutUser = getMergedMemberData(member, "firstName_zh", true);
    if (!member.userWroteMember.firstName_zh && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.firstName_zh = outterData;
    }
    if (member.userWroteMember.firstName_zh && mergedDataWithoutUser) {
      if (member.userWroteMember.firstName_zh === mergedDataWithoutUser)
        delete member.userWroteMember.firstName_zh;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] firstName_zh conflict with userData > "${member.userWroteMember.firstName_zh}" / "${mergedDataWithoutUser}"`);
    }
    member.firstName_zh = getMergedMemberData(member, "firstName_zh") || "";

    outterData = member.lastName_zh;
    mergedDataWithoutUser = getMergedMemberData(member, "lastName_zh", true);
    if (!member.userWroteMember.lastName_zh && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.lastName_zh = outterData;
    }
    if (member.userWroteMember.lastName_zh && mergedDataWithoutUser) {
      if (member.userWroteMember.lastName_zh === mergedDataWithoutUser)
        delete member.userWroteMember.lastName_zh;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] lastName_zh conflict with userData > "${member.userWroteMember.lastName_zh}" / "${mergedDataWithoutUser}"`);
    }
    member.lastName_zh = getMergedMemberData(member, "lastName_zh") || "";

    outterData = member.gender;
    mergedDataWithoutUser = getMergedMemberData(member, "gender", true);
    if (!member.userWroteMember.gender && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.gender = outterData;
    }
    if (member.userWroteMember.gender && mergedDataWithoutUser) {
      if (member.userWroteMember.gender === mergedDataWithoutUser)
        delete member.userWroteMember.gender;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] gender conflict with userData > "${member.userWroteMember.gender}" / "${mergedDataWithoutUser}"`);
    }
    member.gender = getMergedMemberData(member, "gender") || "";

    outterData = member.birthday;
    mergedDataWithoutUser = getMergedMemberData(member, "birthday", true);
    if (!member.userWroteMember.birthday && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.birthday = outterData;
    }
    if (member.userWroteMember.birthday && mergedDataWithoutUser) {
      if (member.userWroteMember.birthday === mergedDataWithoutUser)
        delete member.userWroteMember.birthday;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] birthday conflict with userData > "${member.userWroteMember.birthday}" / "${mergedDataWithoutUser}"`);
    }
    member.birthday = getMergedMemberData(member, "birthday") || "";

    outterData = member.website;
    mergedDataWithoutUser = getMergedMemberData(member, "website", true);
    if (!member.userWroteMember.website && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.website = outterData;
    }
    if (member.userWroteMember.website && mergedDataWithoutUser) {
      if (member.userWroteMember.website === mergedDataWithoutUser)
        delete member.userWroteMember.website;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] website conflict with userData > "${member.userWroteMember.website}" / "${mergedDataWithoutUser}"`);
    }
    member.website = getMergedMemberData(member, "website") || "";

    outterData = member.office;
    mergedDataWithoutUser = getMergedMemberData(member, "office", true);
    if (!member.userWroteMember.office && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.office = outterData;
    }
    if (member.userWroteMember.office && mergedDataWithoutUser) {
      if (member.userWroteMember.office === mergedDataWithoutUser)
        delete member.userWroteMember.office;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] office conflict with userData > "${member.userWroteMember.office}" / "${mergedDataWithoutUser}"`);
    }
    member.office = getMergedMemberData(member, "office") || "";

    outterData = member.phone;
    mergedDataWithoutUser = getMergedMemberData(member, "phone", true);
    if (!member.userWroteMember.phone && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.phone = outterData;
    }
    if (member.userWroteMember.phone && mergedDataWithoutUser) {
      if (member.userWroteMember.phone === mergedDataWithoutUser)
        delete member.userWroteMember.phone;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] phone conflict with userData > "${member.userWroteMember.phone}" / "${mergedDataWithoutUser}"`);
    }
    member.phone = getMergedMemberData(member, "phone") || "";

    outterData = member.cspanId;
    mergedDataWithoutUser = getMergedMemberData(member, "cspanId", true);
    if (!member.userWroteMember.cspanId && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.cspanId = outterData;
    }
    if (member.userWroteMember.cspanId && mergedDataWithoutUser) {
      if (member.userWroteMember.cspanId === mergedDataWithoutUser)
        delete member.userWroteMember.cspanId;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] cspanId conflict with userData > "${member.userWroteMember.cspanId}" / "${mergedDataWithoutUser}"`);
    }
    member.cspanId = getMergedMemberData(member, "cspanId") || "";

    outterData = member.twitterId;
    mergedDataWithoutUser = getMergedMemberData(member, "twitterId", true);
    if (!member.userWroteMember.twitterId && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.twitterId = outterData;
    }
    if (member.userWroteMember.twitterId && mergedDataWithoutUser) {
      if (member.userWroteMember.twitterId === mergedDataWithoutUser)
        delete member.userWroteMember.twitterId;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] twitterId conflict with userData > "${member.userWroteMember.twitterId}" / "${mergedDataWithoutUser}"`);
    }
    member.twitterId = getMergedMemberData(member, "twitterId") || "";

    outterData = member.facebookId;
    mergedDataWithoutUser = getMergedMemberData(member, "facebookId", true);
    if (!member.userWroteMember.facebookId && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.facebookId = outterData;
    }
    if (member.userWroteMember.facebookId && mergedDataWithoutUser) {
      if (member.userWroteMember.facebookId === mergedDataWithoutUser)
        delete member.userWroteMember.facebookId;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] facebookId conflict with userData > "${member.userWroteMember.facebookId}" / "${mergedDataWithoutUser}"`);
    }
    member.facebookId = getMergedMemberData(member, "facebookId") || "";

    outterData = member.youtubeId;
    mergedDataWithoutUser = getMergedMemberData(member, "youtubeId", true);
    if (!member.userWroteMember.youtubeId && outterData) {
      // [temp]  backup original data as user wrote data
      member.userWroteMember.youtubeId = outterData;
    }
    if (member.userWroteMember.youtubeId && mergedDataWithoutUser) {
      if (member.userWroteMember.youtubeId === mergedDataWithoutUser)
        delete member.userWroteMember.youtubeId;    // user data is the same as sync-ed data => no need to keep it
      else
        console.log(`[Resolve][${member.id}] youtubeId conflict with userData > "${member.userWroteMember.youtubeId}" / "${mergedDataWithoutUser}"`);
    }
    member.youtubeId = getMergedMemberData(member, "youtubeId") || "";

    // profile Pic is directly sync to outter member, no need to resolve

    if (!member.userWroteMember.congressRoles && member.congressRoles) {
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
      await this.resolveMemberFields(member);

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
