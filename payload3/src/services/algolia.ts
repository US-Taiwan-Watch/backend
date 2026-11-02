import { APIError } from 'payload';
import { required } from '../runtime/config';
export const searchTypes = ['people','bill','ustw-article','ketagalan-article'] as const;
type SearchType = typeof searchTypes[number];
type SearchOptions = { searchTerm?: string; limit: number; page: number; filter?: SearchType };
async function indexRequest(suffix: string, method: string, body?: any, write = false) {
  try {
    const response = await fetch(`https://3dwakufor9.algolia.net/1/indexes/ustw-website${suffix}`, {
      method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'content-type':'application/json','x-algolia-application-id':'3DWAKUFOR9','x-algolia-api-key':required(write?'ALGOLIA_WRITE_KEY':'ALGOLIA_SEARCH_KEY') },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw Error('Rejected');
    return await response.json();
  } catch { throw new APIError(write ? 'Search indexing is temporarily unavailable. The CMS change was not saved. Please retry.' : 'Search is temporarily unavailable. Please retry.',502); }
}
async function change(id: string, data?: any) {
  if (!/^[a-f0-9]{24}$/i.test(id) || (data && !searchTypes.includes(data.type))) throw new APIError('Invalid search record.',400);
  const result = await indexRequest('/batch','POST',{requests:[{action:data?'partialUpdateObject':'deleteObject',body:data?{...data,objectID:id}:{objectID:id}}]},true);
  if (!Number.isSafeInteger(result.taskID)) throw new APIError('Invalid search acknowledgement.',502);
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
    const task=await indexRequest(`/task/${result.taskID}`,'GET',undefined,true);
    if(task.status==='published')return;
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new APIError('Search indexing did not finish. Please retry the CMS change.',502);
}
export const upsertAlgoliaRecord = async (id: string,data: any) => change(id,data);
export const deleteAlgoliaRecord = async (id: string) => change(id);
export const searchGroupedByType = async ({searchTerm='',limit,page,filter}:SearchOptions) => {
  const blank=()=>({ids:[] as string[],highlights:[] as any[],snippets:[] as any[]});
  const counts={people:0,bill:0,'ustw-article':0,'ketagalan-article':0};
  const categories={people:blank(),bill:blank(),'ustw-article':blank(),'ketagalan-article':blank()};
  const result=await indexRequest('/query','POST',{
    query:searchTerm,hitsPerPage:limit,page:page-1,facets:['type'],...(filter?{filters:`type:"${filter}"`}:{}),
    attributesToSnippet:['i18n.en.title:35','i18n.zh.title:35','i18n.en.summary:35','i18n.zh.summary:35','i18n.en.displayName:35','i18n.zh.displayName:35','i18n.en.bio:35','i18n.zh.bio:35','title:35','excerpt:35'],snippetEllipsisText:'…',
  });
  if(!Array.isArray(result.hits))throw new APIError('Invalid search response.',502);
  for(const type of searchTypes)counts[type]=result.facets?.type?.[type]||0;
  for(const hit of result.hits){
    if(!searchTypes.includes(hit.type)||!/^[a-f0-9]{24}$/i.test(hit.objectID))continue;
    const category=categories[hit.type as SearchType];category.ids.push(hit.objectID);category.highlights.push({...hit._highlightResult,id:hit.objectID});category.snippets.push({...hit._snippetResult,id:hit.objectID});
  }
  return {counts,categories};
};
