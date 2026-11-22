import test from 'node:test';import assert from 'node:assert/strict';import {unsupportedNoteBoilerplate,clinicalNote,hasDocumentedDisposition,renderClinicalNote,removeUnsupportedNoteSentences} from '../server/clinical-note.mjs';
const doc={sections:[{heading:'Subjective',body:'The patient is now on T-piece.'},{heading:'Physical Examination',body:'No evidence of acute distress.'}],problems:[],generalManagement:'Continue DVT prophylaxis.',disposition:'',missing:[]};
test('Unsupported template findings and prophylaxis cannot pass source-only guard',()=>{assert.deepEqual(unsupportedNoteBoilerplate(doc,{latestClinicianUpdate:'Patient seen at bedside. Now on T-piece.'}),['prophylaxis','normal examination'])});
test('Explicit clinician findings and plans remain allowed',()=>{assert.deepEqual(unsupportedNoteBoilerplate(doc,{latestClinicianUpdate:'No acute distress. Continue DVT prophylaxis.'}),[])});
test('Bedside visit and tracheostomy do not document broad symptom denials or communication limitations',()=>{const d={...doc,sections:[{heading:'ROS',body:'Limited by communication barriers. No new symptoms were reported.'}],generalManagement:''};assert.deepEqual(unsupportedNoteBoilerplate(d,{latestClinicianUpdate:'Seen at bedside. Tracheostomy in place.'}),['broad symptom denial','communication limitation'])});
test('Final note review is source-only and unsupported content cannot be returned',async()=>{const sent=[];await assert.rejects(()=>clinicalNote({OPENAI_API_KEY:'test',ROUNDSAI_SETTINGS:{progress:{config:{instructions:'STYLE EXAMPLE: Continue DVT prophylaxis.'}}}},{update:'Now on T-piece.'},'progress',false,'2026-11-20','',async(url,o)=>{sent.push(JSON.parse(o.body));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...doc,updateReview:{complete:true,consistent:true,issues:[]}})}]}]})}),e=>e.code==='NOTE_UNSUPPORTED_CONTENT');assert(sent[0].instructions.includes('STYLE EXAMPLE:'));assert(!sent[1].instructions.includes('OWNER-PUBLISHED STYLE'));assert.equal(sent.length,4)});

test('An older generated revision target cannot justify its own unsupported boilerplate',()=>{assert.deepEqual(unsupportedNoteBoilerplate(doc,{latestClinicianUpdate:'Now on T-piece.',revisionTarget:'No acute distress. Continue DVT prophylaxis.'}),['prophylaxis','normal examination'])});

test('Targeted correction can remove unsupported boilerplate without losing current support',async()=>{let n=0;const d=await clinicalNote({OPENAI_API_KEY:'test'},{update:'Now on T-piece.'},'progress',false,'2026-11-20','',async()=>{n++;const result=n<3?doc:{...doc,sections:[doc.sections[0]],generalManagement:''};return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...result,updateReview:{complete:true,consistent:true,issues:[]}})}]}]})});assert.equal(n,3);assert.match(d.text,/T-piece/);assert(!/distress|prophylaxis/.test(d.text))});
test('Single oxygen value does not justify a stable trend, an IV route or monitoring orders',()=>{const d={sections:[{heading:'Assessment',body:'Oxygen saturation is stable. No evidence of clinical deterioration.'}],problems:[],generalManagement:'Continue intravenous antibiotics and monitoring.'};assert.deepEqual(unsupportedNoteBoilerplate(d,{latestClinicianUpdate:'SpO2 96% on nasal cannula at 2 L/min. Continue ceftriaxone as ordered.'}),['unsupported stability','unsupported deterioration denial','administration route','monitoring plan'])});

test('Alternative stable and symptom-denial wording is not a loophole',()=>{const d={sections:[{heading:'Subjective',body:'No new complaints. Stable on 2 L/min nasal cannula.'}],problems:[],generalManagement:''};assert.deepEqual(unsupportedNoteBoilerplate(d,{latestClinicianUpdate:'Cough improving. SpO2 96% on nasal cannula at 2 L/min.'}),['broad symptom denial','unsupported stability'])});

test('Disposition needs an explicit disposition statement, not the admission diagnosis alone',()=>{
 assert.equal(hasDocumentedDisposition({latestClinicianUpdate:'Cough improving. Continue antibiotics.',backgroundChart:{hpi:'Admitted for pneumonia.'}}),false);
 assert.equal(hasDocumentedDisposition({latestClinicianUpdate:'LTAC placement is pending.'}),true);
 assert.equal(hasDocumentedDisposition({latestClinicianUpdate:'Admit to the ward for further management.'}),true)
});
test('Missing-information filler stays outside the copyable note',()=>{
 const text=renderClinicalNote({sections:[{heading:'HPI',body:'Three days of cough. There is no information regarding home medications or sick contacts.'}],problems:[],generalManagement:'',disposition:''},null,false);
 assert.match(text,/Three days of cough/);assert(!text.includes('no information'))
});

