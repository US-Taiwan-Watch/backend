import { fetchAllData } from './dataFetch';
import {
  processCommittees,
  processExperiences,
  processSocialMedia,
  processTerms,
  processPhoto,
} from './dataProcess';
import { translateToChinese } from './dataTranslate';
import { generateBiography } from './dataGenerate';

type ComposePersonArgs = {
  baseUrl: string;
  bioGuideId: string;
  detail: 'full' | 'partial';
};

export const composePeople = async ({ baseUrl, bioGuideId, detail }: ComposePersonArgs) => {
  const data = await fetchAllData(baseUrl);

  const legislator = data.allLegislators.find(l => l.id && l.id.bioguide === bioGuideId);
  if (!legislator) {
    const err: any = new Error(`Legislator ${bioGuideId} not found.`);
    err.statusCode = 400;
    throw err;
  }

  const links = processSocialMedia(legislator, data.legislatorsSocialMedia);
  const committees = processCommittees(bioGuideId, data.committeeMembershipCurrent, data.allCommittees);
  const { rawTerms, finalPositions, partyChangeRecords } = processTerms(legislator);
  const experiences = processExperiences(finalPositions, data.categoriesData);

  const enI18nBase = {
    firstName: legislator.name.first,
    lastName: legislator.name.last,
    displayName: `${legislator.name.first} ${legislator.name.last}`,
  };

  const enI18n =
    detail === 'full'
      ? { ...enI18nBase, bio: (await generateBiography(bioGuideId)).en }
      : enI18nBase;

  const zhI18n = await translateToChinese(enI18n);

  const baseResponse = {
    // i18n: { en: enI18n, zh: zhI18n },
    i18n: { en: enI18n, zh: zhI18n },
    birthday: {
      datetime: `${legislator.bio.birthday}T00:00:00.000Z`,
      precision: ['year', 'month', 'day'],
    },
    gender: legislator.bio.gender === 'F' ? 'female' : 'male',
    congressionalData: {
      bioGuideId: legislator.id.bioguide,
      govTrackId: legislator.id.govtrack ?? null,
      committees,
    },
    experiences,
    links,
    partyChangeRecords,
    displayName: `${legislator.name.first} ${legislator.name.last}`,
    govTrackId: legislator.id.govtrack ? String(legislator.id.govtrack) : null,
    currentParty: rawTerms.length > 0 ? rawTerms[rawTerms.length - 1].party : 'unknown',
  };

  if (detail === 'partial') {
    return baseResponse;
  }

  const photoId = await processPhoto(
    bioGuideId,
    `${legislator.name.first} ${legislator.name.last}`,
    baseUrl
  );

  return {
    ...baseResponse,
    photo: photoId,
    bio: (enI18n as any).bio, // 保留你現在 response 的 shape（full 才有）
  };
};
