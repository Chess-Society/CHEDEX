const pages={card:'tarjeta',history:'historial',profiles:'perfiles',account:'cuenta'};
const tabs={tournaments:'torneos',achievements:'logros',statistics:'estadisticas',games:'partidas'};

export function appPath(page='card',tab='tournaments') {
  const segment=pages[page]||pages.card;
  return `/app/${segment}${page==='history'?'/'+(tabs[tab]||tabs.tournaments):''}`;
}
export function parseAppPath(path,legacyHash='') {
  if(path==='/app' || path==='/app/'){
    const [page,tab]=legacyHash.replace(/^#/,'').split('/');
    return {page:pages[page]?page:'card',tab:tabs[tab]?tab:'tournaments'};
  }
  const parts=path.split('/');
  if(parts[0]!=='' || parts[1]!=='app' || parts.length<3 || parts.length>4)return null;
  const page=Object.keys(pages).find(key=>pages[key]===parts[2]);
  if(!page)return null;
  if(parts.length===3)return {page,tab:'tournaments'};
  const tab=Object.keys(tabs).find(key=>tabs[key]===parts[3]);
  return page==='history'&&tab?{page,tab}:null;
}
