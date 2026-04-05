/* ═══════════════════════════════════════════════
   DOT & DASH v3  |  js/app.js
   Profiles, Screen Management, UI
═══════════════════════════════════════════════ */
'use strict';

/* ─── MULTI-PROFILE STORAGE ─────────────────── */
const PROFILES_KEY    = 'dotdash3_profiles';
const ACTIVE_KEY      = 'dotdash3_active';
const MAX_PROFILES    = 3;

const AVATARS = ['🕵️','👾','🤖','🦊','🐯','🦁','🐬','🦅'];

let Profile = null;   // active profile object (game.js accesses this directly)
let allProfiles = [];
let activeId = null;

function defaultProfile(name, avatar) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
    name: name || 'Agent',
    avatar: avatar || '🕵️',
    onboardDone: false,
    currentLevel: 1,
    levelScores: {},
    streak: 0,
    lastPlayDate: null,
    totalSessions: 0,
    speedRecords: {},
  };
}

function loadProfiles() {
  try {
    allProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY)) || [];
    activeId    = localStorage.getItem(ACTIVE_KEY);
  } catch { allProfiles = []; activeId = null; }
}

function saveProfiles() {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(allProfiles));
  if(activeId) localStorage.setItem(ACTIVE_KEY, activeId);
}

function saveProfile() {
  // Write Profile back into allProfiles
  const idx = allProfiles.findIndex(p=>p.id===Profile.id);
  if(idx>=0) allProfiles[idx] = {...Profile};
  saveProfiles();
}

function activateProfile(id) {
  const p = allProfiles.find(p=>p.id===id);
  if(!p) return;
  Profile  = {...p};
  activeId = id;
  localStorage.setItem(ACTIVE_KEY, id);
}

/* ─── SCREEN MANAGEMENT ──────────────────────── */
const NO_NAV_SCREENS = new Set([
  'screen-game','screen-stream','screen-onboard','screen-result','screen-learn','screen-profiles'
]);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
  const dock=document.getElementById('nav-dock');
  if(dock) dock.style.display = NO_NAV_SCREENS.has(id)?'none':'flex';

  if(id==='screen-home')    updateHomeUI();
  if(id==='screen-levels')  renderLevels();
  if(id==='screen-profile') renderProfileScreen();
  window.scrollTo(0,0);
}

function navTo(screenId, navId) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const n=document.getElementById(navId); if(n) n.classList.add('active');
  showScreen(screenId);
}

/* ─── PROFILES SCREEN ────────────────────────── */
function renderProfilesScreen() {
  const grid=document.getElementById('profiles-grid');
  if(!grid) return;
  grid.innerHTML='';

  allProfiles.forEach(p=>{
    const card=ce('div'); card.className='profile-select-card';
    const rank=getRankForLevel(p.currentLevel||1);
    card.innerHTML=`
      <div class="psc-avatar">${p.avatar||'🕵️'}</div>
      <div class="psc-name">${p.name}</div>
      <div class="psc-rank" style="color:${rank.color}">${rank.name}</div>
      <div class="psc-stats">Level ${p.currentLevel||1} · 🔥${p.streak||0}</div>
    `;
    card.addEventListener('click',()=>selectProfile(p.id));
    grid.appendChild(card);
  });

  if(allProfiles.length<MAX_PROFILES) {
    const add=ce('div'); add.className='profile-select-card profile-add';
    add.innerHTML='<div class="psc-avatar">➕</div><div class="psc-name">Nieuw profiel</div>';
    add.addEventListener('click',()=>showNewProfileForm());
    grid.appendChild(add);
  }

  document.getElementById('profiles-new-form').style.display='none';
}

function showNewProfileForm() {
  document.getElementById('profiles-new-form').style.display='flex';
  document.getElementById('new-profile-name').focus();
  // Avatar picker
  const picker=document.getElementById('avatar-picker');
  picker.innerHTML='';
  AVATARS.forEach(av=>{
    const btn=ce('button'); btn.className='avatar-opt'; btn.textContent=av;
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.avatar-opt').forEach(b=>b.classList.remove('sel'));
      btn.classList.add('sel');
    });
    picker.appendChild(btn);
  });
  picker.firstChild.classList.add('sel');
}

function createNewProfile() {
  const name=(document.getElementById('new-profile-name').value||'').trim()||'Agent';
  const avatar=document.querySelector('.avatar-opt.sel')?.textContent||'🕵️';
  const p=defaultProfile(name,avatar);
  p.onboardDone=true;
  allProfiles.push(p);
  saveProfiles();
  activateProfile(p.id);
  showScreen('screen-home');
  updateHomeUI();
  showToast('Welkom, '+name+'! 🕵️');
}

function selectProfile(id) {
  activateProfile(id);
  const p=Profile;
  if(!p.onboardDone){
    showScreen('screen-onboard');
  } else {
    showScreen('screen-home');
    updateHomeUI();
    showToast('Welkom terug, '+p.name+'! 🕵️');
  }
}

