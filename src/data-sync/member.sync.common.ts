import { ChamberType, GenderType, Member, MemberRole, MemberRoleParty, PartyRecord } from "../../common/models";

export type MemberSrc = 'BioGuide' | 'ProPublica' | 'UnitedStates' | 'UserData';
export type DateType = 'Start' | 'End';

export function isDataSyncSource(source: MemberSrc): boolean {
  if (source === 'ProPublica' || source === 'UnitedStates' || source === 'BioGuide') {
    return true;
  } else {
    return false;
  }
}

export function getGender(genderStr: string): GenderType | undefined {
  genderStr = genderStr.trim();

  if (genderStr === "M")
    return 'male';
  else if (genderStr === "F")
    return 'female';
  else
    return undefined;
}

export function getFullPartyName(partyName: string): MemberRoleParty {
  let fullPartyName: MemberRoleParty;
  partyName = partyName.trim();

  switch(partyName){
    case "R":
      fullPartyName = 'Republican'; break;
    case "D":
      fullPartyName = 'Democrat'; break;
    case "I":
    case "ID":
      fullPartyName = 'Independent'; break;
    default:
      if (partyName)
        console.log(`No party mapping for "${partyName}"`);
      fullPartyName = 'No Party Data'; break;
  }

  return fullPartyName;
}

export function formatDateString(dateInput: string, dateType: DateType): string {
  const dateArray = dateInput.split('-');
  let dateOutput: string = "";
  
  dateOutput +=
    (dateArray.length >= 1 && dateArray[0])?  (dateArray[0]) : ((dateType === 'Start')? "0000" : "9999");

  dateOutput +=
    (dateArray.length >= 2 && dateArray[1])?  ('-' + dateArray[1]) : ((dateType === 'Start')? "-00" : "-99");

  dateOutput +=
    (dateArray.length >= 3 && dateArray[2])?  ('-' + dateArray[2]) : ((dateType === 'Start')? "-00" : "-99");

  return dateOutput;
}

function stringifyParties(parties: PartyRecord[]): string {
  if (!parties) {
    return "";
  }

  const stringifiedDataList: string[] = [];
  parties.forEach(party => {
    stringifiedDataList.push(`${party.party} (${party.startDate} - ${party.endDate || 'undefined'})`);
  });

  if (stringifiedDataList.length > 0) {
    return stringifiedDataList.join(" / ");
  } else {
    return "";
  }
}

export function mergeMember(source: MemberSrc, targetMember: Member, srcMember: Member): Member {
  // srcMember -merge/integrate-> targetMember

  srcMember.firstName = srcMember.firstName?.trim();
  if (isNeedUpdate(targetMember.id, source, "firstName", targetMember.firstName, srcMember.firstName)) {
    targetMember.firstName = srcMember.firstName;
  }

  srcMember.middleName = srcMember.middleName?.trim();
  if (isNeedUpdate(targetMember.id, source, "middleName", targetMember.middleName, srcMember.middleName)) {
    targetMember.middleName = srcMember.middleName;
  }

  srcMember.lastName = srcMember.lastName?.trim();
  if (isNeedUpdate(targetMember.id, source, "lastName", targetMember.lastName, srcMember.lastName)) {
    targetMember.lastName = srcMember.lastName;
  }

  srcMember.nameSuffix = srcMember.nameSuffix?.trim();
  if (isNeedUpdate(targetMember.id, source, "nameSuffix", targetMember.nameSuffix, srcMember.nameSuffix)) {
    targetMember.nameSuffix = srcMember.nameSuffix;
  }

  srcMember.nickname = srcMember.nickname?.trim();
  if (isNeedUpdate(targetMember.id, source, "nickname", targetMember.nickname, srcMember.nickname)) {
    targetMember.nickname = srcMember.nickname;
  }

  srcMember.firstName_zh = srcMember.firstName_zh?.trim();
  if (isNeedUpdate(targetMember.id, source, "firstName_zh", targetMember.firstName_zh, srcMember.firstName_zh)) {
    targetMember.firstName_zh = srcMember.firstName_zh;
  }

  srcMember.lastName_zh = srcMember.lastName_zh?.trim();
  if (isNeedUpdate(targetMember.id, source, "lastName_zh", targetMember.lastName_zh, srcMember.lastName_zh)) {
    targetMember.lastName_zh = srcMember.lastName_zh;
  }

  if (isNeedUpdate(targetMember.id, source, "gender", targetMember.gender, srcMember.gender)) {
    targetMember.gender = srcMember.gender;
  }

  srcMember.birthday = srcMember.birthday?.trim();
  if (isNeedUpdate(targetMember.id, source, "birthday", targetMember.birthday, srcMember.birthday)) {
    targetMember.birthday = srcMember.birthday;
  }

  srcMember.website = srcMember.website?.trim();
  if (isNeedUpdate(targetMember.id, source, "website", targetMember.website, srcMember.website)) {
    targetMember.website = srcMember.website;
  }

  srcMember.office = srcMember.office?.trim();
  if (isNeedUpdate(targetMember.id, source, "office", targetMember.office, srcMember.office)) {
    targetMember.office = srcMember.office;
  }

  srcMember.phone = srcMember.phone?.trim();
  if (isNeedUpdate(targetMember.id, source, "phone", targetMember.phone, srcMember.phone)) {
    targetMember.phone = srcMember.phone;
  }

  srcMember.cspanId = srcMember.cspanId?.trim();
  if (isNeedUpdate(targetMember.id, source, "cspanId", targetMember.cspanId, srcMember.cspanId)) {
    targetMember.cspanId = srcMember.cspanId;
  }

  srcMember.twitterId = srcMember.twitterId?.trim();
  if (isNeedUpdate(targetMember.id, source, "twitterId", targetMember.twitterId, srcMember.twitterId)) {
    targetMember.twitterId = srcMember.twitterId;
  }

  if (isNeedUpdate(targetMember.id, source, "facebookId", targetMember.facebookId, srcMember.facebookId)) {
    targetMember.facebookId = srcMember.facebookId;
  }

  srcMember.youtubeId = srcMember.youtubeId?.trim();
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

export function isNeedUpdate(memeberId: string, source: MemberSrc, field: string, oldData: any, newData: any, needNewLine: boolean = false): boolean {
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
