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
import { Member, MemberRole, MemberRoleSnapshot } from "../../common/models";
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
    const memberRoles = await this.congressRoles(member);
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

  @FieldResolver()
  async firstName(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "firstName") || "";
    return ans;
  }

  @FieldResolver()
  async lastName(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "lastName") || "";
    return ans;
  }

  @FieldResolver()
  async nickname(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "nickname") || "";
    return ans;
  }

  @FieldResolver()
  async firstName_zh(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "firstName_zh") || "";
    return ans;
  }

  @FieldResolver()
  async lastName_zh(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "lastName_zh") || "";
    return ans;
  }

  @FieldResolver()
  async gender(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "gender") || "";
    return ans;
  }

  @FieldResolver()
  async birthday(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "birthday") || "";
    return ans;
  }

  @FieldResolver()
  async website(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "website") || "";
    return ans;
  }

  @FieldResolver()
  async office(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "office") || "";
    return ans;
  }

  @FieldResolver()
  async phone(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "phone") || "";
    return ans;
  }

  @FieldResolver()
  async cspanId(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "cspanId") || "";
    return ans;
  }

  @FieldResolver()
  async twitterId(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "twitterId") || "";
    return ans;
  }

  @FieldResolver()
  async facebookId(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "facebookId") || "";
    return ans;
  }

  @FieldResolver()
  async youtubeId(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "youtubeId") || "";
    return ans;
  }

  @FieldResolver()
  async profilePictureUri(@Root() member: Member): Promise<string> {
    const ans = getMergedMemberData(member, "profilePictureUri") || "";
    return ans;
  }

  @FieldResolver()
  async congressRoles(@Root() member: Member): Promise<MemberRole[]> {
    const ans = getMergedMemberData(member, "congressRoles") || [];
    return ans;
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
