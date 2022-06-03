import { intersection } from "lodash";
import { Member, MemberRole } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";
import { UnitedStatesHelper } from "./sources/unitedstates";


export class MemberSyncer extends EntitySyncer<Member> {
  public static async getAllMembers(): Promise<Member[]> {
    const result = await UnitedStatesHelper.get("https://theunitedstates.io/congress-legislators/legislators-historical.json");
    return result.map(((m: any) => ({ id: m.id.bioguide })));
  }

  public static async getMemberList(chamber: 'senate' | 'house', congressNum: number): Promise<Member[]> {
    const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/${congressNum}/${chamber}/members.json`);
    return result[0].members.map((m: any) => ({ id: m.id }));
  }

  protected async syncImpl() {
    return await new MemberProPublicaSyncer(this.entity).sync();
    // Add other syncers here. Will run in sequential. TODO: update to parallel

    // update pic
    // update from user data (this.toUpdate)
  }
}

class MemberProPublicaSyncer extends EntitySyncer<Member> {
  protected async syncImpl() {
    const proPublicaResult = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${this.entity.id}.json`);

    if (proPublicaResult[0]['first_name']) {
      this.entity.firstName = proPublicaResult[0]['first_name'];
    }

    if (proPublicaResult[0]['middle_name']) {
      this.entity.middleName = proPublicaResult[0]['middle_name'];
    }

    if (proPublicaResult[0]['last_name']) {
      this.entity.lastName = proPublicaResult[0]['last_name'];
    }

    if (proPublicaResult[0]['suffix']) {
      this.entity.nameSuffix = proPublicaResult[0]['suffix'];
    }

    if (proPublicaResult[0]['gender']) {
      const gender = proPublicaResult[0]['gender'];

      if (gender === 'M') {
        this.entity.gender = 'male';
      } else if (gender === 'F') {
        this.entity.gender = 'female';
      }
    }

    if (proPublicaResult[0]['date_of_birth']) {
      this.entity.birthday = proPublicaResult[0]['date_of_birth'];
    }

    if (proPublicaResult[0]['cspan_id']) {
      this.entity.cspanId = proPublicaResult[0]['cspan_id'];
    }

    if (proPublicaResult[0]['twitter_account']) {
      this.entity.twitterId = proPublicaResult[0]['twitter_account'];
    }

    if (proPublicaResult[0]['facebook_account']) {
      this.entity.facebookId = proPublicaResult[0]['facebook_account'];
    }

    if (proPublicaResult[0]['youtube_account']) {
      this.entity.youtubeId = proPublicaResult[0]['youtube_account'];
    }

    // if (this.fields?.includes('profilePictureUri')) {
    //   this.entity.profilePictureUri = ?
    // }

    if (proPublicaResult[0]['roles'].length > 0) {
      const roles = proPublicaResult[0]['roles'];

      for (let role_idx = 0; role_idx < roles.length; role_idx++) {
        const role = roles[role_idx];

        if (this.entity.congressRoles?.some((congressRole: MemberRole): boolean =>
          congressRole.congressNumbers.some((congressNum: number): boolean =>
            congressNum === Number(role['congress'])))
        ) {
          // this role exists => update the data
          console.log(`role: ${Number(role['congress'])} exists`);
        } else {
          // this role doesn't exist => push a new one
          if (!this.entity.congressRoles) {
            this.entity.congressRoles = [];
          }

          if (role['chamber'] === 'Senate') {
            this.entity.congressRoles.push({
              congressNumbers: [Number(role['congress'])],
              chamber: 's',
              startDate: role['start_date'],
              endDate: role['end_date'],
              party: role['party'],
              state: role['state'],
              senatorClass: role['senate_class']
            });
          } else {
            this.entity.congressRoles.push({
              congressNumbers: [Number(role['congress'])],
              chamber: 'h',
              startDate: role['start_date'],
              endDate: role['end_date'],
              party: role['party'],
              state: role['state'],
              district: role['district']
            });
          }
        }
      }
    }
    return true;

  }

  // TODO: party & state mapping from propublica to member type
}