/* ─── ONBOARDING ─────────────────────────────── */
let obStep=0;
function nextOnboard(){
  document.getElementById('ob-'+obStep).classList.remove('active');
  obStep=Math.min(obStep+1,3);
  document.getElementById('ob-'+obStep).classList.add('active');
  document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i===obStep));
}
function finishOnboard(){
  const name=(document.getElementById('agent-name-input').value||'').trim()||'Agent X';
  Profile.name=name; Profile.onboardDone=true;
  saveProfile(); showScreen('screen-home'); updateHomeUI();
  showToast('Welkom, '+name+'! Jouw missie begint nu. 🕵️');
}

/* ─── HOME ───────────────────────────────────── */
function updateHomeUI(){
  if(!Profile) return;
  const lettersKnown=Math.min(Profile.currentLevel+1,KOCH_SEQUENCE.length);
  document.getElementById('home-agent-name').textContent='Agent '+Profile.name;
  document.getElementById('stat-level').textContent=Profile.currentLevel;
  document.getElementById('stat-letters').textContent=lettersKnown;
  document.getElementById('stat-streak').textContent=Profile.streak||0;
  document.getElementById('home-avatar').textContent=Profile.avatar||'🕵️';
  const rank=getRankForLevel(Profile.currentLevel);
  document.getElementById('home-rank').textContent=rank.emoji+' '+rank.name;
  document.getElementById('home-rank').style.color=rank.color;
}

/* ─── LEVEL SELECT ───────────────────────────── */
function renderLevels(){
  const container=document.getElementById('levels-container');
  container.innerHTML='';

  // Group by rank
  let lastRankName=null, section=null, grid=null;

  LEVELS.forEach(lv=>{
    const unlocked = lv.num<=Profile.currentLevel;
    const score    = Profile.levelScores[lv.num];
    const isCur    = lv.num===Profile.currentLevel;
    const done     = score!==undefined && score>=lv.minScore;
    const rank     = lv.rank || getRankForLevel(lv.num);
    const streamSc = Profile.levelScores['stream_'+lv.num];

    // Group header
    const groupKey=lv.group==='bonus'?'🎁 Bonus Q-codes':
                   lv.group==='numbers'?'🔢 Cijfers':
                   rank.name;
    if(groupKey!==lastRankName){
      lastRankName=groupKey;
      section=ce('div'); section.className='rank-section';
      const hdr=ce('div'); hdr.className='rank-header';
      const dot=lv.group==='bonus'?'🎁':lv.group==='numbers'?'🔢':(rank.emoji||'●');
      hdr.innerHTML=`<span>${dot}</span> ${groupKey}`;
      section.appendChild(hdr);
      grid=ce('div'); grid.className='levels-grid';
      section.appendChild(grid);
      container.appendChild(section);
    }

    // Stars
    const stars=!unlocked?'':
      score===undefined?'':
      score>=90?'⭐⭐⭐':score>=70?'⭐⭐':done?'⭐':'';

    // Type badge
    const typeBadge={
      'intro':'🎓','focus':'🎯','practice':'🏋️','master':'👑',
      'qcode':'📻','numbers':'🔢'
    }[lv.type]||'';

    const card=ce('div');
    card.className=['level-card',
      !unlocked?'locked':'',
      isCur?'current':'',
      done?'done':'',
    ].filter(Boolean).join(' ');

    const dispLetters = lv.letters.slice(0,6).join(' ');

    card.innerHTML=`
      <div class="lc-num">LVL ${lv.num} ${typeBadge}</div>
      <div class="lc-letters">${unlocked?dispLetters:'?'}</div>
      <div class="lc-name">${lv.name}</div>
      <div class="lc-stars">${unlocked?(stars||'○○○'):''}</div>
      ${!unlocked?'<div class="lc-lock">🔒</div>':''}
      ${unlocked&&lv.streamOk&&done?`<div class="lc-stream-btn" id="stb-${lv.num}">⚡ ${streamSc?streamSc+'%':'STREAM'}</div>`:''}
    `;

    if(unlocked){
      card.addEventListener('click',e=>{
        if(e.target.classList.contains('lc-stream-btn')) return;
        if(lv.num>Profile.currentLevel){Profile.currentLevel=lv.num;saveProfile();}
        startLevel(lv.num);
      });
    }
    grid.appendChild(card);
  });

  // Wire stream buttons
  LEVELS.forEach(lv=>{
    const sb=document.getElementById('stb-'+lv.num);
    if(sb) sb.addEventListener('click',e=>{e.stopPropagation();startStream(lv.num,false);});
  });
}

