let dictationTimer=null,dictationRestarts=0,dictationWanted=false,dictationSeconds=0,dictationToken=0;
function voiceState(message){if($('#voiceStatus'))$('#voiceStatus').textContent=message;if($('#voiceTimer'))$('#voiceTimer').textContent=Math.floor(dictationSeconds/60)+':'+String(dictationSeconds%60).padStart(2,'0');if($('#intakeMic')){$('#intakeMic').classList.toggle('recording',intake.listening);$('#intakeMic').setAttribute('aria-label',intake.listening?'Pause dictation':'Start dictation')}}
function stopIntakeMic(){dictationWanted=false;dictationToken++;clearInterval(dictationTimer);dictationTimer=null;if(intake.recognition){const r=intake.recognition;r.onend=null;r.onresult=null;try{r.stop()}catch{}intake.recognition=null}intake.listening=false;if($('#intakeText'))$('#intakeText').readOnly=false;if($('#voiceLanguage'))$('#voiceLanguage').disabled=false;voiceState('Paused · review your transcript');}
function intakeDictation(){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!R){$('#voiceStatus').textContent='Use your keyboard’s microphone';$('#intakeError').textContent='Live dictation is unavailable in this browser. Use the text box’s keyboard microphone, then review the transcript.';$('#intakeText').focus();return}
 if(dictationWanted){stopIntakeMic();return}
 intake.text=$('#intakeText').value;dictationWanted=true;dictationRestarts=0;const token=++dictationToken;
 const lang=$('#voiceLanguage')?.value||'en-US';if($('#voiceLanguage'))$('#voiceLanguage').disabled=true;
 clearInterval(dictationTimer);dictationTimer=setInterval(()=>{if(intake.listening){dictationSeconds++;voiceState('Listening · pause before editing')}},1000);
 function run(){
  if(!dictationWanted||token!==dictationToken)return;
  const r=new R();intake.recognition=r;r.lang=lang;r.continuous=true;r.interimResults=true;const before=intake.text;
  r.onstart=()=>{if(token!==dictationToken)return;intake.listening=true;voiceState('Listening · pause before editing');$('#intakeText').readOnly=true};
  r.onresult=e=>{if(token!==dictationToken)return;const words=Array.from(e.results).map(x=>x[0].transcript).join(' ');intake.text=[before,words].filter(Boolean).join('\n');if($('#intakeText'))$('#intakeText').value=intake.text;};
  r.onerror=e=>{if(token!==dictationToken)return;intake.listening=false;if(['not-allowed','service-not-allowed','audio-capture','network','language-not-supported'].includes(e.error)){dictationWanted=false;clearInterval(dictationTimer)}if($('#intakeError'))$('#intakeError').textContent=e.error==='not-allowed'?'Microphone permission was denied. Your transcript is preserved.':'Dictation interrupted ('+e.error+'). Review the transcript for missing words.';};
  r.onend=()=>{if(token!==dictationToken)return;intake.listening=false;if(dictationWanted&&dictationRestarts<3&&document.visibilityState==='visible'&&$('#intakeMic')){dictationRestarts++;voiceState('Reconnecting · check for missing words');setTimeout(run,350)}else{dictationWanted=false;clearInterval(dictationTimer);voiceState('Stopped · review transcript before continuing');if($('#intakeError'))$('#intakeError').textContent='Dictation stopped. Captured text is preserved. Check for missing words, then tap to continue.';if($('#intakeText'))$('#intakeText').readOnly=false;if($('#voiceLanguage'))$('#voiceLanguage').disabled=false}};
  try{r.start()}catch{dictationWanted=false;intake.listening=false;clearInterval(dictationTimer);voiceState('Could not start · transcript preserved');if($('#intakeText'))$('#intakeText').readOnly=false;if($('#voiceLanguage'))$('#voiceLanguage').disabled=false}
 }
 run();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dictationWanted){stopIntakeMic();if($('#intakeError'))$('#intakeError').textContent='Dictation paused when the app went into the background. Review the transcript before resuming.'}});
