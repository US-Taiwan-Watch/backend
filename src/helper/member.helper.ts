import { Member, MemberRole } from "../../common/models";

function isValidRole(role: MemberRole): Boolean {
  if (role.startDate.endsWith('-00') || (role.endDate.endsWith('-99'))) {
    return false;
  }
  if (role.startDate.localeCompare(role.endDate) > 0) {   // start > end
    return false;
  }
  return true;
}

function isRolePeriodOverlap(role1: MemberRole | undefined, role2: MemberRole | undefined): Boolean {
  if (!role1 || !role2) {
    return false;
  }

  if (role1.startDate.localeCompare(role2.startDate) <= 0) {
    // role1 <= role2
    if (role1.endDate.localeCompare(role2.startDate) <= 0) {
      // |< role1 >|              +  |< role1 >|
      //             |< role2 >|  +            |< role2 >|
      return false;
    }
  } else {
    // role2 < role1
    if (role1.startDate.localeCompare(role2.endDate) >= 0) {
      // |< role2 >|              +  |< role2 >|
      //             |< role1 >|  +            |< role1 >|
      return false;
    }
  }

  return true;
}

function joinTwoPeriods(period1: [string, string], period2: [string, string]): [string, string] {
  const ans: [string, string] = [period1[0], period1[1]];
  if (period2[0].localeCompare(ans[0]) < 0) ans[0] = period2[0];
  if (period2[1].localeCompare(ans[1]) > 0) ans[1] = period2[1];

  return ans;
}

function mergeRoleData(id: string, target: MemberRole, source: MemberRole): Boolean {
  /* Consistency Check */
  // congressNumbers
  const congressNumSet = new Set(target.congressNumbers);
  source.congressNumbers.forEach((num) => congressNumSet.add(num));
  const congressNumArr = [...congressNumSet].sort((a,b) => a - b);
  if (congressNumArr.length > 3) {
    console.log(`[WARNING] more than 3 congress for ${id} - ${congressNumArr}`);
    return false;
  }
  // chamber
  if (source.chamber !== target.chamber) {
    console.log(`[WARNING] different chamber for ${id} - ${source.chamber} -> ${target.chamber}`);
    return false;
  }
  // state
  if (source.state && target.state && source.state !== target.state) {
    console.log(`[WARNING] different state for ${id} - ${source.state} -> ${target.state}`);
    return false;
  }
  // district (house)
  if (source.district && target.district && source.district !== target.district) {
    console.log(`[WARNING] different district for ${id} - ${source.district} -> ${target.district}`);
    return false;
  }
  // senatorClass (senator)
  if (source.senatorClass && target.senatorClass && source.senatorClass !== target.senatorClass) {
    console.log(`[WARNING] different senatorClass for ${id} - ${source.senatorClass} -> ${target.senatorClass}`);
    return false;
  }

  /* Merge the two roles */
  // congressNumbers
  target.congressNumbers = congressNumArr;
  // date
  const mergedPeriod = joinTwoPeriods([source.startDate, source.endDate], [target.startDate, target.endDate]);
  target.startDate = mergedPeriod[0];
  target.endDate = mergedPeriod[1];
  // parties
  // TODO: to see how to merge party records
  return true;
}

export function getMergedMemberData(member: Member, field: keyof Member, skip_user: Boolean = false): any {
  let ans: any = undefined;

  // TODO: get member's other data (for the case he/she has different ID)

  if (field === "congressRoles") {
    const ansRoles: MemberRole[] = [];

    // currently not accept user to modify the role data
    let bioguideRoles = member.bioguideMember?.["congressRoles"];
    let propublicaRoles = member.propublicaMember?.["congressRoles"];
    let unitedstatesRoles = member.unitedstatesMember?.["congressRoles"];

    // filter out invalid dates
    bioguideRoles = bioguideRoles?.filter(isValidRole);
    propublicaRoles = propublicaRoles?.filter(isValidRole);
    unitedstatesRoles = unitedstatesRoles?.filter(isValidRole);

    // put same period in the same bucket
    // us -> pp -> bioguide (according to data reliability)
    const workingRoleLists: Array<MemberRole[]> = [];

    unitedstatesRoles?.forEach(role => workingRoleLists.push([role]));
    propublicaRoles?.forEach(role => {
      let found = false;
      for (let bucketId = 0; bucketId < workingRoleLists.length; bucketId++) {
        if (isRolePeriodOverlap(workingRoleLists[bucketId][0], role)) {
          found = true;
          workingRoleLists[bucketId].push(role);
        }
      }
      if (found === false) {
        workingRoleLists.push([role]);
      }
    });
    bioguideRoles?.forEach(role => {
      let found = false;
      for (let bucketId = 0; bucketId < workingRoleLists.length; bucketId++) {
        if (isRolePeriodOverlap(workingRoleLists[bucketId][0], role)) {
          found = true;
          workingRoleLists[bucketId].push(role);
        }
      }
      if (found === false) {
        workingRoleLists.push([role]);
      }
    });

    // merge the roles put in the same bucket
    workingRoleLists.forEach(workingRoles => {
      for (let i = 1; i < workingRoles.length; i++) {
        mergeRoleData(member.id, workingRoles[0], workingRoles[i]);
      }
      ansRoles.push(workingRoles[0]);
    });

    // sort the answer by start date order
    ansRoles.sort((role1, role2) => role1.startDate.localeCompare(role2.startDate))
    ans = ansRoles;

  } else {

    const userData = member.userWroteMember?.[field];
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
