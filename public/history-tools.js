export const modes=['Clásicas','Rápidas','Blitz','Otras'];
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es');

export function filterHistory(entries,{kind='',search='',year='',mode='',sort='newest',scored=false}={}) {
  const term=normalize(search.trim());
  return entries.filter(e=>(!kind||e.kind===kind)&&(!term||normalize(e.data.name).includes(term))&&(!year||e.data.date.startsWith(`${year}-`))&&(!mode||(e.kind==='tournaments'&&e.data.mode===mode))&&(!scored||(e.kind==='tournaments'&&e.data.points!==null&&e.data.rounds>0)))
    .sort((a,b)=>{
      const date=a.data.date.localeCompare(b.data.date),name=a.data.name.localeCompare(b.data.name,'es');
      return (sort==='name'?name:sort==='oldest'?date:-date)||a.id.localeCompare(b.id);
    });
}

export function historyOptions(query) {
  const value=key=>query.get(key)||'';
  const kind=value('kind'),year=value('year'),mode=value('mode'),sort=value('sort')||'newest';
  const offset=Number(value('offset')||0);
  if((kind&&!['tournaments','achievements'].includes(kind))||(year&&!/^\d{4}$/.test(year))||(mode&&!modes.includes(mode))||!['newest','oldest','name'].includes(sort)||!Number.isSafeInteger(offset)||offset<0||offset>10000||value('search').length>140)throw new Error('Filtros no válidos.');
  return {kind,year,mode,sort,search:value('search'),offset,scored:value('scored')==='true'};
}

export function tournamentDraft(data,today,lastMode='Rápidas') {
  if(!data)return {date:today,mode:modes.includes(lastMode)?lastMode:'Rápidas'};
  return {name:data.name,date:today,mode:data.mode,city:data.city,organizer:data.organizer,timeControl:data.timeControl};
}
