import {AppError} from './ai.mjs';
export function validateWorkspace(data){
 if(!data||!Array.isArray(data.patients)||!Array.isArray(data.discharged)||data.patients.length+data.discharged.length>500)throw new AppError('Workspace must contain at most 500 patients.');
 const ids=new Set();for(const p of [...data.patients,...data.discharged]){if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.problems)||!Array.isArray(p.tasks)||!p.vitals||typeof p.vitals!=='object')throw new AppError('A patient record is incomplete or duplicated. Export your workspace and retry.');ids.add(p.id)}return data;
}
export async function workspaceRequest(request,env,user,fetcher=fetch){
 const base=env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/roundsai_workspaces',headers={apikey:env.SUPABASE_ANON_KEY,Authorization:request.headers.get('authorization'),'Content-Type':'application/json',Prefer:'return=representation'};
 async function call(url,options={}){const r=await fetcher(url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(15000)});let d;try{d=await r.json()}catch{}if(!r.ok)throw new AppError(r.status===404?'Account saving is not configured yet.':'Could not save or load your census. Your local draft is preserved.',r.status===401?401:503);return d||[]}
 const scope='?user_id=eq.'+encodeURIComponent(user.id);
 if(request.method==='GET'){const rows=await call(base+scope+'&select=data,revision,updated_at');return rows[0]||{data:null,revision:0}}
 if(request.method!=='PUT')throw new AppError('Method not allowed.',405);
 const raw=await request.text();if(raw.length>4000000)throw new AppError('Workspace is too large to save. Export it and reduce source history.',413);
 let input;try{input=JSON.parse(raw)}catch{throw new AppError('Invalid workspace request.')}
 const data=validateWorkspace(input.data),revision=input.revision;if(!Number.isSafeInteger(revision)||revision<0)throw new AppError('Reload the workspace before saving.');
 let rows;if(revision===0){rows=await call(base+'?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({user_id:user.id,data,revision:1})})}else{rows=await call(base+scope+'&revision=eq.'+revision,{method:'PATCH',body:JSON.stringify({data,revision:revision+1,updated_at:new Date().toISOString()})})}
 if(!rows.length)throw new AppError('Your census changed on another device. Export this device’s draft, then load the latest saved census.',409,'WORKSPACE_CONFLICT');
 return {revision:rows[0].revision,updated_at:rows[0].updated_at};
}
