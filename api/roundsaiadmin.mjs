import {isAdmin} from '../server/admin-access.mjs';
import {authenticate} from '../server/cloud-api.mjs';
import workspace from '../server/admin-workspace.mjs';
import page from '../server/admin-page.mjs';
import {adminStorage} from '../server/admin-storage.mjs';
export async function adminWorkspaceRequest(request,env=process.env,fetcher=fetch){
 const out=(x,s)=>Response.json(x,{status:s,headers:{'Cache-Control':'no-store'}});
 try{
  if(!['GET','POST'].includes(request.method))return out({error:'Method not allowed'},405);
  const url=new URL(request.url);
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return out({error:'Invalid request origin.'},403);
  const user=await authenticate(request,env,fetcher);
  if(!isAdmin(user))return out({error:'This account does not have admin access.'},403);
  const resource=url.searchParams.get('resource')||'status';
  if(resource==='page')return out({html:page},200);
  if(['create-beta','admin-role'].includes(resource)){if(request.method!=='POST')return out({error:'Use POST'},405);const raw=await request.text();if(raw.length>1000)return out({error:'Request too large'},413);let x;try{x=JSON.parse(raw)}catch{return out({error:'Invalid request'},400)}const r=await fetcher(env.SUPABASE_URL+'/functions/v1/roundsai-beta-accounts',{method:'POST',headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:request.headers.get('authorization'),'Content-Type':'application/json'},body:JSON.stringify({action:resource==='admin-role'?'admin-role':'create',email:x.email,userId:x.userId,enabled:x.enabled}),signal:AbortSignal.timeout(30000)});return out(await r.json(),r.status);}
  if(!['status','users','live-settings','release','activity','profiles','profile','preview','questions','question'].includes(resource))return out({error:'Not found'},404);
  const authorization=request.headers.get('authorization'),headers=new Headers(request.headers);headers.set('oai-authenticated-user-email',user.email.toLowerCase());
  url.pathname='/api/'+resource;url.searchParams.delete('resource');
  const config={...env,ADMIN_OWNER_EMAIL:user.email.toLowerCase(),ROUNDSAI_AUTHORIZATION:authorization,ROUNDSAI_BRIDGE_URL:env.SUPABASE_URL+'/functions/v1/roundsai-admin-bridge',ROUNDSAI_APP_URL:new URL(request.url).origin,DB:adminStorage(env,authorization,fetcher,user.email.toLowerCase())};
  return await workspace.fetch(new Request(url,{method:request.method,headers,...(request.method==='POST'?{body:await request.text()}:{})}),config);
 }catch(e){return out({error:e.status?e.message:'Admin workspace unavailable. Please retry.'},e.status||502)}
}
export default {fetch(request){return adminWorkspaceRequest(request)}};
