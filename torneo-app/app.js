import {createTournament,standings,summary,rankings,goalCheck,validate,groupDone,GROUPS,EVENT_TYPES,played} from './engine.js';
import {TEMPLATES,buildTeams} from './templates.js';
import * as sync from './sync.js';
const $=s=>document.querySelector(s),app=$('#app'),dlg=$('#dlg');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db=JSON.parse(localStorage.getItem('torneos')||'{"list":[]}'),cur=null,tab='panel';
const save=()=>{try{localStorage.setItem('torneos',JSON.stringify(db))}catch{alert('No se pudo guardar: almacenamiento lleno')}};
const T=()=>db.list.find(t=>t.id===cur);
const tn=(s,r)=>r?.id?s.teams.find(t=>t.id===r.id).name:(r?.label||'—');
const nm=(s,id)=>s.teams.find(t=>t.id===id)?.name||id;
const dot=o=>`<span class="dot${'AB'[o]}"></span>`;
let status='local',tm=null;
const label={local:'💾 solo local',ok:'☁ sincronizado',offline:'📴 cambios pendientes',error:'⚠ error de sync',conflict:'⚠ conflicto',syncing:'⟳ sincronizando'};
const runSync=async()=>{const s=T();if(!s?.sync)return;status='syncing';const r=await sync.syncNow(s);status=r.state;if(r.msg)console.warn(r.msg);save();if(!dlg.open)render();if(r.state==='conflict')conflictDlg();};
const queueSync=s=>{if(!s.sync)return;status=navigator.onLine?'syncing':'offline';clearTimeout(tm);tm=setTimeout(runSync,1200)};
const touch=(s,msg)=>{s.rev++;s.log.push({at:new Date().toISOString(),msg});if(s.log.length>200)s.log.shift();save();queueSync(s)};
setInterval(()=>{if(cur&&!dlg.open)runSync()},10000);addEventListener('online',()=>runSync());
function conflictDlg(){const s=T(),c=s.sync.pendingConflicts||[];if(!c.length)return;dlg.innerHTML=`<h2>⚠ Conflicto de edición</h2><p>La otra persona cambió lo mismo que tú:</p>${c.map(x=>`<div class="card mu">${x.kind==='matches'?'Partido':x.kind==='teams'?'Equipo':'Evento'} ${esc(x.id)}<br>Tuyo: ${esc(JSON.stringify(x.local)||'(borrado)')}<br>Del otro: ${esc(JSON.stringify(x.remote)||'(borrado)')}</div>`).join('')}<div class="row"><button data-a="mine">Usar lo mío</button><button class="g" data-a="theirs">Usar lo del otro</button></div>`;if(!dlg.open)dlg.showModal();}
const pct=(a,b)=>`<div class="bar"><i style="width:${Math.round(100*a/b)}%"></i></div>`;

