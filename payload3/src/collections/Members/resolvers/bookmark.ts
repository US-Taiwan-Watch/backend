import { memberRelationship } from './relationship';

export const bookmarkUstwArticleResolver = memberRelationship('bookmarkUstwArticles');
export const unbookmarkUstwArticleResolver = memberRelationship('bookmarkUstwArticles', true);
export const bookmarkKetagalanArticleResolver = memberRelationship('bookmarkKetagalanArticles');
export const unbookmarkKetagalanArticleResolver = memberRelationship('bookmarkKetagalanArticles', true);
