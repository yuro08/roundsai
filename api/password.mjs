export async function passwordRequest(request,env=process.env,fetcher=fetch){
 const out=(x,s)=>Response.json(x,{status:s,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return out({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return out({error:'Invalid origin'},403);
 if(!request.headers.get('authorization')?.startsWith('Bearer '))return out({error:'Sign in to continue.'},401);
 const raw=await request.text();if(raw.length>2000)return out({error:'Request too large'},413);let x;try{x=JSON.parse(raw)}catch{return out({error:'Invalid request'},400)};
 try{const r=await fetcher(env.SUPABASE_URL+'/functions/v1/roundsai-beta-accounts',{method:'POST',headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:request.headers.get('authorization'),'Content-Type':'application/json'},body:JSON.stringify({action:'password',password:x.password}),signal:AbortSignal.timeout(35000)});return out(await r.json(),r.status)}catch{return out({error:'Could not change password. Retry.'},502)}
}
export default {fetch(request){return passwordRequest(request)}};