/* ─── PROFILE SCREEN ──────────────────────────── */
function renderProfileScreen(){
  if(!Profile) return;
  const rank=getRankForLevel(Profile.currentLevel);
  document.getElementById('p-avatar').textContent=Profile.avatar||'🕵️';
  document.getElementById('p-name').textContent=Profile.name;
  document.getElementById('p-level').textContent=Profile.currentLevel;
  document.getElementById('p-sessions').textContent=Profile.totalSessions||0;
  document.getElementById('p-streak').textContent=Profile.streak||0;
  const rt=document.getElementById('p-rank-tag');
  rt.textContent=rank.name; rt.style.background=rank.color+'22';
  rt.style.color=rank.color; rt.style.border='1px solid '+rank.color+'55';

  // Letter collection
  const cg=document.getElementById('p-collection'); cg.innerHTML='';
  const known=new Set(KOCH_SEQUENCE.slice(0,Math.min(Profile.currentLevel+1,KOCH_SEQUENCE.length)));
  KOCH_SEQUENCE.forEach(l=>{
    const el=ce('div');
    el.className='col-letter'+(known.has(l)?' mastered':'');
    const best=Profile.speedRecords&&Profile.speedRecords[l];
    el.innerHTML=`${l}<div class="col-morse">${(MORSE_TABLE[l]||'').replace(/\./g,'·').replace(/-/g,'—')}</div>${best?`<div class="col-speed">${formatMs(best)}</div>`:''}`;
    el.title=best?`Beste: ${formatMs(best)}`:'';
    cg.appendChild(el);
  });

  // Speed records highlight
  const sr=Profile.speedRecords||{};
  const fastest=Object.entries(sr).sort((a,b)=>a[1]-b[1]).slice(0,3);
  const fEl=document.getElementById('p-speed-records');
  if(fEl){
    fEl.innerHTML=fastest.length?
      fastest.map(([l,ms])=>`<span class="speed-record"><strong>${l}</strong> ${formatMs(ms)}</span>`).join('')
      :'<span style="color:var(--muted)">Nog geen records — speel om te meten!</span>';
  }
}

function resetProgress(){
  if(!confirm('Voortgang wissen voor '+Profile.name+'?')) return;
  const fresh=defaultProfile(Profile.name, Profile.avatar);
  fresh.id=Profile.id; fresh.onboardDone=true;
  Profile={...fresh};
  saveProfile(); renderProfileScreen(); updateHomeUI();
  showToast('Voortgang gewist. Nieuw begin! 💪');
}

function switchProfile(){
  showScreen('screen-profiles');
  renderProfilesScreen();
}

/* ─── STARS ──────────────────────────────────── */
function createStars(){
  const sf=document.getElementById('starfield');
  for(let i=0;i<90;i++){
    const s=ce('div'); s.className='star';
    const sz=Math.random()*2.4+0.4;
    s.style.cssText=`left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;width:${sz}px;height:${sz}px;--d:${(Math.random()*3.5+2).toFixed(1)}s;--delay:${(Math.random()*5).toFixed(1)}s;--o1:${(Math.random()*0.2+0.05).toFixed(2)};--o2:${(Math.random()*0.55+0.45).toFixed(2)}`;
    sf.appendChild(s);
  }
}

/* ─── TOAST / CONFETTI / FEEDBACK ───────────── */
let toastTimer=null;
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

function launchConfetti(){
  const colors=['#ffe44f','#00dfc4','#ff7c2a','#9066f8','#ff4466','#2de88a','#fff'];
  for(let i=0;i<52;i++){
    const p=ce('div'); p.className='confetti-piece';
    p.style.cssText=`left:${(Math.random()*100).toFixed(1)}vw;top:-12px;background:${colors[Math.floor(Math.random()*colors.length)]};transform:rotate(${Math.floor(Math.random()*360)}deg);animation-delay:${(Math.random()*0.5).toFixed(2)}s;animation-duration:${(Math.random()*0.8+0.9).toFixed(2)}s;border-radius:${Math.random()<0.4?'50%':'2px'}`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),2400);
  }
}

function ce(tag){ return document.createElement(tag); }

/* ─── INIT ───────────────────────────────────── */
window.addEventListener('DOMContentLoaded',()=>{
  createStars();
  MorseAudio.resumeOnInteraction();
  loadProfiles();

  if(allProfiles.length===0){
    // First time ever — create default profile and go to onboard
    const p=defaultProfile('','🕵️');
    allProfiles.push(p);
    saveProfiles();
    activateProfile(p.id);
    obStep=0;
    showScreen('screen-onboard');
  } else if(allProfiles.length===1){
    // One profile — auto-select it
    activateProfile(allProfiles[0].id);
    if(!Profile.onboardDone){
      obStep=0; showScreen('screen-onboard');
    } else {
      showScreen('screen-home');
      showToast('Welkom terug, '+Profile.name+'! 🕵️');
    }
  } else {
    // Multiple profiles — show selector
    showScreen('screen-profiles');
    renderProfilesScreen();
  }
});
