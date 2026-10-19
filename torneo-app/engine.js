// Motor de reglas (sin UI). Reproduce el Excel "Torneo_Formato_Original.xlsx".
export const GROUPS = [...'ABCDEFGH'];
// Calendario por grupo (hoja 'Fase de Grupos'): [local_slot, visitante_slot] por jornada
const SCHED = [[[1,3],[2,4]],[[4,1],[3,2]],[[3,1],[4,2]],[[1,4],[2,3]]];
// Cuadro (hoja 'Eliminatorias'): [id, ronda, ref_local, ref_visit]; 1/2=puesto en grupo, W/L=ganador/perdedor
export const KO = [
 ['O1','Octavos',['1','A'],['2','B']],['O2','Octavos',['1','C'],['2','D']],['O3','Octavos',['1','E'],['2','F']],['O4','Octavos',['1','G'],['2','H']],
 ['O5','Octavos',['1','B'],['2','A']],['O6','Octavos',['1','D'],['2','C']],['O7','Octavos',['1','F'],['2','E']],['O8','Octavos',['1','H'],['2','G']],
 ['Q1','Cuartos',['W','O1'],['W','O2']],['Q2','Cuartos',['W','O3'],['W','O4']],['Q3','Cuartos',['W','O5'],['W','O6']],['Q4','Cuartos',['W','O7'],['W','O8']],
 ['S1','Semifinal',['W','Q1'],['W','Q2']],['S2','Semifinal',['W','Q3'],['W','Q4']],
 ['T3','3.er puesto',['L','S1'],['L','S2']],['FIN','Final',['W','S1'],['W','S2']]];
