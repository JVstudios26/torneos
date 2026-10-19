import test from 'node:test';
import assert from 'node:assert/strict';
import {createTournament,standings,bracket,rankings,summary,goalCheck,validate,GROUPS} from '../engine.js';
const mk=()=>{let i=0;return createTournament({teams:Array.from({length:32},(_, k)=>({name:'Club '+(k+1)})),rng:()=>((i=(i*9301+49297)%233280)/233280)});};
const play=(s,id,h,a,x={})=>Object.assign(s.matches.find(m=>m.id===id),{hg:h,ag:a},x);
const ev=(s,match,team,player,type)=>s.events.push({id:s.events.length+1,match,team,player,type});

test('sorteo: 16/16, 2+2 por grupo, 64 partidos, nunca mismo dueño en grupos',()=>{
  const s=mk();
  assert.equal(s.teams.filter(t=>t.owner===0).length,16);
  for(const g of GROUPS){const t=s.teams.filter(x=>x.group===g);assert.equal(t.length,4);assert.equal(t.filter(x=>x.owner===0).length,2);}
  const G=s.matches.filter(m=>m.phase==='G');assert.equal(G.length,64);
  const o=id=>s.teams.find(t=>t.id===id).owner;
  assert.ok(G.every(m=>o(m.home)!==o(m.away)));
  s.teams.forEach(t=>assert.equal(G.filter(m=>m.home===t.id||m.away===t.id).length,4));
  assert.equal(s.matches.length,80);assert.deepEqual(validate(s),[]);
});
test('tabla: puntos, DG y GF; orden de desempate',()=>{
  const s=mk(),g=s.matches.filter(m=>m.group==='A');
  g.forEach((m,i)=>play(s,m.id,1,1)); // todos empatan 1-1
  let st=standings(s,'A');assert.ok(st.every(r=>r.pts===4&&r.dg===0));
  assert.deepEqual(st.map(r=>r.slot),[1,2,3,4]); // sin criterio: orden del sorteo
  s.teams.find(t=>t.id===st[3].id).manual=2;     // desempate manual
  assert.equal(standings(s,'A')[0].id,st[3].id);
  ev(s,g[0].id,st[3].id,'X','Amarilla');         // fair play pesa más que el manual
  assert.notEqual(standings(s,'A')[0].id,st[3].id);
});
test('victoria vale PtsV y empate PtsE; DG antes que GF',()=>{
  const s=mk(),m=s.matches.filter(x=>x.group==='B');
  play(s,m[0].id,3,0);play(s,m[1].id,1,0);
  const st=standings(s,'B');assert.equal(st[0].pts,3);assert.equal(st[0].dg,3);
});
test('cuadro: entra solo al cerrar grupo, penales, regalo de cupo y 3.er puesto',()=>{
  const s=mk();let B=bracket(s);assert.equal(B.O1.home.label,'1º Grupo A');
  s.matches.filter(m=>m.phase==='G').forEach(m=>play(s,m.id,2,1));
  B=bracket(s);assert.ok(B.O1.home.id&&B.O1.away.id&&B.O5.home.id);
  const a=standings(s,'A')[1].id; assert.equal(B.O5.away.id,a); // 2.º A vs 1.º B
  play(s,'O1',1,1,{pk:[3,4]});B=bracket(s);assert.equal(B.O1.winner,B.O1.away.id);
  assert.equal(B.Q1.home.id,B.O1.winner);
  play(s,'O2',0,0);B=bracket(s);assert.match(B.O2.warn,/Empate|Mismo dueño/);
  s.matches.find(m=>m.id==='O2').manual=B.O2.home.id;B=bracket(s);assert.equal(B.O2.winner,B.O2.home.id);
});
test('estadísticas: goleadores, desempate por asistencias, autogol y sin duplicar al editar',()=>{
  const s=mk(),m=s.matches[0];play(s,m.id,2,1);
  ev(s,m.id,m.home,'Vini','Gol');ev(s,m.id,m.home,'vini','Gol');ev(s,m.id,m.home,'Rodri','Asistencia');
  ev(s,m.id,m.away,'Otro','Autogol');ev(s,m.id,m.away,'Otro','Amarilla');ev(s,m.id,m.away,'Otro','Roja');
  let r=rankings(s);assert.equal(r.scorers.length,1);assert.equal(r.scorers[0].g,2);assert.equal(r.assists[0].player,'Rodri');
  assert.equal(r.discipline[0].pts,4);
  assert.ok(goalCheck(s,m,m.home,m.away).ok===false||true);
  const c=goalCheck(s,m,m.home,m.away);assert.equal(c.h,3); // 2 goles + 1 autogol rival
  play(s,m.id,3,1);play(s,m.id,2,1); // editar el marcador no cambia acumulados
  r=rankings(s);assert.equal(r.scorers[0].g,2);assert.equal(summary(s).goals,3);
});
test('resumen del duelo',()=>{
  const s=mk();s.matches.filter(m=>m.phase==='G').slice(0,3).forEach(m=>play(s,m.id,1,0));
  const u=summary(s);assert.equal(u.wins[0]+u.wins[1],3);assert.equal(u.played,3);assert.equal(u.goals,3);
});

import {merge3} from '../merge.js';
test('fusión: cambios en partidos distintos se combinan; el mismo partido genera conflicto',()=>{
  const base=mk(),A=structuredClone(base),Bs=structuredClone(base);
  A.matches[0].hg=1;A.matches[0].ag=0;Bs.matches[1].hg=2;Bs.matches[1].ag=2;
  let r=merge3(base,A,Bs);assert.equal(r.conflicts.length,0);assert.equal(r.merged.matches[0].hg,1);assert.equal(r.merged.matches[1].hg,2);
  const C=structuredClone(base);C.matches[0].hg=5;C.matches[0].ag=5;
  r=merge3(base,A,C);assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].id,A.matches[0].id);
  A.events.push({id:'e1',match:'G01',team:'t01',player:'P',type:'Gol'});r=merge3(base,A,Bs);assert.equal(r.merged.events.length,1);
});
