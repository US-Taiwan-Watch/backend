import { Member, MemberRole, MemberRoleParty, PartyRecord } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";
import { mergeMember, getGender, getFullPartyName } from "./member.sync.common";

export class MemberProPublicaSyncer extends EntitySyncer<Member> {
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
