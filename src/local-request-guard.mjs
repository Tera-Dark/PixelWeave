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
 // Browsers report requests initiated from another origin as same-site or
 // cross-site. Neither is permitted to invoke a localhost model API.
 if(site&&site!=='same-origin'&&site!=='none')return false;
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

/** Files served by the localhost preview must never include local credentials,
 * git metadata, dependencies, test fixtures or the server implementation. */
export function isPublicProjectPath(pathname){
 if(typeof pathname!=='string'||!pathname.startsWith('/'))return false;
 const parts=pathname.split('/').filter(Boolean);
 if(parts.some(s=>s.startsWith('.')||['node_modules','tests','secrets','private','tools'].includes(s)))return false;
 if(parts.length===1&&['dev-server.mjs','package-lock.json','package.json'].includes(parts[0]))return false;
 return true;
}
