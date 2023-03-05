import { Member, MemberRole, MemberRoleParty, PartyRecord } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { UnitedStatesHelper } from "./sources/unitedstates";
import { mergeMember, getGender, formatDateString } from "./member.sync.common";

export class MemberUnitedStateSyncer extends EntitySyncer<Member> {
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
            startDate: formatDateString(term.start || "", 'Start'),
            endDate: formatDateString(term.end || "", 'End'),
            parties: [],
            state: term.state,
            senatorClass: Number(term.class)
          };
        } else if (term.type === "rep") {
          new_role = {
            congressNumbers: [],   // have no congress number info
            chamber: 'h',
            startDate: formatDateString(term.start || "", 'Start'),
            endDate: formatDateString(term.end || "", 'End'),
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
                startDate: formatDateString(term.party_affiliations[party_idx].start, 'Start'),
                endDate: formatDateString(term.party_affiliations[party_idx].end, 'End')
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
