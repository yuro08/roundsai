// Topic-balanced daily practice. Previously attempted stems stay out of new sets.
export const normalizeStem=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selectRapidFire(questions,topics,attemptedIds=[],limit=10){
 const allowed=new Set(topics.map(normalizeStem)),seenIds=new Set(attemptedIds),stems=new Set(),buckets=new Map();
 for(const q of questions){const topic=normalizeStem(q.topic),stem=normalizeStem(q.question);if(!allowed.has(topic)||seenIds.has(q.id)||!stem||stems.has(stem))continue;stems.add(stem);if(!buckets.has(topic))buckets.set(topic,[]);buckets.get(topic).push(q)}
 const result=[];while(result.length<limit){let added=false;for(const bucket of buckets.values()){if(bucket.length&&result.length<limit){result.push(bucket.shift());added=true}}if(!added)break}return result;
}
