// Isolated fictional-account smoke only. Supply {email,password} on stdin; never log tokens.
import assert from 'node:assert/strict';import readline from 'node:readline';
const rl=readline.createInterface({input:process.stdin,terminal:false});const line=await new Promise(r=>rl.once('line',r));rl.close();const credentials=JSON.parse(line),origin='https://roundsai-five.vercel.app';
const config=await fetch(origin+'/api/config').then(r=>r.json());
async function signin(){const r=await fetch(config.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify(credentials)});const d=await r.json();assert.equal(r.status,200,d.msg||d.error_description);return d}
async function api(session,method='GET',body){const r=await fetch(origin+'/api/organizer',{method,headers:{Authorization:'Bearer '+session.access_token,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
const first=await signin(),initial=await api(first);assert.equal(initial.status,200);assert.equal(initial.data.revision,0);assert.equal(initial.data.owner.id,first.user.id);
const task={id:crypto.randomUUID(),text:'Fictional organizer sync check',notes:'Synthetic data only.',list:'Study',priority:'high',due:'2026-11-21',done:false,completedAt:''};
const saved=await api(first,'PUT',{data:{tasks:[task]},revision:0});assert.equal(saved.status,200);assert.equal(saved.data.revision,1);
const second=await signin(),restored=await api(second);assert.equal(restored.status,200);assert.equal(restored.data.data.tasks[0].text,task.text);assert.equal(restored.data.revision,1);
const done={...task,done:true,completedAt:new Date().toISOString()};const savedAgain=await api(second,'PUT',{data:{tasks:[done]},revision:1});assert.equal(savedAgain.status,200);assert.equal(savedAgain.data.revision,2);
const stale=await api(first,'PUT',{data:{tasks:[]},revision:1});assert.equal(stale.status,409);const retained=await api(first);assert.equal(retained.data.revision,2);assert.equal(retained.data.data.tasks[0].done,true);
const foreign=await fetch(origin+'/api/organizer',{method:'PUT',headers:{Authorization:'Bearer '+first.access_token,Origin:'https://foreign.invalid','Content-Type':'application/json'},body:JSON.stringify({data:{tasks:[]},revision:2})});assert.equal(foreign.status,403);
const unsigned=await fetch(origin+'/api/organizer');assert.equal(unsigned.status,401);
for(const session of [first,second])await fetch(config.supabaseUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:config.supabaseKey,Authorization:'Bearer '+session.access_token}});
console.log(JSON.stringify({passed:true,checks:['confirmed sign-in','initial empty organizer','save','fresh independent login restore','completion save','stale revision rejection without data loss','foreign-origin write rejection','anonymous rejection'],syntheticTasks:1,finalRevision:2}));