function home(){
  app.innerHTML=`<h1>⚽ Torneos Virtuales</h1><button class="hero" data-a="new">＋ Crear nuevo torneo</button><button class="g in" style="margin-top:8px" data-a="joind">🔗 Unirme con código de invitación</button>
  <h2>Plantillas</h2><div class="grid">${TEMPLATES.map(t=>`<button class="g" data-a="tpl" data-i="${t.id}">${t.icon} <b>${esc(t.name)}</b><br><span class="mu">${esc(t.edition)}</span></button>`).join('')}</div>
  <h2>Mis torneos</h2>${db.list.length?db.list.map(s=>{const u=summary(s),tot=79;const done=u.played;return `<div class="card"><div class="row sp"><b>${esc(s.name)}</b><span class="tag ${u.champion?'ok':''}">${u.champion?'Finalizado':'En curso'}</span></div>
  <div class="mu">${esc(s.players[0])} vs ${esc(s.players[1])} · ${done}/80 partidos</div>${pct(done,80)}<div class="row" style="margin-top:8px"><button data-a="open" data-i="${s.id}">Continuar</button><button class="g" data-a="del" data-i="${s.id}">Borrar</button></div></div>`}).join(''):'<p class="mu">Aún no hay torneos. Crea el primero con una plantilla.</p>'}
  <p class="mu">💾 Los datos se guardan en este dispositivo; para compartir con el otro jugador usa «Compartir» dentro del torneo (requiere configurar Supabase, ver README).</p>`;$('#nav').innerHTML='';
}
function newDlg(id){
  const tpl=TEMPLATES.find(t=>t.id===id)||TEMPLATES[0];
  dlg.innerHTML=`<h2>Nuevo torneo</h2><label class="mu">Plantilla</label><select id="f-t" class="in">${TEMPLATES.map(t=>`<option value="${t.id}" ${t.id===tpl.id?'selected':''}>${esc(t.name)} · ${esc(t.edition)}</option>`).join('')}</select>
  <label class="mu">Nombre</label><input id="f-n" class="in" value="${esc(tpl.name)} ${new Date().getFullYear()}"><div class="grid"><div><label class="mu">Jugador 1 (azul)</label><input id="f-1" class="in" value="Jugador 1"></div><div><label class="mu">Jugador 2 (naranja)</label><input id="f-2" class="in" value="Jugador 2"></div></div>
  <div class="grid"><div><label class="mu">Pts victoria</label><input id="f-v" class="in" type="number" value="3"></div><div><label class="mu">Pts empate</label><input id="f-e" class="in" type="number" value="1"></div></div>
  <p class="mu">Se sortean al azar los 32 equipos entre ambos jugadores y los 8 grupos (2+2). El formato es el del Excel y no cambia entre plantillas.</p><div class="row"><button data-a="make">Sortear y crear</button><button class="g" data-a="close">Cancelar</button></div>`;dlg.showModal();
}
function make(){
  const tpl=TEMPLATES.find(t=>t.id===$('#f-t').value);
  const s=createTournament({name:$('#f-n').value||tpl.name,players:[$('#f-1').value||'Jugador 1',$('#f-2').value||'Jugador 2'],teams:buildTeams(tpl),pts:{v:+$('#f-v').value||3,e:+$('#f-e').value||0},template:tpl.id});
  s.log.push({at:new Date().toISOString(),msg:'Torneo creado (sorteo)'});db.list.unshift(s);save();dlg.close();cur=s.id;tab='teams';render();
}
function nav(){const t=[['panel','🏠','Panel'],['matches','📅','Partidos'],['groups','📊','Grupos'],['ko','🏆','Cuadro'],['stats','⭐','Stats'],['teams','👥','Equipos']];
  $('#nav').innerHTML=t.map(([k,i,l])=>`<button class="${tab===k?'on':''}" data-a="tab" data-i="${k}">${i}<br>${l}</button>`).join('');}
const mcard=(s,m,h,a,B)=>{const pl=played(m),w=B?B.warn:'';return `<div class="card"><div class="mu row sp"><span>${m.id} · ${m.phase==='G'?'Grupo '+m.group+' · J'+m.round:m.round}${m.date?' · '+esc(m.date):''}</span><span class="tag ${pl?'ok':''}">${pl?'Jugado':'Pendiente'}</span></div>
 <div class="m" data-a="match" data-i="${m.id}"><div class="t">${h.o!=null?dot(h.o):''}${esc(h.n)}</div><b>${pl?m.hg+' - '+m.ag:'vs'}${pl&&m.pk&&Number.isInteger(m.pk[0])&&m.hg===m.ag?`<small class="mu"> (${m.pk[0]}-${m.pk[1]})</small>`:''}</b><div class="u">${esc(a.n)}${a.o!=null?dot(a.o):''}</div></div>${w?`<div class="warn">⚠ ${w}</div>`:''}</div>`;};
