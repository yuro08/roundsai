(function(root){
function stable(value){return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)}
function equal(a,b){return stable(a)===stable(b)}
function resolve(remote,cached){
 if(!remote||!Number.isSafeInteger(remote.revision))throw Error('Invalid cloud workspace response.');
 if(!remote.data){if(cached?.dirty&&cached.data){if(cached.revision>0)return {mode:'blocked',data:cached.data,revision:cached.revision,dirty:true};return {mode:'resume',data:cached.data,revision:0,dirty:true}}return {mode:'new',data:null,revision:0,dirty:false}}
 if(cached?.dirty&&cached.data&&!equal(cached.data,remote.data)){
  if(cached.revision===remote.revision)return {mode:'resume',data:cached.data,revision:remote.revision,dirty:true};
  return {mode:'cloud',data:remote.data,revision:remote.revision,dirty:false,recovery:cached};
 }
 return {mode:'cloud',data:remote.data,revision:remote.revision,dirty:false};
}
const api={equal,resolve};root.RoundsSync=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
