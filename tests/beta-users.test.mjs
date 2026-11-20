import test from 'node:test';import assert from 'node:assert/strict';
import {handleBeta} from '../supabase/functions/roundsai-beta-accounts/index.mjs';import {authenticate} from '../server/cloud-api.mjs';import {passwordRequest} from '../api/password.mjs';
const env={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'},owner={id:'ff0c5409-e6a2-489b-bbfd-ea2b99a9e35a',email:'ludwingr@yahoo.com',email_confirmed_at:'2026-11-01'},member={id:'member',email:'tester@example.com',email_confirmed_at:'2026-11-01',app_metadata:{roundsai_beta:true,beta_password_change_required:true}};
const req=(x,auth=true)=>new Request('https://db.invalid/functions/v1/roundsai-beta-accounts',{method:'POST',headers:auth?{Authorization:'Bearer test'}:{},body:JSON.stringify(x)});
test('Beta provisioning rejects anonymous and nonowner accounts',async()=>{assert.equal((await handleBeta(req({action:'create'},false),env)).status,401);let calls=0;const r=await handleBeta(req({action:'create',email:'tester@example.com'}),env,async()=>{calls++;return Response.json(member)});assert.equal(r.status,403);assert.equal(calls,1)});
test('Owner creates confirmed beta account with random temporary password and no email endpoint',async()=>{const paths=[];let payload;const r=await handleBeta(req({action:'create',email:' Tester@example.com '}),env,async(url,o)=>{paths.push(url);if(url.endsWith('/auth/v1/user'))return Response.json(owner);payload=JSON.parse(o.body);return Response.json({id:'new-test'})});const d=await r.json();assert.equal(d.created,true);assert.equal(d.user.email,'tester@example.com');assert.equal(payload.email_confirm,true);assert.equal(payload.app_metadata.beta_password_change_required,true);assert(d.temporaryPassword.length>40);assert.equal(payload.password,d.temporaryPassword);assert.deepEqual(paths,[env.SUPABASE_URL+'/auth/v1/user',env.SUPABASE_URL+'/auth/v1/admin/users'])});
test('Duplicate account cannot reset existing password or data',async()=>{let writes=[];const r=await handleBeta(req({action:'create',email:'tester@example.com'}),env,async(url,o)=>{if(url.endsWith('/auth/v1/user'))return Response.json(owner);writes.push(o.method);return Response.json({msg:'User already registered'},{status:422})});assert.equal(r.status,409);assert.deepEqual(writes,['POST']);assert.equal((await r.json()).temporaryPassword,undefined)});
test('Temporary account cannot open cloud APIs until password changed',async()=>{await assert.rejects(()=>authenticate(new Request('https://app.invalid/api/workspace',{headers:{Authorization:'Bearer test'}}),env,async()=>Response.json(member)),e=>e.code==='PASSWORD_CHANGE_REQUIRED')});
test('Password change targets authenticated caller, preserves metadata and clears setup flag',async()=>{let update,paths=[];const r=await handleBeta(req({action:'password',password:'Fictional-test-password-strong',userId:'someone-else'}),env,async(url,o)=>{paths.push(url);if(url.endsWith('/auth/v1/user'))return Response.json(member);if(o.method==='PUT')update=JSON.parse(o.body);return Response.json({})});assert.equal(r.status,200);assert.equal(update.app_metadata.roundsai_beta,true);assert.equal(update.app_metadata.beta_password_change_required,false);assert(paths.includes(env.SUPABASE_URL+'/auth/v1/admin/users/member'));assert(paths.some(p=>p.endsWith('/logout?scope=global')));assert.deepEqual(await r.json(),{changed:true,signInRequired:true})});
test('Weak password cannot clear setup flag and cross-origin password requests fail',async()=>{let n=0;const r=await handleBeta(req({action:'password',password:'short'}),env,async()=>{n++;return Response.json(member)});assert.equal(r.status,400);assert.equal(n,1);const p=await passwordRequest(new Request('https://app.invalid/api/password',{method:'POST',headers:{Origin:'https://other.invalid'},body:'{}'}),env);assert.equal(p.status,403)});

test('Password length boundaries accept 8 and 128, reject 7 and 129 without changing setup',async()=>{
 for(const length of [7,8,128,129]){
  let updates=0;
  const r=await handleBeta(req({action:'password',password:'a'.repeat(length)}),env,async(url,o)=>{
   if(url.endsWith('/auth/v1/user'))return Response.json(member);
   if(o.method==='PUT'){
    updates++;
    const payload=JSON.parse(o.body);
    assert.equal(payload.password.length,length);
    assert.equal(payload.app_metadata.beta_password_change_required,false);
    assert.equal(payload.app_metadata.roundsai_beta,true);
   }
   return Response.json({});
  });
  const accepted=length>=8&&length<=128;
  assert.equal(r.status,accepted?200:400);
  assert.equal(updates,accepted?1:0);
 }
});
