/**
 * PixelWeave site-wide shell.
 * The ONLY source of truth for section labels, paths, ordering and active state.
 * All standalone pages mount this module. Never duplicate navigation markup.
 */
export const SITE_SECTIONS=Object.freeze([
 Object.freeze({id:'gallery',group:'总览',label:'作品画廊',short:'GALLERY',path:'index.html#gallery'}),
 Object.freeze({id:'studio',group:'创作',label:'创作工作站',short:'STUDIO',path:'index.html#studio'}),
 Object.freeze({id:'pixelize',group:'创作',label:'图片像素化',short:'PIXELIZE',path:'pixelize/'}),
 Object.freeze({id:'workspace',group:'创作',label:'素材工作台',short:'ASSETS',path:'workspace/'}),
 Object.freeze({id:'atlas',group:'研究',label:'动画参考库',short:'ATLAS',path:'references/'}),
 Object.freeze({id:'lab',group:'研究',label:'学习实验室',short:'LEARNING',path:'knowledge/pixel-art/lab.html'})
]);
export const SITE_VERSION='v0.8';
const ROOT=new URL('../',import.meta.url);
export function siteUrl(id){
 const route=SITE_SECTIONS.find(x=>x.id===id);
 if(!route)throw Error('Unknown site navigation section: '+id);
 return new URL(route.path,ROOT).href;
}
export function currentSection(pathname,hash=''){
 const path=pathname.replace(/\/+$/,'/');
 if(/\/pixelize\/(?:index\.html)?$/.test(path))return 'pixelize';
 if(/\/workspace\/(?:index\.html)?$/.test(path))return 'workspace';
 if(/\/references\/(?:index\.html)?$/.test(path))return 'atlas';
 if(/\/knowledge\/pixel-art\/lab\.html$/.test(path))return 'lab';
 return hash==='#studio'?'studio':'gallery';
}
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
export function syncSiteNavigation(){
 const id=currentSection(location.pathname,location.hash);
 const header=document.querySelector('[data-pw-header]');
 if(!header)return id;
 for(const link of header.querySelectorAll('[data-pw-nav]')){
  const active=link.dataset.pwNav===id;
  link.classList.toggle('is-active',active);
  if(active)link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
 }
 return id;
}
export function mountSiteNavigation(){
 const host=document.querySelector('[data-pw-header]');
 if(!host)throw Error('PixelWeave shared header mount point is missing');
 // Duplicate mounting (or import from another app module) never duplicates links.
 if(host.dataset.pwMounted==='true')return syncSiteNavigation();
 const brand=el('a','pw-brand');brand.href=siteUrl('gallery');brand.setAttribute('aria-label','PixelWeave · 返回作品画廊');
 const glyph=el('span','pw-logo-mark');glyph.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++)glyph.append(el('i'));
 const identity=el('span','pw-brand-name');
 identity.append(el('b','', 'pixel'),el('b','pw-brand-accent','weave'));
 identity.append(el('small','','ANIMATION LAB'));
 brand.append(glyph,identity);
 const nav=el('nav','pw-main-nav');nav.setAttribute('aria-label','主导航');
 let group,groupName;
 for(const item of SITE_SECTIONS){
  if(item.group!==groupName){
   groupName=item.group;group=el('div','pw-nav-group');
   group.append(el('span','pw-nav-group-label',groupName));nav.append(group);
  }
  const link=el('a','pw-nav-link');link.href=siteUrl(item.id);
  link.dataset.pwNav=item.id;
  if(item.id==='gallery'||item.id==='studio')link.dataset.page=item.id;
  link.append(document.createTextNode(item.label+' '),el('span','',item.short));
  group.append(link);
 }
 const actions=el('div','pw-header-actions');
 const status=el('span','pw-site-status');
 status.append(el('i','pw-status-led'),document.createTextNode('PIXELWEAVE · '+SITE_VERSION));
 const source=el('a','pw-source','GITHUB ↗');source.href='https://github.com/Tera-Dark/PixelWeave';
 source.target='_blank';source.rel='noopener noreferrer';
 actions.append(status,source);
 host.replaceChildren(brand,nav,actions);
 host.dataset.pwMounted='true';
 syncSiteNavigation();
 window.addEventListener('hashchange',syncSiteNavigation);
 window.addEventListener('popstate',syncSiteNavigation);
 return host;
}
