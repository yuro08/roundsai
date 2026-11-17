const OWNER_ID='ff0c5409-e6a2-489b-bbfd-ea2b99a9e35a';
const isOwner=u=>u.id===OWNER_ID&&u.email?.toLowerCase()==='ludwingr@yahoo.com';
const isAdmin=u=>isOwner(u)||u.app_metadata?.roundsai_admin===true;
const reply=(d,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleBeta(request,env,fetcher=fetch){
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const auth=request.headers.get('authorization');if(!auth?.startsWith('Bearer '))return reply({error:'Sign in required'},401);
 const base=env.SUPABASE_URL,secret=env.SUPABASE_SERVICE_ROLE_KEY;
 const headers={apikey:secret,Authorization:auth,'Content-Type':'application/json'};
 try{
 const v=await fetcher(base+'/auth/v1/user',{headers,signal:AbortSignal.timeout(12000)});if(!v.ok)return reply({error:'Sign in again.'},401);const user=await v.json();if(!user.id||!user.email_confirmed_at)return reply({error:'Confirmed account required.'},403);
 const raw=await request.text();if(raw.length>3000)return reply({error:'Request too large'},413);let x;try{x=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
 const adminHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};

 if(x.action==='admin-role'){
 if(!isAdmin(user)||user.app_metadata?.beta_password_change_required)return reply({error:'Admin access required'},403);
 if(typeof x.userId!=='string'||! /^[a-f0-9-]{36}$/.test(x.userId)||typeof x.enabled!=='boolean')return reply({error:'Invalid admin access change'},400);
 if(x.userId===OWNER_ID)return reply({error:'Owner access is permanent'},403);
 if(x.userId===user.id)return reply({error:'Another admin must change your access'},403);
 const r=await fetcher(base+'/auth/v1/admin/users/'+x.userId,{headers:adminHeaders});if(!r.ok)return reply({error:'Account not found'},404);const target=await r.json();
 const eventId='event:'+crypto.randomUUID();
 const audit=await fetcher(base+'/rest/v1/roundsai_admin_documents',{method:'POST',headers:adminHeaders,body:JSON.stringify({id:eventId,payload:{id:eventId,by:user.email,action:'admin.access.requested',target:target.email,detail:x.enabled?'Grant admin':'Remove admin',at:new Date().toISOString(),environment:'production-admin'}})});
 if(!audit.ok)return reply({error:'Could not record access change; retry'},502);
 if(!x.enabled){const removed=await fetcher(base+'/rest/v1/roundsai_reviewers?user_id=eq.'+x.userId,{method:'DELETE',headers:adminHeaders});if(!removed.ok)return reply({error:'Could not remove reviewer access; retry'},502);}
 const update=await fetcher(base+'/auth/v1/admin/users/'+x.userId,{method:'PUT',headers:adminHeaders,body:JSON.stringify({app_metadata:{...target.app_metadata,roundsai_admin:x.enabled}})});
 if(!update.ok)return reply({error:'Could not change admin access'},502);
 await fetcher(base+'/rest/v1/roundsai_admin_documents?id=eq.'+eventId,{method:'PATCH',headers:adminHeaders,body:JSON.stringify({payload:{id:eventId,by:user.email,action:x.enabled?'admin.access.granted':'admin.access.removed',target:target.email,at:new Date().toISOString(),environment:'production-admin'}})});
 return reply({changed:true,userId:target.id,admin:x.enabled});
 }
 if(x.action==='create'){
 if(!isAdmin(user)||user.app_metadata?.beta_password_change_required)return reply({error:'Owner access required'},403);
 const email=typeof x.email==='string'?x.email.trim().toLowerCase():'';if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Enter a valid tester email.'},400);
 const password='Ra!'+Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
 const r=await fetcher(base+'/auth/v1/admin/users',{method:'POST',headers:adminHeaders,body:JSON.stringify({email,password,email_confirm:true,app_metadata:{roundsai_beta:true,beta_password_change_required:true,beta_created_by:user.id},user_metadata:{}}),signal:AbortSignal.timeout(20000)});
 if(!r.ok){const d=await r.json();return reply({error:/already|registered|exists/i.test(d.msg||d.message||'')?'That email already has an account. Its password and data were not changed.':'Could not create this beta account. Check the email and retry.'},r.status===422?409:400)}
 const d=await r.json();return reply({created:true,user:{id:d.id||d.user?.id,email},temporaryPassword:password,requiresPasswordChange:true});
 }
 if(x.action==='password'){
 if(typeof x.password!=='string'||x.password.length<12||x.password.length>128)return reply({error:'Choose a password with 12–128 characters.'},400);
 const r=await fetcher(base+'/auth/v1/admin/users/'+encodeURIComponent(user.id),{method:'PUT',headers:adminHeaders,body:JSON.stringify({password:x.password,app_metadata:{...user.app_metadata,beta_password_change_required:false}}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)return reply({error:'Could not change your password. Choose a different password and retry.'},400);
 // Require a fresh sign-in. Do not return, persist or log either password.
 await fetcher(base+'/auth/v1/logout?scope=global',{method:'POST',headers,signal:AbortSignal.timeout(12000)}).catch(()=>{});
 return reply({changed:true,signInRequired:true});
 }
 return reply({error:'Unsupported action'},400);
 }catch{return reply({error:'Account service unavailable. Please retry.'},502)}
}
if(typeof Deno!=='undefined')Deno.serve(req=>handleBeta(req,Deno.env.toObject()));