test('Coding search metadata cannot cause a false unsupported-content failure',()=>{
 const d={sections:[{heading:'HPI',body:'Respiratory symptoms have improved.'}],problems:[{title:'Persistent asthma',assessment:'Improving respiratory symptoms.',plan:[],searchTerms:'stable persistent asthma monitor IV',codeHints:['IV']}],generalManagement:'',disposition:''};
 assert.deepEqual(unsupportedNoteBoilerplate(d,{latestClinicianUpdate:'Improved respiratory symptoms.'}),[])
});
test('Roman numeral stage IV is not an intravenous administration claim',()=>{
 const d={sections:[{heading:'History',body:'History of stage IV lung cancer.'}],problems:[],generalManagement:'',disposition:''};
 assert.deepEqual(unsupportedNoteBoilerplate(d,{latestClinicianUpdate:'History of metastatic lung cancer.'}),[])
});
test('Conservative cleanup retains supported H&P sentences, numbers, uncertainty and explicit outpatient plan',()=>{
 const source={latestClinicianUpdate:'Now on NC 3 L, improved respiratory status. Follow up outpatient for possible biologic therapy for persistent asthma. AERD is a possible cause.'};
 const d={sections:[{heading:'HPI',body:'Respiratory symptoms have improved, and the patient is now on nasal cannula at 3 L. No acute distress. AERD is a possible contributor.'}],problems:[{title:'Persistent asthma',assessment:'Respiratory symptoms have improved.',plan:['Outpatient follow-up for consideration of biologic therapy.','Continue monitoring.'],searchTerms:'asthma',codeHints:[]}],generalManagement:'Continue DVT prophylaxis.',disposition:'Outpatient follow-up.',missing:[]};
 const cleaned=removeUnsupportedNoteSentences(d,source),text=renderClinicalNote(cleaned,null,false);
 assert.match(text,/3 L/);assert.match(text,/possible contributor/);assert.match(text,/consideration of biologic/);assert(!/distress|monitoring|prophylaxis/.test(text));assert(d.generalManagement.includes('DVT'));assert(hasDocumentedDisposition(source));
});
test('H&P survives leftover boilerplate only after a separate support and update-coverage audit',async()=>{
 let calls=0,audit;const d=await clinicalNote({OPENAI_API_KEY:'test'},{update:'Now on T-piece.'},'admission',false,'2026-11-22','',async(url,o)=>{
  const request=JSON.parse(o.body);calls++;
  let result={...doc,updateReview:{complete:true,consistent:true,issues:[]}};
  if(request.text.format.name==='clinical_note_recovery_check'){audit=request;result={supported:true,complete:true,consistent:true,issues:[]}}
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]})
 });
 assert.equal(calls,4);assert.match(d.text,/T-piece/);assert(!/distress|prophylaxis/.test(d.text));assert(audit.instructions.includes('losing part of a clinician update is not'));assert(!audit.instructions.includes('OWNER-PUBLISHED STYLE'));assert.equal(audit.max_output_tokens,1500);
 const candidate=JSON.parse(audit.input[0].content);assert(candidate.candidateNote.includes('T-piece'));assert(!candidate.candidateNote.includes('distress'));
});
test('Cleanup cannot return a note if it loses a current update or still has unsupported claims',async()=>{
 for(const flags of [{supported:true,complete:false,consistent:true,issues:['Lost oxygen update']},{supported:false,complete:true,consistent:true,issues:['Unsupported diagnosis']},{supported:true,complete:true,consistent:false,issues:['Contradictory support']}]){
  await assert.rejects(()=>clinicalNote({OPENAI_API_KEY:'test'},{update:'Now on T-piece.'},'admission',false,'2026-11-22','',async(url,o)=>{const r=JSON.parse(o.body),result=r.text.format.name==='clinical_note_recovery_check'?flags:{...doc,updateReview:{complete:true,consistent:true,issues:[]}};return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]})}),e=>e.code==='NOTE_UNSUPPORTED_CONTENT');
 }
});
test('Recovery audit failure does not silently return unchecked cleaned notes',async()=>{
 await assert.rejects(()=>clinicalNote({OPENAI_API_KEY:'test'},{update:'Now on T-piece.'},'admission',false,'2026-11-22','',async(url,o)=>{const r=JSON.parse(o.body);if(r.text.format.name==='clinical_note_recovery_check')return Response.json({}, {status:500});return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...doc,updateReview:{complete:true,consistent:true,issues:[]}})}]}]})}),/AI service/);
});

test('Section outline labels are not mistaken for administration routes',()=>{assert.deepEqual(unsupportedNoteBoilerplate({sections:[{heading:'IV. Examination',body:'Wheezing documented.'}],problems:[],generalManagement:'',disposition:''},{latestClinicianUpdate:'Wheezing documented.'}),[])});

test('Outpatient follow-up is preserved as an explicit disposition plan',()=>{assert(hasDocumentedDisposition({latestClinicianUpdate:'Follow up outpatient. Possible biological therapy.'}));});
