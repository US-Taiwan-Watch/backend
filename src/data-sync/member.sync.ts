import { intersection } from "lodash";
import { Member, MemberRole } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { BioguideHelper } from "./sources/bioguide";
import { ProPublicaHelper } from "./sources/propublica";
import { UnitedStatesHelper } from "./sources/unitedstates";


type MemberSrc = 'ProPublica' | 'unitedStates' | 'UserData';

export class MemberSyncer extends EntitySyncer<Member> {
  public static async getAllMembers(): Promise<Member[]> {
    // these members are not listed in the united states source
    const moreMembers =
      ["M000564", "S000605"];

    const result = await UnitedStatesHelper.getAllMemberData();
    return result.map(((m: any) => ({ id: m.id.bioguide }))).concat(moreMembers.map((id: string) => ({ id: id })));
  }

  public static async getMemberList(chamber: 'senate' | 'house', congressNum: number): Promise<Member[]> {
    const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/${congressNum}/${chamber}/members.json`);
    return result[0].members.map((m: any) => ({ id: m.id }));
  }

  protected async syncImpl(): Promise<boolean> {
    // Syncers run in sequential. TODO: update to parallel

    // Update user's input data
    new MemberDataUpdateSyncer(this.entity, this.toUpdate).sync();

    // Query data from Bioguide
    // await new MemberBioGuideSyncer(this.entity).sync().then(

    // ).catch(
    //   e => {
    //     console.log(`Cannot sync member ${this.entity.id} from BioGuide (Error ${e})`);
    //   }
    // )

    // Query data from ProPublica
    await new MemberProPublicaSyncer(this.entity).sync().then(
      () => {
        if (this.entity.propublicaMember) {
          this.entity.propublicaMember.updateTimestamp = Date.now();

          // clear fail count as success
          if (this.entity.propublicaMember.failCount) {
            this.entity.propublicaMember.failCount = 0;
          }
        } else {
          console.log(`Cannot sync member ${this.entity.id} from Propublica`);
          console.log("No propublicaMember in the result")
        }
      }
    ).catch(
      e => {
        if (e.status === "ERROR" && e.errors && e.errors[0].error) {
          console.log(`Cannot sync member ${this.entity.id} from Propublica (${e.errors[0].error})`);
        } else if (e.status) {
          console.log(`Cannot sync member ${this.entity.id} from Propublica (Error ${e.status})`);
        } else if (Number(e) != NaN && Number.isInteger(Number(e))) {
          console.log(`Cannot sync member ${this.entity.id} from Propublica (Error ${Number(e)})`);
        } else {
          console.log(`Cannot sync member ${this.entity.id} from Propublica`);
          console.log(e);
        }

        if (!this.entity.propublicaMember) {
          this.entity.propublicaMember = new Member(this.entity.id);
        }

        if (this.entity.propublicaMember.failCount) {
          this.entity.propublicaMember.failCount++;
        } else {
          this.entity.propublicaMember.failCount = 1;
        }
      });

    // Query data from the United States database
    await new MemberUnitedStateSyncer(this.entity).sync().then(
      () => {
        if (this.entity.unitedstatesMember) {
          this.entity.unitedstatesMember.updateTimestamp = Date.now();

          // clear fail count as success
          if (this.entity.unitedstatesMember.failCount) {
            this.entity.unitedstatesMember.failCount = 0;
          }
        } else {
          console.log(`Cannot sync member ${this.entity.id} from the United States project database`);
          console.log("No unitedstatesMember in the result")
        }
      }
    ).catch(
      e => {
        console.log(`Cannot sync member ${this.entity.id} from the United States project database`);
        console.log(e);

        if (!this.entity.unitedstatesMember) {
          this.entity.unitedstatesMember = new Member(this.entity.id);
        }

        if (this.entity.unitedstatesMember.failCount) {
          this.entity.unitedstatesMember.failCount++;
        } else {
          this.entity.unitedstatesMember.failCount = 1;
        }
      });

    // update pic
    return true;
  }
}

class MemberDataUpdateSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {

    // toUpdate not exist or is not Member, no need to update
    if (!this.toUpdate || !("id" in this.toUpdate)) {
      return true;
    }

    // toUpdate data is not the one for this entity
    if (this.toUpdate.id != this.entity.id) {
      return false;
    }

    this.entity = mergeMember("UserData", this.entity, this.toUpdate);

    return true;
  }
}

class MemberBioGuideSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
    const bioguideResult = await BioguideHelper.getMember(this.entity.id);
    console.log(JSON.stringify(bioguideResult, null, 4));
    // const bioguideMember = this.buildMemberFromBioguideResult()

    return true;
  }


}

class MemberProPublicaSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
    if (
      (this.entity.propublicaMember) &&
      (!this.entity.propublicaMember.updateTimestamp) &&
      (this.entity.propublicaMember.failCount && this.entity.propublicaMember.failCount >= 3)
    ) {
      // sequtially failed too many times without any successful trial => considering ProPublica has no data for this member
      return true;
    }

    const propublicaResult = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${this.entity.id}.json`);
    const proPublicaMember = this.buildMemberFromPropublicaResult(propublicaResult[0]);

