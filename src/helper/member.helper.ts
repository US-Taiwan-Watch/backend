import { Member, MemberRole } from "../../common/models";

export function getMergedMemberData(member: Member, field: keyof Member, skip_user: Boolean = false): any {
  let ans: any = undefined;

  if (field === "congressRoles") {
    ans = [];

    // currently not accept user to modify the role data
    const bioguideData = member.bioguideMember?.["congressRoles"];
    const propublicaData = member.propublicaMember?.["congressRoles"];
    const unitedstatesData = member.unitedstatesMember?.["congressRoles"];

    bioguideData?.sort((role1, role2) => role1.startDate.localeCompare(role2.startDate));
    propublicaData?.sort((role1, role2) => role1.startDate.localeCompare(role2.startDate));
    unitedstatesData?.sort((role1, role2) => role1.startDate.localeCompare(role2.startDate));

    // If united states data source has data => use it as the base
    // (it stores each role starts from the sworn date and to the end date)
    if (unitedstatesData) {
      for (let idx = 0; idx < unitedstatesData.length; idx++) {

      }
    }

  } else {

    const userData = member[field];
    const bioguideData = member.bioguideMember?.[field];
    const propublicaData = member.propublicaMember?.[field];
    const unitedstatesData = member.unitedstatesMember?.[field];

    if (!skip_user && userData) {
      ans = userData;
    } else {
      // merge the sources
      if (bioguideData) {
        ans = bioguideData;
      }

      if (unitedstatesData) {
        if (ans && ans !== unitedstatesData) {
          // source data doesn't match with the previous answer
          console.log(`[MemberDataMerge] Data Conflict with unitedStates - '${ans}' <> '${unitedstatesData}'`);
        }

        if (!ans || (ans !== unitedstatesData && String(unitedstatesData).indexOf(String(ans)) === 0)) {
          // ans hasn't been assigned, or source data covers the ans
          ans = unitedstatesData;
        }
      }

      if (propublicaData) {
        if (ans && ans !== propublicaData) {
          // source data doesn't match with the previous answer
          console.log(`[MemberDataMerge] Data Conflict with ProPublica - '${ans}' <> '${propublicaData}'`);
        }

        if (!ans || (ans !== propublicaData && String(propublicaData).indexOf(String(ans)) === 0)) {
          // ans hasn't been assigned, or source data covers the ans
          ans = propublicaData;
        }
      }
    }
  }

  return ans;
}
