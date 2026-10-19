import {merge3,snapshot} from './merge.js';
let cfg={};try{cfg=(await import('./config.js')).default}catch{}
export const enabled=()=>!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY);
const hdr=t=>({apikey:cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json',Authorization:'Bearer '+(t||cfg.SUPABASE_ANON_KEY)});
async function token(){ // sesión anónima persistente (identifica al dispositivo/participante)
  let ss=JSON.parse(localStorage.getItem('sb-sess')||'null');
  if(ss&&ss.exp>Date.now()/1e3+60)return ss.t;
  const r=ss?await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:hdr(),body:JSON.stringify({refresh_token:ss.rt})}):null;
  const j=r&&r.ok?await r.json():await(await fetch(`${cfg.SUPABASE_URL}/auth/v1/signup`,{method:'POST',headers:hdr(),body:'{}'})).json();
  if(!j.access_token)throw new Error('No se pudo iniciar sesión anónima (¿activaste "Allow anonymous sign-ins"?)');
  localStorage.setItem('sb-sess',JSON.stringify({t:j.access_token,rt:j.refresh_token,exp:j.expires_at||Date.now()/1e3+3000}));return j.access_token;}
async function rpc(fn,args){const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:hdr(await token()),body:JSON.stringify(args)});
  const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.message||'Error '+r.status);return j;}
export async function share(s){const code=await rpc('create_tournament',{p_id:s.id,p_data:s});s.sync={code,rev:1,base:snapshot(s)};return code;}
export async function join(code){const j=await rpc('join_tournament',{p_code:code});const s=j.data;s.sync={code:code.toUpperCase(),rev:j.rev,base:snapshot(s)};return s;}
// Devuelve {state:'ok'|'conflict'|'offline'|'error', conflicts?, merged?}
export async function syncNow(s){
  if(!s.sync)return{state:'local'};if(!navigator.onLine)return{state:'offline'};
  try{for(let i=0;i<4;i++){
    const {sync,...plain}=s,local=plain;
    const res=await rpc('push_tournament',{p_id:s.id,p_base:s.sync.rev,p_data:local});
    if(res.ok){s.sync.rev=res.rev;s.sync.base=snapshot(local);return{state:'ok'};}
    const {merged,conflicts}=merge3(s.sync.base,local,res.data);
    Object.assign(s,merged,{sync:{...s.sync,rev:res.rev}});
    if(conflicts.length){s.sync.pendingConflicts=conflicts;return{state:'conflict',conflicts};}
    s.sync.base=snapshot(res.data);}
    return{state:'error',msg:'Demasiados cambios simultáneos'};}
  catch(e){return{state:/fetch|network/i.test(e.message)?'offline':'error',msg:e.message};}
}