    if (this.entity.propublicaMember) {
      this.entity.propublicaMember = mergeMember("ProPublica", this.entity.propublicaMember, proPublicaMember);
    } else {
      this.entity.propublicaMember = proPublicaMember;
      console.log(`[Member][ProPublica] ${this.entity.id} data added`);
    }

    return true;
  }

  private buildMemberFromPropublicaResult(propublicaData: any): Member {
    let propublicaMember = new Member(propublicaData['id']);

    if (propublicaData['first_name']) {
      propublicaMember.firstName = propublicaData['first_name'];
    }

    if (propublicaData['middle_name']) {
      propublicaMember.middleName = propublicaData['middle_name'];
    }

    if (propublicaData['last_name']) {
      propublicaMember.lastName = propublicaData['last_name'];
    }

    if (propublicaData['suffix']) {
      propublicaMember.nameSuffix = propublicaData['suffix'];
    }

    if (propublicaData['gender']) {
      const gender = propublicaData['gender'];

      if (gender === "M") {
        propublicaMember.gender = "male";
      } else if (gender === "F") {
        propublicaMember.gender = "female";
      }
    }

    if (propublicaData['date_of_birth']) {
      propublicaMember.birthday = propublicaData['date_of_birth'];
    }

    if (propublicaData['url']) {
      propublicaMember.website = propublicaData['url'];
    }

    if (propublicaData['office']) {
      propublicaMember.office = propublicaData['office'];
    }

    if (propublicaData['phone']) {
      propublicaMember.phone = propublicaData['phone'];
    }

    if (propublicaData['cspan_id']) {
      propublicaMember.cspanId = propublicaData['cspan_id'];
    }

    if (propublicaData['twitter_account']) {
      propublicaMember.twitterId = propublicaData['twitter_account'];
    }

    if (propublicaData['facebook_account']) {
      propublicaMember.facebookId = propublicaData['facebook_account'];
    }

    if (propublicaData['youtube_account']) {
      propublicaMember.youtubeId = propublicaData['youtube_account'];
    }

    if (propublicaData['roles'].length > 0) {
      const roles = propublicaData['roles'];

      // init congress role array
      propublicaMember.congressRoles = [];

      for (let role_idx = 0; role_idx < roles.length; role_idx++) {
        const role = roles[role_idx];

        if (role['chamber'] === "Senate") {
          propublicaMember.congressRoles.push({
            congressNumbers: [Number(role['congress'])],
            chamber: 's',
            startDate: role['start_date'],
            endDate: role['end_date'],
            party: role['party'],
            state: role['state'],
            senatorClass: Number(role['senate_class'])
          });
        } else if (role['chamber'] === "House") {
          if (role['title'] === "Representative") {
            propublicaMember.congressRoles.push({
              congressNumbers: [Number(role['congress'])],
              chamber: 'h',
              startDate: role['start_date'],
              endDate: role['end_date'],
              party: role['party'],
              state: role['state'],
              district: Number(role['district'])
            });
          }
        }
      }
    }

    return propublicaMember;
  }

  // TODO: party & state mapping from propublica to member type
}

class MemberUnitedStateSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
    if (
      (this.entity.unitedstatesMember) &&
      (!this.entity.unitedstatesMember.updateTimestamp) &&
      (this.entity.unitedstatesMember.failCount && this.entity.unitedstatesMember.failCount >= 3)
    ) {
      // sequtially failed too many times without any successful trial => considering the united states database has no data for this member
      return true;
    }

    const unitedStatesAllMemberResult = await UnitedStatesHelper.getAllMemberData();
    const unitedStatesResult = unitedStatesAllMemberResult.find(result => result.id.bioguide === this.entity.id);

    if (unitedStatesResult) {
      const unitedStatesMember = this.buildMemberFromUnitedStatesResult(unitedStatesResult);

      if (this.entity.unitedstatesMember) {
        this.entity.unitedstatesMember = mergeMember("unitedStates", this.entity.unitedstatesMember, unitedStatesMember);
      } else {
        this.entity.unitedstatesMember = unitedStatesMember;
        console.log(`[Member][unitedStates] ${this.entity.id} data added`);
      }

      return true;
    } else {
      throw "member doesn't exist"
    }
  }

  private buildMemberFromUnitedStatesResult(uniteStatesData: any): Member {
    let unitedStatesMember = new Member(uniteStatesData.id.bioguide);

    if (uniteStatesData.name.first) {
      unitedStatesMember.firstName = uniteStatesData.name.first;
    }

    if (uniteStatesData.name.middle) {
      unitedStatesMember.middleName = uniteStatesData.name.middle;
    }

    if (uniteStatesData.name.last) {
      unitedStatesMember.lastName = uniteStatesData.name.last;
    }

    if (uniteStatesData.name.suffix) {
      unitedStatesMember.nameSuffix = uniteStatesData.name.suffix;
    }

    if (uniteStatesData.name.nickname) {
      unitedStatesMember.nickname = uniteStatesData.name.nickname;
    }

    if (uniteStatesData.bio.gender) {
      const gender = uniteStatesData.bio.gender;

      if (gender === "M") {
        unitedStatesMember.gender = "male";
      } else if (gender === "F") {
        unitedStatesMember.gender = "female";
      }
    }

    if (uniteStatesData.bio.birthday) {
      unitedStatesMember.birthday = uniteStatesData.bio.birthday;
    }

    if (uniteStatesData.terms.length > 0) {
      const terms = uniteStatesData.terms;

      // init congress role array
      unitedStatesMember.congressRoles = [];

      for (let term_idx = 0; term_idx < terms.length; term_idx++) {
        const term = terms[term_idx];

        if (term.type === "sen") {
          unitedStatesMember.congressRoles.push({
            congressNumbers: [],   // have no congress number info
            chamber: 's',
            startDate: term.start,
            endDate: term.end,
            party: term.party,
            state: term.state,
            senatorClass: Number(term.class)
          });
        } else if (term.type === "rep") {
          unitedStatesMember.congressRoles.push({
            congressNumbers: [],   // have no congress number info
            chamber: 'h',
            startDate: term.start,
            endDate: term.end,
            party: term.party,
            state: term.state,
            district: Number(term.district)
          });
        }
      }
    }

    return unitedStatesMember;
  }
}

