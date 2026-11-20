(function(root){
function create({owner,request,storage,changed=()=>{},delay=(fn,ms)=>setTimeout(fn,ms),cancel=t=>clearTimeout(t)}){
 let state=null;
 const key=id=>'roundsai-organizer-'+id;
 function snapshot(s){return {data:{tasks:s.tasks},revision:s.revision,dirty:s.dirty}}
 function cache(s){storage.setItem(key(s.owner),JSON.stringify(snapshot(s)))}
 function current(){const id=owner()||'demo';if(state?.owner!==id){if(state)cancel(state.timer);state={owner:id,tasks:[],revision:0,dirty:false,ready:id==='demo',loading:false,saving:false,conflict:false,error:'',generation:0};try{const c=JSON.parse(storage.getItem(key(id))||'null');if(c&&Array.isArray(c.data?.tasks)){state.tasks=c.data.tasks;state.revision=c.revision||0;state.dirty=!!c.dirty;state.cached=true}}catch{state.error='Could not read the saved device draft.'}if(id!=='demo')delay(()=>load(),0)}return state}
 const same=s=>current()===s;
 function notify(s,reload=false){if(same(s))changed(reload)}
 async function load(force=false){const s=current();if(s.owner==='demo'||s.loading||s.saving||s.dirty&&s.ready&&!force)return;const generation=s.generation;s.loading=true;notify(s);try{const r=await request('GET');if(!same(s)||s.generation!==generation)return;if(r.owner?.id!==s.owner)throw Error('Your account changed. Reopen Organize.');if(force&&s.dirty){storage.setItem(key(s.owner)+'-recovery',JSON.stringify({...snapshot(s),at:new Date().toISOString()}))}if(s.dirty&&!force){if(s.revision!==r.revision){s.conflict=true;throw Error('Organizer changed on another device. Export this draft, then load the latest tasks.')}}else{s.tasks=r.data?.tasks||[];s.revision=r.revision;s.dirty=false;s.conflict=false}s.ready=true;s.error='';cache(s);notify(s,true);if(s.dirty)await flush()}catch(e){if(!same(s))return;s.error=e.message;if(s.cached)s.ready=true;notify(s,true)}finally{s.loading=false;notify(s)}}
 function save(){const s=current();if(!s.ready||s.conflict){s.error=s.conflict?'Resolve the organizer conflict before changing tasks.':'Your organizer is still loading.';notify(s);return false}s.dirty=s.owner!=='demo';s.generation++;try{cache(s)}catch{s.error='Could not preserve this draft on your device. Export it before leaving.';notify(s);return false}s.error='';cancel(s.timer);if(s.dirty)s.timer=delay(flush,600);notify(s);return true}
 async function flush(){const s=current();cancel(s.timer);if(s.owner==='demo'||!s.ready||!s.dirty||s.saving||s.conflict)return;const generation=s.generation,data=JSON.parse(JSON.stringify({tasks:s.tasks}));s.saving=true;notify(s);try{const r=await request('PUT',{data,revision:s.revision});if(!same(s))return;if(r.owner?.id!==s.owner)throw Error('Your account changed. Reopen Organize.');s.revision=r.revision;if(generation===s.generation)s.dirty=false;s.error='';cache(s)}catch(e){if(!same(s))return;s.error=e.message;if(e.status===409)s.conflict=true}finally{s.saving=false;notify(s);if(same(s)&&s.dirty&&!s.error&&!s.conflict)s.timer=delay(flush,300)}}
 async function refresh(){const s=current();if(s.loading||s.saving||s.conflict)return;if(s.dirty)return flush();return load()}
 return {current,save,load,flush,refresh,snapshot:()=>snapshot(current())};
}
root.RoundsOrganizerStore={create};if(typeof module!=='undefined')module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
