/**
 * Local-only server guard. Binding to 127.0.0.1 by itself does not guarantee
 * hostile websites cannot reach the user's browser-local HTTP services.
 * Reject DNS-rebinding Host headers, foreign Origin and Fetch Metadata.
 */
export const LOCAL_HOSTS=new Set(['127.0.0.1:4173','localhost:4173']);
export function localRequestAllowed(headers={}){
 const host=(headers.host||'').toLowerCase();
 if(!LOCAL_HOSTS.has(host))return false;
 const site=(headers['sec-fetch-site']||'').toLowerCase();
 if(site==='cross-site'||site==='same-site'&&headers.origin&&new URL(headers.origin).host.toLowerCase()!==host)return false;
 const origin=headers.origin;
 if(origin){
  let url;
  try{url=new URL(origin);}catch{return false;}
  if(url.protocol!=='http:'||url.host.toLowerCase()!==host)return false;
 }
 return true;
}
export function localApiRequestAllowed(headers={},method='GET'){
 if(!localRequestAllowed(headers))return false;
 if(method==='POST'&&!/^application\/json(?:\s*;|$)/i.test(headers['content-type']||''))return false;
 return true;
}
