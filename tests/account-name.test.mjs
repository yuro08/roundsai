import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const script=fs.readFileSync(new URL('../public/cloud.js',import.meta.url),'utf8');
function setup(){
 const memory=new Map(),handlers={},calls=[],modals=[],fields={cloudEmail:{value:'fictional@example.invalid'},cloudPassword:{value:'Example8!'},cloudFirstName:{value:'  María  '},cloudError:{textContent:''},accountFirstName:{value:'  Ludwing  '},accountNameError:{textContent:''}},button={disabled:false};
 const context=vm.createContext({console,JSON,Date,AbortSignal,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},sessionStorage:{getItem:()=>null,removeItem(){}},document:{addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn),querySelector:()=>null,querySelectorAll:()=>[]},window:{addEventListener(){}},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},$:id=>fields[id.slice(1)],modal:(...args)=>modals.push(args),icon:()=>'',close(){},render(){},toast(){},patients:[{id:'existing',note:'Keep this note'}],selected:'existing',route:'today',esc:String,clone:structuredClone});
 vm.runInContext(script,context);vm.runInContext("cloudConfig={supabaseUrl:'https://auth.invalid',supabaseKey:'public'}",context);
 context.fetch=async(url,options={})=>{calls.push({url,...options});return Response.json({user:{id:'new-user'}})};
 return {context,memory,calls,modals,fields,click:async id=>{for(const handler of handlers.click||[])await handler({target:{closest:()=>({id,dataset:{}})}})},submit:async id=>{for(const handler of handlers.submit)await handler({target:{id,querySelector:()=>button},preventDefault(){}})}};
}
test('signup requires a nonblank name and sends normalized name to Auth',async()=>{
 const s=setup();await s.context.cloudSignIn(null,'signup');assert.match(s.modals[0][1],/id="cloudFirstName"[^>]*required/);
 s.fields.cloudFirstName.value='   ';await s.submit('cloudLogin');assert.equal(s.calls.length,0);assert.equal(s.fields.cloudError.textContent,'Enter your first name.');
 s.fields.cloudFirstName.value='  María  ';await s.submit('cloudLogin');const payload=JSON.parse(s.calls[0].body);assert.equal(payload.data.first_name,'María');assert.equal(payload.email,'fictional@example.invalid');
 await s.context.cloudSignIn(null,'signin');assert(!s.modals.at(-1)[1].includes('id="cloudFirstName"'));
});
test('session stores the account name without losing same-account patient edits',()=>{
 const s=setup(),session={access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'one',email:'fictional@example.invalid',user_metadata:{first_name:'María'}}};s.context.storeCloudSession(session);
 vm.runInContext("patients=[{id:'existing',note:'Keep this note'}];workspaceDirty=true",s.context);
 s.context.storeCloudSession({...session,user:{...session.user,user_metadata:{first_name:'Ludwing'}}});assert.equal(s.context.accountGreetingName(),'Ludwing');assert.equal(JSON.parse(s.memory.get('roundsai-session')).user.firstName,'Ludwing');assert.equal(vm.runInContext('patients[0].note',s.context),'Keep this note');assert.equal(vm.runInContext('workspaceDirty',s.context),true);
 s.context.storeCloudSession({...session,user:{id:'two',email:'second@example.invalid'}});assert.equal(s.context.accountGreetingName(),'Resident');
});
test('account name saves through Auth for the signed-in user without changing census',async()=>{
 const s=setup();s.context.storeCloudSession({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'one',email:'fictional@example.invalid'}});vm.runInContext("patients=[{id:'existing',note:'Keep this note'}]",s.context);
 s.context.fetch=async(url,options)=>{s.calls.push({url,...options});return Response.json({id:'one',user_metadata:{first_name:'Ludwing'}})};
 await s.submit('accountNameForm');assert.equal(s.calls.length,1);assert.equal(s.calls[0].method,'PUT');assert.deepEqual(JSON.parse(s.calls[0].body),{data:{first_name:'Ludwing'}});assert.equal(s.context.accountGreetingName(),'Ludwing');assert.equal(vm.runInContext('patients[0].note',s.context),'Keep this note');
});

test('older cached sessions hydrate name directly from Auth even when census sync failed',async()=>{
 const s=setup();s.context.storeCloudSession({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'one',email:'fictional@example.invalid'}});
 vm.runInContext("patients=[{id:'existing',note:'Unsynced note'}];workspaceDirty=true;workspaceError='Census unavailable'",s.context);
 const greeting={textContent:'Resident'};s.context.document.querySelector=()=>greeting;
 s.context.fetch=async(url,options)=>{s.calls.push({url,...options});return Response.json({id:'one',user_metadata:{first_name:'Ludwing'}})};
 await s.context.refreshAccountProfile();assert.equal(s.calls[0].url,'https://auth.invalid/auth/v1/user');assert.equal(s.calls[0].cache,'no-store');assert.equal(greeting.textContent,'Ludwing');assert.equal(JSON.parse(s.memory.get('roundsai-session')).user.firstName,'Ludwing');assert.equal(vm.runInContext('patients[0].note',s.context),'Unsynced note');assert.equal(vm.runInContext('workspaceDirty',s.context),true);assert.equal(vm.runInContext('workspaceError',s.context),'Census unavailable');
});
test('late profile response cannot show a previous account name after account switch',async()=>{
 const s=setup();const session=id=>({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id,email:'fictional@example.invalid'}});s.context.storeCloudSession(session('one'));
 let resolve;s.context.fetch=()=>new Promise(r=>{resolve=r});const pending=s.context.refreshAccountProfile();await new Promise(r=>setImmediate(r));s.context.storeCloudSession(session('two'));resolve(Response.json({id:'one',user_metadata:{first_name:'Wrong account'}}));await pending;assert.equal(s.context.accountGreetingName(),'Resident');assert.equal(JSON.parse(s.memory.get('roundsai-session')).user.id,'two');
});

test('Normal account sign-out revokes only this device session',async()=>{
 const s=setup();s.context.seed=[];s.context.migrate=x=>x;
 s.context.fetch=async(url,o)=>{s.calls.push({url,...o});return Response.json({})};
 s.context.storeCloudSession({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'one',email:'fictional@example.invalid'}});
 await s.click('cloudLogout');assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].url,'https://auth.invalid/auth/v1/logout?scope=local');
 assert.equal(s.memory.get('roundsai-session'),undefined)
});
