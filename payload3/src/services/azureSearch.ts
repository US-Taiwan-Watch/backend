import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { APIError } from 'payload';
import { required } from '../runtime/config';
function client() {
  const endpoint=required('AZURE_SEARCH_ENDPOINT'),url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.endsWith('.search.windows.net')||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid Azure search destination');
  return new SearchClient(endpoint,required('AZURE_SEARCH_INDEX'),new AzureKeyCredential(required('AZURE_SEARCH_API_KEY')),{retryOptions:{maxRetries:0}});
}
export async function upsertAzureSearchRecord(id:string,data:any){
  try{const r=await client().mergeOrUploadDocuments([{id,...data}]);if(r.results.some(x=>!x.succeeded))throw Error('Rejected');}
  catch{throw new APIError('Bill search indexing is temporarily unavailable. Please retry.',502);}
}
export async function deleteAzureSearchRecord(id:string){
  try{const r=await client().deleteDocuments([{id}]);if(r.results.some(x=>!x.succeeded))throw Error('Rejected');}
  catch{throw new APIError('Bill search indexing is temporarily unavailable. Please retry.',502);}
}
export async function findAzureSearchRelated(text:string,top=5){
  try{const result=await client().search(text,{top});const hits=[];for await(const row of result.results)hits.push({score:row.score??0,doc:row.document});return hits;}
  catch{throw new APIError('Related bill search is temporarily unavailable.',502);}
}