const side=(s,r,id)=>{const t=id?s.teams.find(x=>x.id===id):r?.id?s.teams.find(x=>x.id===r.id):null;return{n:t?t.name:r?.label||'—',o:t?.owner,id:t?.id};};
function render(){
  const s=T();if(!s){cur=null;return home();}nav();const u=summary(s),B=u.bracket;let h=`<div class="row sp"><button class="g" data-a="home">‹ Inicio</button><b>${esc(s.name)}</b><span class="pill">${label[s.sync?status:'local']}</span></div>`;
  const warns=validate(s);
  if(tab==='panel'){
    h+=`<div class="card"><div class="row sp" style="text-align:center"><div class="A"><b>${esc(s.players[0])}</b><br><span style="font-size:32px">${u.wins[0]}</span></div><div class="mu">Empates<br><b>${u.draws}</b></div><div class="B"><b>${esc(s.players[1])}</b><br><span style="font-size:32px">${u.wins[1]}</span></div></div>
    <table><tr><td>${u.gpts[0]}</td><td style="text-align:center">Puntos en grupos</td><td>${u.gpts[1]}</td></tr><tr><td>${u.gf[0]}</td><td style="text-align:center">Goles a favor</td><td>${u.gf[1]}</td></tr><tr><td>${u.oct[0]}</td><td style="text-align:center">Clubes en octavos</td><td>${u.oct[1]}</td></tr></table></div>
    <div class="card"><b>★ Campeón:</b> ${u.champion?esc(nm(s,u.champion)):'—'}<br><b>Subcampeón:</b> ${u.runnerUp?esc(nm(s,u.runnerUp)):'—'}<br><b>Tercer puesto:</b> ${u.third?esc(nm(s,u.third)):'—'}</div>
    <div class="grid"><div class="card">Partidos<br><b>${u.played}</b> / 80</div><div class="card">Goles<br><b>${u.goals}</b> · ${u.gpm.toFixed(2)}/partido</div><div class="card">🟨 ${u.yellow} · 🟥 ${u.red}</div><div class="card">🅰 Asistencias ${u.assists}</div></div>
    <div class="card">Fase de grupos ${u.groupPlayed}/64${pct(u.groupPlayed,64)}<br>Eliminatorias ${u.koPlayed}/15${pct(u.koPlayed,15)}</div>
    ${warns.length?`<div class="card warn">${warns.map(w=>'⚠ '+esc(w)).join('<br>')}</div>`:''}
    <div class="card">${s.sync?`🔗 Código de invitación: <b>${esc(s.sync.code)}</b> · ${label[status]}<br><button class="g" data-a="syncnow">Sincronizar ahora</button>`:`<button class="g" data-a="share">🔗 Compartir con el otro jugador</button>`}</div>
    <div class="row"><button class="g" data-a="export">Exportar copia</button><button class="g" data-a="undo" ${s.log.some(l=>l.prev)?'':'disabled'}>↩ Deshacer último resultado</button></div>`;
  }
  if(tab==='matches'){
    for(let j=1;j<=4;j++){h+=`<h2>Jornada ${j}</h2>`;s.matches.filter(m=>m.phase==='G'&&m.round===j).forEach(m=>h+=mcard(s,m,side(s,0,m.home),side(s,0,m.away)));}
    h+='<h2>Eliminatorias</h2>';Object.values(B).forEach(m=>h+=mcard(s,m,side(s,m.home),side(s,m.away),m));
  }
  if(tab==='groups')GROUPS.forEach(g=>{const r=standings(s,g),d=groupDone(s,g);h+=`<h2>Grupo ${g} · ${s.matches.filter(m=>m.group===g&&played(m)).length}/8</h2><div class="card"><table><tr><th>#</th><th>Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>${r.map((x,i)=>`<tr class="${d&&i<2?'q':''}"><td>${i+1}</td><td>${dot(x.owner)}${esc(x.name)}${x.fp?` <span class="mu">FP${x.fp}</span>`:''}</td><td>${x.pj}</td><td>${x.g}</td><td>${x.e}</td><td>${x.p}</td><td>${x.gf}</td><td>${x.gc}</td><td>${x.dg}</td><td><b>${x.pts}</b></td></tr>`).join('')}</table></div>`});
  if(tab==='ko'){Object.values(B).forEach(m=>h+=mcard(s,m,side(s,m.home),side(s,m.away),m));h+='<p class="mu">3.er puesto opcional. Si se cruzan clubes del mismo jugador, elige quién avanza en «Ganador manual».</p>';}
  if(tab==='stats'){const R=rankings(s),tb=(t,l,c)=>`<h2>${t}</h2><div class="card">${l.length?`<table><tr><th>#</th><th>Jugador</th>${c.map(x=>`<th>${x[0]}</th>`).join('')}</tr>${l.map(p=>`<tr><td>${p.pos}</td><td>${dot(s.teams.find(x=>x.id===p.team).owner)}${esc(p.player)} <span class="mu">${esc(nm(s,p.team))}</span></td>${c.map(x=>`<td>${p[x[1]]}</td>`).join('')}</tr>`).join('')}</table>`:'<p class="mu">Sin datos todavía.</p>'}</div>`;
    h+=tb('Goleadores',R.scorers,[['G','g'],['A','a']])+tb('Asistencias',R.assists,[['A','a'],['G','g']])+tb('Disciplina',R.discipline,[['Pts','pts'],['🟨','y'],['🟥','r']]);}
  if(tab==='teams'){h+=`<p class="mu">Toca un nombre para editarlo. Desempate manual: solo si hay empate total en puntos, DG, GF y fair play (el número mayor queda arriba).</p>`;GROUPS.forEach(g=>{h+=`<h2>Grupo ${g}</h2><div class="card">${s.teams.filter(t=>t.group===g).sort((a,b)=>a.slot-b.slot).map(t=>`<div class="row sp"><span>${dot(t.owner)}<a data-a="ren" data-i="${t.id}" style="text-decoration:underline dotted">${esc(t.name)}</a></span><span class="mu">${esc(s.players[t.owner])} · desempate <input class="n" style="width:44px;min-height:32px;font-size:14px" type="number" min="0" max="9" data-a="man" data-i="${t.id}" value="${t.manual||0}"></span></div>`).join('')}</div>`});}
  app.innerHTML=h;
}
function matchDlg(id){
  const s=T(),B=summary(s).bracket,m=s.matches.find(x=>x.id===id),ko=m.phase==='K',b=ko?B[id]:null;
  const H=ko?side(s,b.home):side(s,0,m.home),A=ko?side(s,b.away):side(s,0,m.away);
  if(ko&&(!H.id||!A.id)&&!confirm('Este cruce aún no tiene los dos equipos definidos. ¿Registrar de todos modos?'))return;
  const evs=s.events.filter(e=>e.match===id),chk=H.id&&A.id?goalCheck(s,m,H.id,A.id):null;
  const names=[...new Set(s.events.map(e=>e.player))].map(p=>`<option value="${esc(p)}">`).join('');
  dlg.innerHTML=`<h2>${id} · ${esc(H.n)} vs ${esc(A.n)}</h2><div class="row sp"><input class="n" id="hg" type="number" min="0" inputmode="numeric" value="${m.hg??''}"><b>-</b><input class="n" id="ag" type="number" min="0" inputmode="numeric" value="${m.ag??''}"></div>
  <input id="dt" type="date" class="in" value="${esc(m.date)}" style="margin-top:8px">
  ${ko?`<div class="row" style="margin-top:8px"><span class="mu">Penales</span><input class="n" id="ph" type="number" min="0" value="${m.pk?.[0]??''}"><input class="n" id="pa" type="number" min="0" value="${m.pk?.[1]??''}"></div>
  <select id="mw" class="in" style="margin-top:8px"><option value="">Ganador manual / regalo de cupo: ninguno</option>${[H,A].filter(x=>x.id).map(x=>`<option value="${x.id}" ${m.manual===x.id?'selected':''}>Avanza: ${esc(x.n)}</option>`).join('')}</select>`:''}
  ${b?.warn?`<p class="warn">⚠ ${b.warn}</p>`:''}
  <div class="row" style="margin-top:10px"><button data-a="savem" data-i="${id}">Guardar</button><button class="g" data-a="clearm" data-i="${id}">Limpiar</button><button class="g" data-a="close">Cerrar</button></div>
  <h2>Eventos (goles, asistencias, tarjetas)</h2>${chk?`<p class="mu">Goles en eventos: ${chk.h}-${chk.a} ${played(m)?(chk.ok?'✔ coincide':'⚠ no coincide con el marcador'):''}</p>`:''}
  ${evs.map(e=>`<div class="row sp"><span>${e.min?e.min+"' ":''}${e.type} · ${esc(e.player)} <span class="mu">${esc(nm(s,e.team))}</span></span><button class="g" data-a="dele" data-i="${e.id}" data-m="${id}">✕</button></div>`).join('')}
  ${H.id&&A.id?`<div class="grid" style="margin-top:8px"><select id="et">${EVENT_TYPES.map(t=>`<option>${t}</option>`).join('')}</select><select id="etm"><option value="${H.id}">${esc(H.n)}</option><option value="${A.id}">${esc(A.n)}</option></select>
  <input id="ep" list="pl" placeholder="Jugador"><datalist id="pl">${names}</datalist><input id="emin" type="number" min="1" placeholder="Min (opcional)"></div><button data-a="adde" data-i="${id}" style="margin-top:8px;width:100%">＋ Añadir evento</button>
  <p class="mu">Autogol: elige el club del jugador que lo hizo (suma al rival). Los penales de tanda no se anotan aquí.</p>`:''}`;
  if(!dlg.open)dlg.showModal();
}
const num=v=>v===''||v==null?null:parseInt(v,10);
const act={
  share:async()=>{const s=T();if(!sync.enabled())return alert('Falta configurar Supabase (config.js). Mira el README, sección 3.');try{const c=await sync.share(s);save();alert('Código de invitación: '+c+'\nEl otro jugador debe pulsar «Unirme con código».');render()}catch(e){alert('No se pudo compartir: '+e.message)}},
  joind:()=>{dlg.innerHTML='<h2>Unirme a un torneo</h2><input id="jc" class="in" placeholder="Código (6 caracteres)" maxlength="6" style="text-transform:uppercase"><div class="row" style="margin-top:8px"><button data-a="join">Unirme</button><button class="g" data-a="close">Cancelar</button></div>';dlg.showModal()},
  join:async()=>{if(!sync.enabled())return alert('Falta configurar Supabase (config.js).');try{const t=await sync.join($('#jc').value);db.list=db.list.filter(x=>x.id!==t.id);db.list.unshift(t);save();dlg.close();cur=t.id;tab='panel';status='ok';render()}catch(e){alert(e.message)}},
  syncnow:()=>runSync(),
  mine:()=>{const s=T();for(const c of s.sync.pendingConflicts){if(c.kind==='events'){s.events=s.events.filter(e=>e.id!==c.id);if(c.local)s.events.push(c.local)}else{Object.assign(s[c.kind].find(x=>x.id===c.id),c.local)}}s.sync.pendingConflicts=[];dlg.close();touch(s,'Conflicto resuelto: mis cambios');render()},
  theirs:()=>{const s=T();s.sync.pendingConflicts=[];dlg.close();touch(s,'Conflicto resuelto: cambios del otro');render()},
  new:()=>newDlg(),tpl:i=>newDlg(i),make,close:()=>dlg.close(),home:()=>{cur=null;home()},
  open:i=>{cur=i;tab='panel';render()},tab:i=>{tab=i;render()},
  del:i=>{if(confirm('¿Borrar este torneo definitivamente? Exporta una copia antes si quieres conservarlo.')){db.list=db.list.filter(t=>t.id!==i);save();home()}},
  match:i=>matchDlg(i),
  savem:i=>{const s=T(),m=s.matches.find(x=>x.id===i),hg=num($('#hg').value),ag=num($('#ag').value);
    if((hg==null)!==(ag==null)){alert('Completa los goles de ambos equipos');return}
    if(hg<0||ag<0){alert('Los goles no pueden ser negativos');return}
    const prev={hg:m.hg,ag:m.ag,pk:m.pk?[...m.pk]:null,manual:m.manual,date:m.date};
    m.hg=hg;m.ag=ag;m.date=$('#dt').value;if(m.phase==='K'){m.pk=[num($('#ph').value),num($('#pa').value)];m.manual=$('#mw').value}
    touch(s,`Resultado ${i}: ${hg??'-'}-${ag??'-'}`);s.log[s.log.length-1].prev={id:i,...prev};dlg.close();render()},
  clearm:i=>{if(!confirm('¿Limpiar el resultado de este partido?'))return;const s=T(),m=s.matches.find(x=>x.id===i);const prev={hg:m.hg,ag:m.ag,pk:m.pk?[...m.pk]:null,manual:m.manual,date:m.date};m.hg=m.ag=null;if(m.pk)m.pk=[null,null];m.manual='';touch(s,'Resultado limpiado '+i);s.log[s.log.length-1].prev={id:i,...prev};dlg.close();render()},
  undo:()=>{const s=T(),k=[...s.log].reverse().find(l=>l.prev);if(!k||!confirm('¿Deshacer: '+k.msg+'?'))return;const{id,...p}=k.prev;Object.assign(s.matches.find(x=>x.id===id),p);s.log.splice(s.log.indexOf(k),1);touch(s,'Deshecho: '+k.msg);render()},
  adde:i=>{const s=T(),p=$('#ep').value.trim();if(!p){alert('Escribe el nombre del jugador');return}
    s.events.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),match:i,team:$('#etm').value,player:p,type:$('#et').value,min:num($('#emin').value)});touch(s,'Evento '+$('#et').value+' '+p);matchDlg(i);render()},
  dele:(i,_,el)=>{const s=T();s.events=s.events.filter(e=>e.id!==i);touch(s,'Evento borrado');matchDlg(el.dataset.m);render()},
  ren:i=>{const s=T(),t=s.teams.find(x=>x.id===i),n=prompt('Nombre del equipo',t.name);if(n&&n.trim()){t.name=n.trim();touch(s,'Equipo renombrado');render()}},
  export:()=>{const s=T(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(s,null,1)],{type:'application/json'}));a.download=s.name.replace(/\W+/g,'_')+'.json';a.click()},
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.tagName==='INPUT')return;const f=act[el.dataset.a];if(f)f(el.dataset.i,e,el)});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.a==='man'){const s=T();s.teams.find(t=>t.id===el.dataset.i).manual=Math.max(0,Math.min(9,+el.value||0));touch(s,'Desempate manual');}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
home();
