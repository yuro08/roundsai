// The welcome screen is presentation only; every cloud request still verifies Auth.
let welcomePreview=false;
const renderWorkspace=render;
render=function(){
  if(cloudLoading){document.body.classList.add('welcome-mode');$('#main').innerHTML='<div class="welcome-shell"><h2>Opening your workspace…</h2><p role="status">Loading your saved census.</p></div>';return}
  const showWelcome=!cloudSession&&!welcomePreview;
  document.body.classList.toggle('welcome-mode',showWelcome);
  if(!showWelcome){renderWorkspace();return}
  document.title='RoundsAI · Welcome';
  $('#main').innerHTML=`<div class="welcome-shell"><header class="welcome-brand"><span class="wordmark"><img class="brand-logo" src="/roundsai-logo.png" alt="RoundsAI" width="112" height="28"></span><span class="welcome-beta">EARLY ACCESS</span></header><section class="welcome-hero"><div class="welcome-kicker"><span></span> BUILT BY RESIDENTS. FOR RESIDENTS.</div><h1>A clearer picture.<br>A better round.</h1><p>Your patients, presentations and learning.<br>One thoughtful space for your day.</p><div class="welcome-art" aria-label="Illustration of a rounding workspace"><div class="art-orbit"></div><div class="art-note"><div class="art-note-top"><span class="art-avatar">AM</span><div><strong>Alex Morgan</strong><small>Fictional patient · Room 402</small></div><span class="art-dot"></span></div><div class="art-divider"></div><div class="art-eyebrow">YOUR ROUNDING BRIEF</div><strong class="art-heading">The details that matter.</strong><div class="art-lines"><i></i><i></i></div><div class="art-insight">${icon('spark')}<div><strong>A little heads-up</strong><small>Keep your next reassessment in view.</small></div></div></div><span class="art-floating">${icon('note')} Ready for rounds</span></div><div class="welcome-benefits"><span>${icon('note')} Capture</span><span>${icon('rounds')} Present</span><span>${icon('spark')} Learn</span></div></section><section class="welcome-entry"><button class="primary full" id="welcomeSignIn">Sign in to RoundsAI ${icon('arrow')}</button><button class="text-button full" id="welcomeExplore">Explore the demo</button><button class="text-button full" id="welcomeSignUp">Create an account</button><p>Your own account. Your own saved census.</p></section><footer class="welcome-footer"><span>LESS FRICTION. MORE FOCUS.</span><p>Early access · Use fictional patient cases only.</p></footer></div>`;
};
document.addEventListener('click',e=>{
  if(e.target.closest('#welcomeSignUp'))cloudSignIn(async()=>{welcomePreview=false;close();render()},'signup');
  if(e.target.closest('#welcomeSignIn'))cloudSignIn(async()=>{welcomePreview=false;close();render()});
  if(e.target.closest('#welcomeExplore')){welcomePreview=true;render()}
  if(e.target.closest('#welcomeBack')){welcomePreview=false;close();render()}
  if(e.target.closest('#cloudLogout'))welcomePreview=false;
});
render();