export const EVENT_TYPES = ['Gol','Asistencia','Amarilla','Roja','Autogol'];
const pad = n => String(n).padStart(2,'0');
export const played = m => Number.isInteger(m.hg) && Number.isInteger(m.ag);
export function shuffle(a, rng = Math.random){ a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// Sorteo: 16 equipos por jugador; cada grupo = 2 del jugador 0 (slots 1,2) + 2 del jugador 1 (slots 3,4)
export function createTournament({name='Torneo',players=['Jugador A','Jugador B'],teams,pts={v:3,e:1},rng=Math.random,template=''}){
  if(teams.length!==32) throw new Error('Se requieren exactamente 32 equipos');
  const base = teams.map((t,i)=>({...t,id:'t'+pad(i+1)}));
  const T = shuffle(base,rng).map((t,i)=>{const owner=i<16?0:1,k=i%16;return {...t,owner,group:GROUPS[k>>1],slot:(k&1)+1+(owner?2:0),manual:0};});
  const at=(g,s)=>T.find(t=>t.group===g&&t.slot===s).id;
  const matches=[]; let n=0;
  SCHED.forEach((jd,j)=>GROUPS.forEach(g=>jd.forEach(([a,b])=>matches.push({id:'G'+pad(++n),phase:'G',round:j+1,group:g,home:at(g,a),away:at(g,b),hg:null,ag:null,date:''}))));
  KO.forEach(([id,round])=>matches.push({id,phase:'K',round,hg:null,ag:null,pk:[null,null],manual:'',date:''}));
  return {v:1,id:'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,template,players:[...players],pts,teams:T,matches,events:[],log:[],rev:1,created:new Date().toISOString()};
}

// Tabla de grupo. Orden: Pts, DG, GF, fair play (amarilla=1, roja=3; menos es mejor), desempate manual (mayor arriba), posición de sorteo
export function standings(s,g){
  const rows=s.teams.filter(t=>t.group===g).map(t=>({id:t.id,name:t.name,owner:t.owner,slot:t.slot,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0,y:0,r:0,fp:0,man:t.manual||0}));
  const by=Object.fromEntries(rows.map(r=>[r.id,r]));
  const add=(r,f,c)=>{r.pj++;r.gf+=f;r.gc+=c;if(f>c){r.g++;r.pts+=s.pts.v}else if(f===c){r.e++;r.pts+=s.pts.e}else r.p++;};
  for(const m of s.matches){ if(m.phase!=='G'||m.group!==g||!played(m))continue; add(by[m.home],m.hg,m.ag); add(by[m.away],m.ag,m.hg); }
  for(const e of s.events){ const r=by[e.team]; if(!r||!String(e.match).startsWith('G'))continue; if(e.type==='Amarilla')r.y++; if(e.type==='Roja')r.r++; }
  rows.forEach(r=>{r.dg=r.gf-r.gc;r.fp=r.y+3*r.r;});
  return rows.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||Math.min(a.fp,999)-Math.min(b.fp,999)||Math.min(b.man,9)-Math.min(a.man,9)||a.slot-b.slot);
}
export const groupDone=(s,g)=>s.matches.filter(m=>m.phase==='G'&&m.group===g&&played(m)).length===8;

// Cuadro resuelto: los equipos entran solos al cerrar cada grupo/ronda. Ganador = manual > goles > penales
export function bracket(s){
  const out={},tm=Object.fromEntries(s.teams.map(t=>[t.id,t])),cache={};
  const st=g=>cache[g]??=standings(s,g);
  const ref=([k,x])=>{
    if(k==='1'||k==='2')return groupDone(s,x)?{id:st(x)[k-1].id}:{label:`${k}º Grupo ${x}`};
    const m=out[x],w=m?.winner;
    if(k==='W')return w?{id:w}:{label:'Ganador '+x};
    const o=w&&(m.home.id===w?m.away:m.home); return o?.id?{id:o.id}:{label:'Perdedor '+x};
  };
  for(const d of KO){
    const sm=s.matches.find(m=>m.id===d[0]),home=ref(d[2]),away=ref(d[3]),pl=played(sm);
    let winner=null;
    if(sm.manual)winner=sm.manual;
    else if(pl&&home.id&&away.id){
      if(sm.hg>sm.ag)winner=home.id; else if(sm.ag>sm.hg)winner=away.id;
      else{const[a,b]=sm.pk||[];if(Number.isInteger(a)&&Number.isInteger(b)&&a!==b)winner=a>b?home.id:away.id;}
    }
    const same=!!(home.id&&away.id&&tm[home.id].owner===tm[away.id].owner);
    const warn=same?'Mismo dueño: elige quién avanza (regalo de cupo)':(pl&&sm.hg===sm.ag&&!winner)?'Empate: registra penales o define ganador manual':(sm.manual&&sm.manual!==home.id&&sm.manual!==away.id)?'El equipo manual no juega este partido':'';
    out[d[0]]={...sm,home,away,played:pl,winner,warn,sameOwner:same,duelOwner:(pl&&winner&&!same&&tm[winner])?tm[winner].owner:null};
  }
  return out;
}

// Goles registrados en eventos vs marcador (columna M/Q del Excel)
export function goalCheck(s,m,home,away){
  const c=(team,type)=>s.events.filter(e=>e.match===m.id&&e.team===team&&e.type===type).length;
  const h=c(home,'Gol')+c(away,'Autogol'),a=c(away,'Gol')+c(home,'Autogol');
  return {h,a,ok:played(m)&&h===m.hg&&a===m.ag,total:h+a};
}

// Acumulados por jugador (clave: nombre sin distinguir mayúsculas + club, como COUNTIFS) y tops de 30
export function rankings(s){
  const P=new Map();
  s.events.forEach((e,i)=>{ if(!e.player||!e.team)return; const k=e.team+'|'+e.player.trim().toLowerCase();
    if(!P.has(k))P.set(k,{player:e.player.trim(),team:e.team,first:i,g:0,a:0,y:0,r:0,og:0});
    const p=P.get(k); if(e.type==='Gol')p.g++; if(e.type==='Asistencia')p.a++; if(e.type==='Amarilla')p.y++; if(e.type==='Roja')p.r++; if(e.type==='Autogol')p.og++; });
  const all=[...P.values()].map(p=>({...p,pts:p.y+3*p.r}));
  const top=(f,sort,val)=>{const l=all.filter(f).sort((x,y)=>sort(x,y)||x.first-y.first).slice(0,30);return l.map(p=>({...p,pos:l.filter(q=>val(q)>val(p)).length+1}));};
  return {
    scorers:top(p=>p.g>0,(x,y)=>y.g-x.g||y.a-x.a,p=>p.g),       // goles, desempate asistencias; autogoles no cuentan
    assists:top(p=>p.a>0,(x,y)=>y.a-x.a||y.g-x.g,p=>p.a),
    discipline:top(p=>p.y+p.r>0,(x,y)=>y.pts-x.pts||y.r-x.r,p=>p.pts)};
}

// Panel 'Inicio': duelo entre jugadores, estadísticas y podio
export function summary(s){
  const B=bracket(s),own=Object.fromEntries(s.teams.map(t=>[t.id,t.owner])),K=Object.values(B);
  const pg=s.matches.filter(m=>m.phase==='G'&&played(m)),pk=K.filter(m=>m.played);
  const wins=[0,0],gf=[0,0],gpts=[0,0],oct=[0,0];let draws=0;
  pg.forEach(m=>{ if(m.hg===m.ag)draws++; else wins[own[m.hg>m.ag?m.home:m.away]]++; gf[own[m.home]]+=m.hg; gf[own[m.away]]+=m.ag; });
  K.forEach(m=>{ if(m.duelOwner!=null)wins[m.duelOwner]++; if(m.played){ if(m.home.id)gf[own[m.home.id]]+=m.hg; if(m.away.id)gf[own[m.away.id]]+=m.ag; } });
  GROUPS.forEach(g=>standings(s,g).forEach(r=>gpts[r.owner]+=r.pts));
  K.slice(0,8).forEach(m=>[m.home,m.away].forEach(x=>{if(x.id)oct[own[x.id]]++;}));
  const goals=pg.reduce((a,m)=>a+m.hg+m.ag,0)+pk.reduce((a,m)=>a+m.hg+m.ag,0),n=pg.length+pk.length,cnt=t=>s.events.filter(e=>e.type===t).length;
  const fin=B.FIN,sub=fin.winner&&(fin.home.id===fin.winner?fin.away.id:fin.home.id);
  return {wins,draws,gpts,gf,oct,played:n,goals,gpm:n?goals/n:0,yellow:cnt('Amarilla'),red:cnt('Roja'),assists:cnt('Asistencia'),
    groupPlayed:pg.length,koPlayed:pk.filter(m=>m.id!=='T3').length,champion:fin.winner||null,runnerUp:sub||null,third:B.T3.winner||null,bracket:B};
}

// Configuraciones inválidas: solo advierte, nunca modifica datos
export function validate(s){
  const w=[],names=s.teams.map(t=>t.name.trim().toLowerCase());
  if(s.teams.length!==32)w.push('Debe haber 32 equipos');
  if(s.teams.filter(t=>t.owner===0).length!==16)w.push('Cada jugador debe tener 16 equipos');
  new Set(names.filter((n,i)=>names.indexOf(n)!==i)).forEach(n=>w.push('Nombre repetido: '+n));
  s.teams.filter(t=>/^Por definir/i.test(t.name)).forEach(t=>w.push('Equipo pendiente de definir: '+t.name));
  return w;
}
