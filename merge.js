// Fusión a 3 bandas por entidad (base = último estado sincronizado). Sin sobrescrituras silenciosas.
const J=JSON.stringify,own=s=>({teams:Object.fromEntries(s.teams.map(t=>[t.id,{name:t.name,manual:t.manual,owner:t.owner,group:t.group,slot:t.slot}])),
  matches:Object.fromEntries(s.matches.map(m=>[m.id,{hg:m.hg,ag:m.ag,pk:m.pk,manual:m.manual,date:m.date}])),events:Object.fromEntries(s.events.map(e=>[e.id,e]))});
export function merge3(base,local,remote){
  const B=own(base),L=own(local),R=own(remote),conflicts=[],out=structuredClone(remote);
  const pick=(kind,id)=>{const b=B[kind][id],l=L[kind][id],r=R[kind][id];
    if(J(l)===J(r))return l; if(J(l)===J(b))return r; if(J(r)===J(b))return l; conflicts.push({kind,id,local:l,remote:r}); return r;};
  for(const t of out.teams){const v=pick('teams',t.id);if(v)Object.assign(t,v);}
  for(const m of out.matches){const v=pick('matches',m.id);if(v)Object.assign(m,v);}
  const ids=new Set([...Object.keys(L.events),...Object.keys(R.events)]);out.events=[];
  for(const id of ids){const v=pick('events',id);if(v)out.events.push(v);} // alta/baja en un solo lado se respeta
  out.log=[...remote.log,...local.log.filter(x=>!remote.log.some(y=>y.at===x.at&&y.msg===x.msg))];
  return {merged:out,conflicts};
}
export const snapshot=s=>structuredClone(s);
