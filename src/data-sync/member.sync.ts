import { intersection } from "lodash";
import { Member, MemberRole } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";
import { UnitedStatesHelper } from "./sources/unitedstates";


type MemberSrc = 'ProPublica' | 'UserData';

export class MemberSyncer extends EntitySyncer<Member> {
  public static async getAllMembers(): Promise<Member[]> {
    const result = await UnitedStatesHelper.get("https://theunitedstates.io/congress-legislators/legislators-historical.json");
    return result.map(((m: any) => ({ id: m.id.bioguide })));
  }

  public static async getMemberList(chamber: 'senate' | 'house', congressNum: number): Promise<Member[]> {
    const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/${congressNum}/${chamber}/members.json`);
    return result[0].members.map((m: any) => ({ id: m.id }));
  }

  protected async syncImpl(): Promise<boolean> {
    // Update user's input data
    new MemberDataUpdateSyncer(this.entity, this.toUpdate).sync();

    // Query data from ProPublica
    await new MemberProPublicaSyncer(this.entity).sync().catch(
      e => {
        if (e.status) {
          console.log(`Cannot sync member ${this.entity.id} from Propublica (Error ${e.status})`);
        } else {
          console.log(`Cannot sync member ${this.entity.id} from Propublica`);
          console.log(e);
        }
      });

    // Query data from the United States database

    // Add other syncers here. Will run in sequential. TODO: update to parallel

    // update pic
    return true;
  }
}

class MemberProPublicaSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
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

    return propublicaMember;
  }

  // TODO: party & state mapping from propublica to member type
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
