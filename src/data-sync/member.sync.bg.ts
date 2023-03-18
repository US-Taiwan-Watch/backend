import { Member, MemberRole, MemberRoleParty, PartyRecord } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { BioguideHelper } from "./sources/bioguide";
import { mergeMember, formatDateString } from "./member.sync.common";


export class MemberBioGuideSyncer extends EntitySyncer<Member> {
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
          job['name'] !== "Delegate" &&
          job['name'] !== "Resident Commissioner"
        ) {
          continue;
        }

        if (jobData['congress']['congressType'] !== "USCongress") {
          // skip the records for Continental/Confederation congresses
          continue;
        }

        const job_start =
          formatDateString(jobs[job_idx]['startDate'] || jobData['congress']['startDate'] || "", 'Start');

        const job_end =
          formatDateString(jobs[job_idx]['endDate'] || jobData['congress']['endDate'] || "", 'End');

        let parties: Array<PartyRecord> = [];

        for (let party_idx = 0; party_idx < partyList.length; party_idx++) {
          const partyData = partyList[party_idx];

          let partyName = partyData['party']['name'];
          if (!partyName || partyName === "NA") {
            partyName = "No Party Data";
          }

          parties.push({
            party: partyName,
            startDate: formatDateString(partyData['startDate'] || job_start, 'Start'),
            endDate: formatDateString(partyData['endDate'] || job_end, 'End')
          });
        }

        // TODO: apply parties' period to job period?

        if (job['name'] === "Senator") {
          bioguideMember.congressRoles?.push({
            congressNumbers: [Number(jobData['congress']['congressNumber'])],
            chamber: 's',
            startDate: job_start,
            endDate: job_end,
            parties: parties,
            state: jobData['represents']['regionCode']
          });
        } else if (
          job['name'] === "Representative" || job['name'] === "Delegate" ||
          job['name'] === "Resident Commissioner"
        ) {
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
