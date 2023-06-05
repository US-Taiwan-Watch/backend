import { intersection } from "lodash";
import { Member } from "../../common/models";
import { EntitySyncer } from "./entity.sync";
import { mergeMember } from "./member.sync.common";
import { MemberBioGuideSyncer } from "./member.sync.bg";
import { MemberUnitedStateSyncer } from "./member.sync.us";
import { MemberProPublicaSyncer } from "./member.sync.pp";
import { ProPublicaHelper } from "./sources/propublica";
import { UnitedStatesHelper } from "./sources/unitedstates";
import { MemberProPicDownloader } from "../storage/member-pro-pic-downloader";


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

    if (!this.entity.userWroteMember) {
      this.entity.userWroteMember = new Member(this.entity.id);
    }
    this.entity.userWroteMember = mergeMember("UserData", this.entity.userWroteMember, this.toUpdate);

    return true;
  }
}
