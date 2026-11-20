(function(root){
const lists=['Rounds','Study','Personal'];
function day(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function collect(personal,patients){return [...personal.map(t=>({...t,key:'g:'+t.id,patient:null})),...patients.flatMap(p=>p.tasks.map((t,i)=>({...t,list:lists.includes(t.list)?t.list:'Rounds',due:t.due||'',priority:['normal','high','urgent'].includes(t.priority)?t.priority:'normal',notes:t.notes||'',key:'p:'+encodeURIComponent(p.id)+':'+i,patient:{id:p.id,name:p.name,room:p.room},index:i})))];}
function select(tasks,{view='today',list='All lists',search='',today=day()}={}){return tasks.filter(t=>(view==='completed'?t.done:!t.done)&&(list==='All lists'||t.list===list)&&(!search||(t.text+' '+(t.notes||'')+' '+(t.patient?.name||'')+' '+(t.patient?.room||'')).toLowerCase().includes(search.toLowerCase()))&&(view==='today'?!!t.patient&&!t.due||!!t.due&&t.due<=today:view==='upcoming'?t.due>today:true)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||({urgent:0,high:1,normal:2}[a.priority]-{urgent:0,high:1,normal:2}[b.priority]));}
const api={lists,day,collect,select};root.OrganizerCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