function mergeMember(source: MemberSrc, targetMember: Member, srcMember: Member): Member {
  // srcMember -merge-> targetMember

  if (isNeedUpdate(targetMember.id, source, "firstName", targetMember.firstName, srcMember.firstName)) {
    targetMember.firstName = srcMember.firstName;
  }

  if (isNeedUpdate(targetMember.id, source, "middleName", targetMember.middleName, srcMember.middleName)) {
    targetMember.middleName = srcMember.middleName;
  }

  if (isNeedUpdate(targetMember.id, source, "lastName", targetMember.lastName, srcMember.lastName)) {
    targetMember.lastName = srcMember.lastName;
  }

  if (isNeedUpdate(targetMember.id, source, "nameSuffix", targetMember.nameSuffix, srcMember.nameSuffix)) {
    targetMember.nameSuffix = srcMember.nameSuffix;
  }

  if (isNeedUpdate(targetMember.id, source, "nickname", targetMember.nickname, srcMember.nickname)) {
    targetMember.nickname = srcMember.nickname;
  }

  if (isNeedUpdate(targetMember.id, source, "firstName_zh", targetMember.firstName_zh, srcMember.firstName_zh)) {
    targetMember.firstName_zh = srcMember.firstName_zh;
  }

  if (isNeedUpdate(targetMember.id, source, "lastName_zh", targetMember.lastName_zh, srcMember.lastName_zh)) {
    targetMember.lastName_zh = srcMember.lastName_zh;
  }

  if (isNeedUpdate(targetMember.id, source, "gender", targetMember.gender, srcMember.gender)) {
    targetMember.gender = srcMember.gender;
  }

  if (isNeedUpdate(targetMember.id, source, "birthday", targetMember.birthday, srcMember.birthday)) {
    targetMember.birthday = srcMember.birthday;
  }

  if (isNeedUpdate(targetMember.id, source, "website", targetMember.website, srcMember.website)) {
    targetMember.website = srcMember.website;
  }

  if (isNeedUpdate(targetMember.id, source, "office", targetMember.office, srcMember.office)) {
    targetMember.office = srcMember.office;
  }

  if (isNeedUpdate(targetMember.id, source, "phone", targetMember.phone, srcMember.phone)) {
    targetMember.phone = srcMember.phone;
  }

  if (isNeedUpdate(targetMember.id, source, "cspanId", targetMember.cspanId, srcMember.cspanId)) {
    targetMember.cspanId = srcMember.cspanId;
  }

  if (isNeedUpdate(targetMember.id, source, "twitterId", targetMember.twitterId, srcMember.twitterId)) {
    targetMember.twitterId = srcMember.twitterId;
  }

  if (isNeedUpdate(targetMember.id, source, "facebookId", targetMember.facebookId, srcMember.facebookId)) {
    targetMember.facebookId = srcMember.facebookId;
  }

  if (isNeedUpdate(targetMember.id, source, "youtubeId", targetMember.youtubeId, srcMember.youtubeId)) {
    targetMember.youtubeId = srcMember.youtubeId;
  }

  if (isNeedUpdate(targetMember.id, source, "revokedFields", targetMember.revokedFields, srcMember.revokedFields)) {
    targetMember.revokedFields = srcMember.revokedFields;
  }

  let allUsedCounts = new Map();

  srcMember.congressRoles?.forEach(srcRole => {
    let action: 'Append' | 'Update' | 'None' = 'None';
    let updateTargetRoleIdx = -1;
    let roleFieldNote = "";

    // Handle congress roles from different sources
    if (source === 'ProPublica' || source === 'unitedStates') {
      // check the same term (job period) by the start date
      // Note: use start date because some member may change their party or job within one congress => records

      roleFieldNote = `from: ${srcRole.startDate}`;

      if (targetMember.congressRoles) {
        let dupTargetIndices: number[] = [];

        targetMember.congressRoles.findIndex(
          (targetRole, currIndex) => {
            if (targetRole.startDate === srcRole.startDate) {
              dupTargetIndices.push(currIndex);
            }
            return false;   // return false to parse all the roles
          }
        );

        if (dupTargetIndices.length === 0) {
          // no record with the same startDate exists => append the data
          action = 'Append';

        } else {
          if (allUsedCounts.has(srcRole.startDate)) {
            // more than one record has the same startDate => update the next (if exists)
            let usedCount = allUsedCounts.get(srcRole.startDate);
            if (usedCount < dupTargetIndices.length) {
              action = 'Update';
              updateTargetRoleIdx = dupTargetIndices[usedCount];
              allUsedCounts.set(srcRole.startDate, usedCount + 1);
            } else {
              action = 'Append';
            }
          } else {
            // the startDate found at the first time => update the role data
            action = 'Update';
            updateTargetRoleIdx = dupTargetIndices[0];
            allUsedCounts.set(srcRole.startDate, 1);
          }
        }
      } else {
        action = 'Append';  // no congress role list exists => append the data with new array
      }
    }

    if (action === 'Append') {
      console.log(`[Member][${source}] ${targetMember.id} congressRole[${roleFieldNote}] added`);

      if (!targetMember.congressRoles) {
        targetMember.congressRoles = [srcRole];
      }
      else {
        targetMember.congressRoles.push(srcRole);
      }

    } else if (action === 'Update' && targetMember.congressRoles && updateTargetRoleIdx !== -1) {
      let targetRole = targetMember.congressRoles[updateTargetRoleIdx];

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].chamber`, targetRole.chamber, srcRole.chamber)) {
        targetRole.chamber = srcRole.chamber;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].startDate`, targetRole.startDate, srcRole.startDate)) {
        targetRole.startDate = srcRole.startDate;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].endDate`, targetRole.endDate, srcRole.endDate)) {
        targetRole.endDate = srcRole.endDate;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].party`, targetRole.party, srcRole.party)) {
        targetRole.party = srcRole.party;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].state`, targetRole.state, srcRole.state)) {
        targetRole.state = srcRole.state;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].district`, targetRole.district, srcRole.district)) {
        targetRole.district = srcRole.district;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].senatorClass`, targetRole.senatorClass, srcRole.senatorClass)) {
        targetRole.senatorClass = srcRole.senatorClass;
      }
    }
  })

  return targetMember;
}

function isNeedUpdate(memeberId: string, source: MemberSrc, field: string, oldData: any, newData: any): boolean {
  // for User source, only update when newData is valid
  if (source == 'UserData' && !newData) {
    return false;
  }

  // identical data, no need to update
  if (oldData && newData && oldData === newData) {
    return false;
  }

  // no valid data updated, no need to update
  if (!oldData && !newData) {
    return false;
  }

  if (oldData !== newData) {
    if (oldData && newData) {
      // data modified
      console.log(`[Member][${source}] ${memeberId} ${field}: ${oldData} -> ${newData}`);
    } else if (oldData && !newData) {
      // data removed
      console.log(`[Member][${source}] ${memeberId} ${field}: ${oldData} removed`);
    } else if (!oldData && newData) {
      // data added
      console.log(`[Member][${source}] ${memeberId} ${field}: ${newData} added`);
    }
  }

  return true;
}
