import { intersection } from "lodash";
import { Member, MemberRole, GenderType, PartyRecord } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { BioguideHelper } from "./sources/bioguide";
import { ProPublicaHelper } from "./sources/propublica";
import { UnitedStatesHelper } from "./sources/unitedstates";
import { MemberProPicDownloader } from "../storage/member-pro-pic-downloader";


type MemberSrc = 'BioGuide' | 'ProPublica' | 'UnitedStates' | 'UserData';

function isDataSyncSource(source: MemberSrc): boolean {
  if (source === 'ProPublica' || source === 'UnitedStates' || source === 'BioGuide') {
    return true;
  } else {
    return false;
  }
}

function getGender(genderStr: string): GenderType | undefined {
  if (genderStr === "M")
    return 'male';
  else if (genderStr === "F")
    return 'female';
  else
    return undefined;
}

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
    await new MemberBioGuideSyncer(this.entity).sync().then(
      (result) => {
        if (result === false) {
          // do nothing for the case we skip the update for failling too many times
        } else if (this.entity.bioguideMember) {
          this.entity.bioguideMember.updateTimestamp = Date.now();

          // clear fail count as success
          if (this.entity.bioguideMember.failCount) {
            this.entity.bioguideMember.failCount = 0;
          }
        } else {
          console.log(`Cannot sync member ${this.entity.id} from BioGuide`);
          console.log("No bioguideMember in the result")
        }
      }
    ).catch(
      e => {
        console.log(`Cannot sync member ${this.entity.id} from BioGuide`);
        console.log(e);

        if (!this.entity.bioguideMember) {
          this.entity.bioguideMember = new Member(this.entity.id);
        }

        if (this.entity.bioguideMember.failCount) {
          this.entity.bioguideMember.failCount++;
        } else {
          this.entity.bioguideMember.failCount = 1;
        }
      }
    )

    // Query data from ProPublica
    await new MemberProPublicaSyncer(this.entity).sync().then(
      (result) => {
        if (result === false) {
          // do nothing for the case we skip the update for failling too many times
        } else if (this.entity.propublicaMember) {
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
        } else if (!isNaN(e) && Number.isInteger(Number(e))) {
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
      (result) => {
        if (result === false) {
          // do nothing for the case we skip the update for failling too many times
        } else if (this.entity.unitedstatesMember) {
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
    if (
      (!this.entity.profilePictureUri) &&
      ((!this.entity.getPictureFailCount) || (this.entity.getPictureFailCount < 3))
    ) {
      await new MemberProPicDownloader(this.entity.id).downloadAndUpload().then(result => {
        if (result === true) {
          // download and upload succeeded => update the picture URI
          this.entity.profilePictureUri
            = `https://ustwstorage.blob.core.windows.net/public-image/profile_pictures/${this.entity.id}.jpg`;

          console.log(`[Member][BioGuide] ${this.entity.id} profile picture downloaded`);
        } else {
          // download and upload failed
          console.log(`Cannot download member ${this.entity.id}'s profile picture from Bioguide`);

          if (this.entity.getPictureFailCount) {
            this.entity.getPictureFailCount++;
          } else {
            this.entity.getPictureFailCount = 1;
          }
        }
      });
    }

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
    if (
      (this.entity.bioguideMember) &&
      (!this.entity.bioguideMember.updateTimestamp || this.entity.bioguideMember.updateTimestamp === 0) &&
      (this.entity.bioguideMember.failCount && this.entity.bioguideMember.failCount >= 3)
    ) {
      // sequtially failed too many times without any successful trial => considering bioguide has no data for this member
      return false;
    }

    const bioguideResult = await BioguideHelper.getMember(this.entity.id);
    const bioguideMember = this.buildMemberFromBioguideResult(bioguideResult['data']);

    // console.log("BIOGUIDE MEMBER: ");
    // console.log(JSON.stringify(bioguideMember, null, 4));

    if (this.entity.bioguideMember) {
      this.entity.bioguideMember = mergeMember("BioGuide", this.entity.bioguideMember, bioguideMember);
    } else {
      this.entity.bioguideMember = bioguideMember;
      console.log(`[Member][BioGuide] ${this.entity.id} data added`);
    }

    return true;
  }

  private buildMemberFromBioguideResult(bioguideData: any): Member {
    const bioguideMember = new Member(bioguideData['usCongressBioId']);

    if (bioguideData['givenName']) {
      bioguideMember.firstName = bioguideData['givenName'];
    }

    if (bioguideData['middleName']) {
      bioguideMember.middleName = bioguideData['middleName'];
    }

    if (bioguideData['familyName']) {
      bioguideMember.lastName = bioguideData['familyName'];
    }

    if (bioguideData['birthDate']) {
      bioguideMember.birthday = bioguideData['birthDate'];
    }

    if (bioguideData['jobPositions'].length > 0) {
      const jobs = bioguideData['jobPositions'];

      // init congress role array
      bioguideMember.congressRoles = [];

      for (let job_idx = 0; job_idx < jobs.length; job_idx++) {
        const job = jobs[job_idx]['job'];
        const jobData = jobs[job_idx]['congressAffiliation'];
        const partyList = jobData['partyAffiliation'] || [{ "party": { "name": "No Party Data" } }];

        if (
          job['name'] !== "Senator" &&
          job['name'] !== "Representative" &&
          job['name'] !== "Delegate"
        ) {
          continue;
        }

        if (jobData['congress']['congressType'] !== "USCongress") {
          // skip the records for Continental/Confederation congresses
          continue;
        }

        const job_start =
          jobs[job_idx]['startDate'] || jobData['congress']['startDate'] || "0000-00-00";

        const job_end =
          jobs[job_idx]['endDate'] || jobData['congress']['endDate'];

        let parties: Array<PartyRecord> = [];

        for (let party_idx = 0; party_idx < partyList.length; party_idx++) {
          const partyData = partyList[party_idx];

          let partyName = partyData['party']['name'];
          if (!partyName || partyName === "NA") {
            partyName = "No Party Data";
          }

          parties.push({
            party: partyName,
            startDate: partyData['startDate'] || job_start,
            endDate: partyData['endDate'] || job_end
          });
        }

        if (job['name'] === "Senator") {
          bioguideMember.congressRoles?.push({
            congressNumbers: [Number(jobData['congress']['congressNumber'])],
            chamber: 's',
            startDate: job_start,
            endDate: job_end,
            parties: parties,
            state: jobData['represents']['regionCode']
          });
        } else if (job['name'] === "Representative" || job['name'] === "Delegate") {
          bioguideMember.congressRoles?.push({
            congressNumbers: [Number(jobData['congress']['congressNumber'])],
            chamber: 'h',
            startDate: job_start,
            endDate: job_end,
            parties: parties,
            state: jobData['represents']['regionCode']
          });
        }
      }
    }

    return bioguideMember;
  }
}

class MemberProPublicaSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
    if (
      (this.entity.propublicaMember) &&
      (!this.entity.propublicaMember.updateTimestamp || this.entity.propublicaMember.updateTimestamp === 0) &&
      (this.entity.propublicaMember.failCount && this.entity.propublicaMember.failCount >= 3)
    ) {
      // sequtially failed too many times without any successful trial => considering ProPublica has no data for this member
      return false;
    }

    const propublicaResult = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${this.entity.id}.json`);
    const proPublicaMember = this.buildMemberFromPropublicaResult(propublicaResult[0]);

    // console.log("PROPUBLICA MEMBER: ");
    // console.log(JSON.stringify(proPublicaMember, null, 4));

    if (this.entity.propublicaMember) {
      this.entity.propublicaMember = mergeMember("ProPublica", this.entity.propublicaMember, proPublicaMember);
    } else {
      this.entity.propublicaMember = proPublicaMember;
      console.log(`[Member][ProPublica] ${this.entity.id} data added`);
    }

    return true;
  }

  private buildMemberFromPropublicaResult(propublicaData: any): Member {
    const propublicaMember = new Member(propublicaData['id']);

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

    if (propublicaData['gender'] && getGender(propublicaData['gender'])) {
      propublicaMember.gender = getGender(propublicaData['gender']);
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
        let tempMemRole: MemberRole | undefined = undefined;

        const start = role['start_date'] || "0000-00-00";
        const end = role['end_date'];

        if (role['chamber'] === "Senate") {
          tempMemRole = {
            congressNumbers: [Number(role['congress'])],
            chamber: 's',
            startDate: start,
            endDate: end,
            parties: [{ party: role['party'] || "No Party Data", startDate: start, endDate: end }],
            state: role['state'],
            senatorClass: Number(role['senate_class'])
          };
        } else if (role['chamber'] === "House") {
          if (role['title'] === "Representative") {
            tempMemRole = {
              congressNumbers: [Number(role['congress'])],
              chamber: 'h',
              startDate: start,
              endDate: end,
              parties: [{ party: role['party'] || "No Party Data", startDate: start, endDate: end }],
              state: role['state'],
              district: Number(role['district'])
            };
          } else if (role['title'] === "Delegate") {
            tempMemRole = {
              congressNumbers: [Number(role['congress'])],
              chamber: 'h',
              startDate: start,
              endDate: end,
              parties: [{ party: role['party'] || "No Party Data", startDate: start, endDate: end }],
              state: role['state'],
              district: Number(role['district']) || 0
            };
          }
        }

        if (tempMemRole) {
          const sameRoleIdx = propublicaMember.congressRoles.findIndex((memRole) => {
            if (!tempMemRole) return false

            if (memRole.congressNumbers.join() !== tempMemRole.congressNumbers.join()) {
              return false;
            }

            if (memRole.chamber !== tempMemRole.chamber) {
              return false;
            }

            if (memRole.state !== tempMemRole.state) {
              return false;
            }

            if (memRole.senatorClass !== tempMemRole.senatorClass) {
              return false;
            }

            if (memRole.district !== tempMemRole.district) {
              return false;
            }

            return true;    // return true if only pary and start/end are different
          });

          if (sameRoleIdx !== -1) {
            // party changed, update party information and the start/end date
            const sameRole = propublicaMember.congressRoles[sameRoleIdx];

            sameRole.parties.push(
              ...tempMemRole.parties
            )

            if (
              tempMemRole.startDate && tempMemRole.startDate !== "0000-00-00" &&
              tempMemRole.startDate.localeCompare(sameRole.startDate) < 0
            ) {
              sameRole.startDate = tempMemRole.startDate;
            }

            if (
              tempMemRole.endDate &&
              tempMemRole.endDate.localeCompare(sameRole.endDate) > 0
            ) {
              sameRole.endDate = tempMemRole.endDate;
            }
          } else {
            // no the same role can be found => append the new role
            propublicaMember.congressRoles.push(tempMemRole);
          }
        }
      }
    }

    return propublicaMember;
  }

  // TODO: party & state mapping from propublica to member type
  // R -> Republican
  // I -> Independent
  // D -> Democrat
}

class MemberUnitedStateSyncer extends EntitySyncer<Member> {
  protected async syncImpl(): Promise<boolean> {
    if (
      (this.entity.unitedstatesMember) &&
      (!this.entity.unitedstatesMember.updateTimestamp || this.entity.unitedstatesMember.updateTimestamp === 0) &&
      (this.entity.unitedstatesMember.failCount && this.entity.unitedstatesMember.failCount >= 3)
    ) {
      // sequtially failed too many times without any successful trial => considering the united states database has no data for this member
      return false;
    }

    const unitedStatesAllMemberResult = await UnitedStatesHelper.getAllMemberData();
    const unitedStatesResult = unitedStatesAllMemberResult.find(result => result.id.bioguide === this.entity.id);

    if (unitedStatesResult) {
      const unitedStatesMember = this.buildMemberFromUnitedStatesResult(unitedStatesResult);

      // console.log("UNITED STATES MEMBER: ");
      // console.log(JSON.stringify(unitedStatesMember, null, 4));

      if (this.entity.unitedstatesMember) {
        this.entity.unitedstatesMember = mergeMember("UnitedStates", this.entity.unitedstatesMember, unitedStatesMember);
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
    const unitedStatesMember = new Member(uniteStatesData.id.bioguide);

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

    if (uniteStatesData.bio.gender && getGender(uniteStatesData.bio.gender)) {
      unitedStatesMember.gender = getGender(uniteStatesData.bio.gender);
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
        let new_role: MemberRole | undefined = undefined;

        if (term.type === "sen") {
          new_role = {
            congressNumbers: [],   // have no congress number info
            chamber: 's',
            startDate: term.start || "0000-00-00",
            endDate: term.end,
            parties: [],
            state: term.state,
            senatorClass: Number(term.class)
          };
        } else if (term.type === "rep") {
          new_role = {
            congressNumbers: [],   // have no congress number info
            chamber: 'h',
            startDate: term.start || "0000-00-00",
            endDate: term.end,
            parties: [],
            state: term.state,
            district: Number(term.district)
          };
        }

        // Party change record exists
        if (new_role) {
          if (term.party_affiliations) {
            // more than one party record
            for (let party_idx = 0; party_idx < term.party_affiliations.length; party_idx++) {
              new_role.parties.push({
                party: term.party_affiliations[party_idx].party || "No Party Data",
                startDate: term.party_affiliations[party_idx].start,
                endDate: term.party_affiliations[party_idx].end
              });
            }
          } else {
            // normal party
            new_role.parties.push({
              party: term.party || "No Party Data",
              startDate: new_role.startDate,
              endDate: new_role.endDate
            });
          }
        }

        if (new_role) {
          unitedStatesMember.congressRoles.push(new_role);
        }
      }
    }

    return unitedStatesMember;
  }
}

function stringifyParties(parties: PartyRecord[]): string {
  if (!parties) {
    return "";
  }

  let stringifiedDataList: string[] = [];
  parties.forEach(party => {
    stringifiedDataList.push(`${party.party} (${party.startDate} - ${party.endDate || 'undefined'})`);
  });

  if (stringifiedDataList.length > 0) {
    return stringifiedDataList.join(" / ");
  } else {
    return "";
  }
}

function mergeMember(source: MemberSrc, targetMember: Member, srcMember: Member): Member {
  // srcMember -merge/integrate-> targetMember

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

  const allUsedCounts = new Map();
  let unUpdatedRoles = (targetMember.congressRoles) ? [...Array(targetMember.congressRoles.length).keys()] : [];  // role indices

  srcMember.congressRoles?.forEach(srcRole => {
    let action: 'Append' | 'Update' | 'None' = 'None';
    let updateTargetRoleIdx = -1;
    let roleFieldNote = "";

    // Handle congress roles from different sources
    if (isDataSyncSource(source)) {
      // check the same term (job period) by the start date
      // Note: use start date because some member may change their party or job within one congress => records

      roleFieldNote = `from: ${srcRole.startDate}`;

      if (targetMember.congressRoles) {
        const dupTargetIndices: number[] = [];

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
            const usedCount = allUsedCounts.get(srcRole.startDate);

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
      const targetRole = targetMember.congressRoles[updateTargetRoleIdx];

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

      // phased out
      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].party`, targetRole.party, srcRole.party)) {
          targetRole.party = srcRole.party;
      }

      if (isNeedUpdate(targetMember.id, source,
        `congressRole[${roleFieldNote}].parties`, stringifyParties(targetRole.parties), stringifyParties(srcRole.parties), true)) {
        targetRole.parties = srcRole.parties;
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

      // the role of index has been updated, removed from unUpdated list
      unUpdatedRoles = unUpdatedRoles.filter(idx => idx !== updateTargetRoleIdx);
    }
  })

  // For source sync, removed the roles didn't updated this time (the data has been removed from the data source)
  if (isDataSyncSource(source) && unUpdatedRoles !== []) {
    unUpdatedRoles.reverse().forEach(unUpdatedIdx => {
      if (targetMember.congressRoles && targetMember.congressRoles.length > unUpdatedIdx) {
        const roleFieldNote = `from: ${targetMember.congressRoles[unUpdatedIdx].startDate}`;

        console.log(`[Member][${source}] ${targetMember.id} congressRole[${roleFieldNote}] deleted`);
        targetMember.congressRoles.splice(unUpdatedIdx, 1)
      }
    })
  }

  return targetMember;
}

function isNeedUpdate(memeberId: string, source: MemberSrc, field: string, oldData: any, newData: any, needNewLine: boolean = false): boolean {
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
    let logPrefix = "";
    if (needNewLine)
      logPrefix = `[Member][${source}] ${memeberId} ${field}:\n `;
    else
      logPrefix = `[Member][${source}] ${memeberId} ${field}:`;

    if (oldData && newData) {
      // data modified
      console.log(`${logPrefix} ${oldData} -> ${newData}`);
    } else if (oldData && !newData) {
      // data removed
      console.log(`${logPrefix} ${oldData} removed`);
    } else if (!oldData && newData) {
      // data added
      console.log(`${logPrefix} ${newData} added`);
    }
  }

  return true;
}
