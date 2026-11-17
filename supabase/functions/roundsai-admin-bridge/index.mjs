const KEY_HASH='6beb1d4ab0640e9b3a2b81b9cd9c915ed520ba7a482e12be2bac5061f37c02e5';
const owner='ludwingr@yahoo.com';
const types=['hpi','progress','consult','admission','icu','discharge','summary','presentation','headsup','learning'];
const response=(d,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function rangeDates(range='7',from,to,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!isNaN(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 let start,end;if(range==='custom'){if(!valid(from)||!valid(to)||from>to)throw Error('Choose valid start and end dates.');start=from;end=to}else if(range==='all'){start='1970-01-01';end=today}else if(['1','7','30','90'].includes(range)){end=today;start=shift(today,1-Number(range))}else throw Error('Choose Today, 7, 30, 90 days, All time or Custom.');
 const midnight=d=>{const base=new Date(d+'T00:00:00Z'),off=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'longOffset'}).formatToParts(base).find(p=>p.type==='timeZoneName').value;const m=off.match(/GMT([+-])(\d{2}):(\d{2})/);const mins=m?(Number(m[2])*60+Number(m[3]))*(m[1]==='-'?-1:1):0;return new Date(+base-mins*60000).toISOString()};
 return {start:midnight(start),end:midnight(shift(end,1)),from:start,to:end,timeZone:'America/New_York',label:range==='all'?'All time':range==='custom'?'Custom dates':range==='1'?'Today':'Last '+range+' days'};
}
export function questionInput(x){if(typeof x.stem!=='string'||x.stem.trim().length<10||x.stem.length>5000||!Array.isArray(x.options)||x.options.length!==4||x.options.some(s=>typeof s!=='string'||!s.trim()||s.length>2000)||new Set(x.options.map(s=>s.trim())).size!==4||!Number.isInteger(x.answer)||x.answer<0||x.answer>3||typeof x.explanation!=='string'||x.explanation.trim().length<10||x.explanation.length>8000||typeof x.source!=='string'||x.source.trim().length<5||x.source.length>4000)throw Error('Complete the question, four distinct answers, explanation and source.');}
function qView(q){return {id:q.id,stem:q.question,topic:q.topic,options:q.options,answer:q.correct_index,explanation:q.explanation,source:q.sources.map(x=>x.title||x.url||x.pmid||'').join('\n'),status:q.status==='draft'?'pending':q.status,revision:q.updated_at,history:[]}}
export async function handle(request,env,fetcher=fetch){
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 const key=request.headers.get('x-roundsai-admin-key')||'';if(key.length<40||key.length>150)return response({error:'Unauthorized'},401);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==KEY_HASH)return response({error:'Unauthorized'},401);
 let input;try{const raw=await request.text();if(raw.length>1000000)return response({error:'Request too large'},413);input=JSON.parse(raw)}catch{return response({error:'Invalid request'},400)}
 if(input.actor!==owner)return response({error:'Owner access required'},403);
 const url=env.SUPABASE_URL,keyService=env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!keyService)return response({error:'Connection unavailable'},503);
 async function db(path,options={}){const r=await fetcher(url+'/rest/v1/'+path,{...options,headers:{apikey:keyService,Authorization:'Bearer '+keyService,'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(18000)});const d=await r.json();if(!r.ok){const e=Error(r.status===409||String(d.message||'').includes('changed')?'This record changed. Reload before saving.':'Database action failed. Please reload and retry.');e.status=409;throw e}return d}
 async function actorId(){const r=await fetcher(url+'/auth/v1/admin/users?page=1&per_page=1000',{headers:{apikey:keyService,Authorization:'Bearer '+keyService},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Could not verify the admin account.');const d=await r.json(),u=d.users.find(u=>u.email?.toLowerCase()===owner);if(!u)throw Error('Admin account not found.');return u.id}
 try{
 if(input.action==='health')return response({connected:true});
 if(input.action==='analytics'){const dates=rangeDates(input.range,input.from,input.to),users=await db('rpc/roundsai_admin_stats',{method:'POST',body:JSON.stringify({p_start:dates.start,p_end:dates.end})});return response({connected:true,users,dates,trackingStartedAt:'2026-11-17T04:00:00Z',definitions:{attempts:'All recorded answers, including repeated questions',distinct_questions:'Different questions answered in the selected range',notes:'Successful note builds recorded after activity tracking was connected'}})}
 if(input.action==='settings'){const settings=await db('roundsai_live_settings?select=*&order=workflow');const releases=await db('roundsai_setting_releases?select=*&order=created_at.desc&limit=100');return response({settings,releases})}
 if(input.action==='publish'||input.action==='rollback'){
  if(!types.includes(input.workflow)||!Number.isSafeInteger(input.expected)||input.expected<0)throw Error('Invalid configuration revision.');
  let config=input.config;if(input.action==='rollback'){const rows=await db('roundsai_setting_releases?id=eq.'+encodeURIComponent(input.releaseId)+'&workflow=eq.'+input.workflow+'&select=config');if(!rows.length)throw Error('Release not found.');config=rows[0].config}
  if(!config||typeof config.instructions!=='string'||config.instructions.trim().length<20||config.instructions.length>12000||typeof config.example!=='string'||config.example.length>12000||JSON.stringify(config).length>40000)throw Error('Invalid configuration.');
  const d=await db('rpc/roundsai_admin_publish',{method:'POST',body:JSON.stringify({p_workflow:input.workflow,p_config:config,p_expected:input.expected,p_actor:owner})});return response({published:true,...d})
 }
 if(input.action==='questions'){const rows=await db('roundsai_questions?select=*&order=created_at.desc&limit=1000');return response({connected:true,questions:rows.map(qView),limited:rows.length===1000})}
 if(input.action==='question'){
  const x=input.question;if(!x)throw Error('Choose a question action.');
  if(x.action==='create'){questionInput(x);if(typeof x.topic!=='string'||!x.topic.trim()||x.topic.length>180)throw Error('Add the clinical topic.');const id=await actorId();const rows=await db('roundsai_questions',{method:'POST',body:JSON.stringify({topic:x.topic.trim(),question:x.stem.trim(),options:x.options,correct_index:x.answer,explanation:x.explanation,sources:[{title:x.source.trim()}],status:'draft',created_by:id})});return response({question:qView(rows[0])})}
  if(!['edit','approve','reject','reopen'].includes(x.action)||typeof x.id!=='string')throw Error('Invalid review action.');
  const rows=await db('roundsai_questions?id=eq.'+encodeURIComponent(x.id)+'&select=*');if(!rows.length)throw Error('Question not found.');const q=rows[0];if(x.revision!==q.updated_at)return response({error:'Question changed. Reload before reviewing.'},409);
  let values={question:q.question,options:q.options,correct_index:q.correct_index,explanation:q.explanation,sources:q.sources,status:x.action==='approve'?'approved':x.action==='reject'?'rejected':'draft'};
  if(x.action==='edit'){questionInput(x);values={...values,question:x.stem.trim(),options:x.options,correct_index:x.answer,explanation:x.explanation,sources:[{title:x.source.trim()}]}}
  const reviewed=await db('rpc/roundsai_admin_review',{method:'POST',body:JSON.stringify({p_actor_id:await actorId(),p_id:q.id,p_updated:q.updated_at,p_values:values})});return response({question:qView(reviewed)})
 }
 return response({error:'Unknown admin action'},400);
 }catch(e){return response({error:e.message||'Connection failed'},e.status||400)}
}
if(typeof Deno!=='undefined')Deno.serve(req=>handle(req,Deno.env.toObject()));

