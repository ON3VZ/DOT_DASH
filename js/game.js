/* ═══════════════════════════════════════════════
   DOT & DASH v3  |  js/game.js
   Game Logic — Learn, Decode, Send, Stream
═══════════════════════════════════════════════ */
'use strict';

const DOT_MS        = 350;
const ANSWER_SEC    = 2.2;
const STREAM_LEN    = 5;
const LEARN_REPEATS = 3;

/* ─── GAME STATE ────────────────────────────── */
const Game = {
  levelNum:0, levelDef:null,
  mode:'decode',          // 'learn'|'decode'|'send'
  questions:[], qIdx:0, correct:0,
  curLetter:'', curMorse:'',
  isPlaying:false, answerStart:0, streak:0,

  // Send mode
  sendAccum:'', pressStart:0, pressTimer:null,
  timerInterval:null, sidetoneNode:null,

  // Learn phase
  learn: { playsLeft:LEARN_REPEATS, playsDone:0, ready:false },

  // Stream mode
  stream:{
    active:false, sequence:[], idx:0,
    results:[], answerTimer:null, playing:false, fromResult:false,
  },
};

/* ════════════════════════════════════════════
   LEVEL START
════════════════════════════════════════════ */
function startLevel(levelNum) {
  const def = LEVELS[levelNum-1];
  if(!def) return;
  Game.levelNum = levelNum; Game.levelDef = def;
  Game.qIdx=0; Game.correct=0; Game.streak=0;
  Game.questions = generateQuestions(def);

  // Mode selection
  if(def.type==='intro') {
    Game.mode = 'learn';
  } else if(def.sendOk && Math.random()<0.35) {
    Game.mode = 'send';
  } else {
    Game.mode = 'decode';
  }

  $('g-level-badge').textContent = 'LEVEL '+levelNum;
  $('g-total').textContent       = def.questionsCount;
  $('g-correct').textContent     = 0;
  $('g-streak').textContent      = '';
  setBar('g-progress',0);

  // Track session
  const today = new Date().toDateString();
  if(Profile.lastPlayDate!==today){
    const yd=new Date(Date.now()-86400000).toDateString();
    Profile.streak = Profile.lastPlayDate===yd ? Profile.streak+1 : 1;
    Profile.lastPlayDate=today;
  }
  Profile.totalSessions++;
  saveProfile();

  if(Game.mode==='learn') {
    startLearnPhase();
  } else {
    showScreen('screen-game');
    setGameMode(Game.mode);
    loadQuestion();
  }
}

/* ─── QUESTION GENERATION ─────────────────── */
function generateQuestions(def) {
  const letters = def.letters;
  const focus   = def.focusLetter;
  const count   = def.questionsCount;
  const weight  = def.focusWeight;
  const out     = [];

  // Guarantee: focus letter appears at least Math.ceil(count*weight*0.7) times
  const minFocus = Math.max(1, Math.ceil(count * weight * 0.7));
  for(let i=0; i<minFocus; i++) out.push(focus);

  // Fill rest randomly from all known letters
  while(out.length < count) {
    const useFocus = letters.length<=1 || Math.random()<weight;
    out.push(useFocus ? focus : letters[Math.floor(Math.random()*letters.length)]);
  }

  // Shuffle but ensure first question is NOT the focus (keeps it unpredictable)
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

/* ════════════════════════════════════════════
   LEARN PHASE (INTRO levels)
════════════════════════════════════════════ */
function startLearnPhase() {
  const def = Game.levelDef;
  const introLetters = def.introLetters || [def.focusLetter];

  Game.learn.playsLeft = LEARN_REPEATS;
  Game.learn.playsDone = 0;
  Game.learn.ready     = false;

  showScreen('screen-learn');

  // Show all intro letters
  const lettersHTML = introLetters.map(l => `
    <div class="learn-letter-block">
      <div class="learn-big-letter">${l}</div>
      <div class="learn-morse-txt">${letterToMorseDisplay(l)}</div>
      <div class="learn-mnemonic">${MNEMONICS[l]||''}</div>
      <div class="learn-morse-dots" id="lmd-${l}"></div>
    </div>
  `).join('');

  $('learn-letters').innerHTML = lettersHTML;
  $('learn-level-name').textContent = def.name;
  $('learn-plays-left').textContent = `Luister ${LEARN_REPEATS}× — dan ben je klaar!`;
  $('learn-start-btn').style.display = 'none';
  $('learn-tap-hint').style.display = introLetters.length===1 ? 'block':'none';

  // Build morse visuals for each letter
  introLetters.forEach(l => {
    buildMorseVisual('lmd-'+l, MORSE_TABLE[l]||'');
  });

  // Auto-play after short delay
  setTimeout(() => learnAutoPlay(introLetters, 0), 600);
}

function learnAutoPlay(letters, repeatNum) {
  if(repeatNum >= LEARN_REPEATS) {
    // All done — enable start button
    $('learn-plays-left').textContent = '✅ Goed geluisterd! Je kan beginnen.';
    $('learn-start-btn').style.display = 'block';
    Game.learn.ready = true;
    return;
  }

  $('learn-plays-left').textContent = `🎵 Luisterbeurt ${repeatNum+1} van ${LEARN_REPEATS}...`;

  const { charWpm, effWpm } = getLevelWpm(Game.levelNum);

  // Play each intro letter in sequence
  let idx = 0;
  function playNext() {
    if(idx >= letters.length) {
      Game.learn.playsDone++;
      setTimeout(() => learnAutoPlay(letters, repeatNum+1), 800);
      return;
    }
    const letter = letters[idx];
    const dots   = qsa('#lmd-'+letter+' .morse-sym');
    dots.forEach(d => d.classList.remove('active','played'));

    MorseAudio.playLetter(letter, charWpm, effWpm,
      (si) => {
        dots.forEach((d,i)=>{
          if(i<si){d.classList.remove('active');d.classList.add('played');}
          if(i===si){d.classList.add('active');d.classList.remove('played');}
        });
      },
      () => {
        dots.forEach(d=>{d.classList.remove('active');d.classList.add('played');});
        idx++;
        setTimeout(playNext, 500);
      }
    );
  }
  playNext();
}

function learnPlayAgain() {
  const def = Game.levelDef;
  const introLetters = def.introLetters || [def.focusLetter];
  // Reset visuals
  introLetters.forEach(l=>{
    const dots = qsa('#lmd-'+l+' .morse-sym');
    dots.forEach(d=>d.classList.remove('active','played'));
  });
  const {charWpm,effWpm} = getLevelWpm(Game.levelNum);
  introLetters.forEach((l,i)=>{
    setTimeout(()=>{
      MorseAudio.playLetter(l,charWpm,effWpm,
        si=>{
          const dots=qsa('#lmd-'+l+' .morse-sym');
          dots.forEach((d,j)=>{
            if(j<si){d.classList.remove('active');d.classList.add('played');}
            if(j===si){d.classList.add('active');d.classList.remove('played');}
          });
        },
        ()=>{
          const dots=qsa('#lmd-'+l+' .morse-sym');
          dots.forEach(d=>{d.classList.remove('active');d.classList.add('played');});
        }
      );
    }, i*800);
  });
  if(!Game.learn.ready) {
    $('learn-start-btn').style.display='block';
    Game.learn.ready=true;
  }
}

function learnStartQuiz() {
  showScreen('screen-game');
  Game.mode = 'decode';
  setGameMode('decode');
  loadQuestion();
}

function exitLearn() { showScreen('screen-levels'); }

/* ════════════════════════════════════════════
   GAME SCREEN
════════════════════════════════════════════ */
function setGameMode(mode) {
  $('mode-decode').classList.toggle('hidden', mode!=='decode');
  $('mode-send').classList.toggle('hidden', mode!=='send');
  $('g-mission-type').textContent =
    mode==='decode' ? '👂 LUISTER & KIES' : '📡 STUUR MORSE';
  if(mode==='send') initSendButton();
}

/* ─── QUESTION FLOW ──────────────────────── */
function loadQuestion() {
  if(Game.qIdx >= Game.levelDef.questionsCount) { endLevel(); return; }
  Game.curLetter = Game.questions[Game.qIdx];
  Game.curMorse  = MORSE_TABLE[Game.curLetter]||'';
  Game.sendAccum = '';
  if(Game.mode==='decode') loadDecodeQ();
  else loadSendQ();
}

function nextQuestion(wasCorrect) {
  if(wasCorrect) {
    Game.correct++; Game.streak++;
    // Streak messages
    const msgs={3:'🔥 3 op rij!',5:'⚡ 5 op rij!',8:'🌟 8 op rij!!',10:'💥 LEGENDARISCH!!'};
    if(msgs[Game.streak]) showBanner(msgs[Game.streak]);
    // Speed record update
    if(Game.answerStart>0 && Game.mode==='decode'){
      const ms = Date.now()-Game.answerStart;
      const letter = Game.curLetter;
      if(!Profile.speedRecords) Profile.speedRecords={};
      if(!Profile.speedRecords[letter]||ms<Profile.speedRecords[letter]){
        Profile.speedRecords[letter]=ms;
      }
    }
  } else {
    Game.streak=0;
  }
  Game.qIdx++;
  $('g-correct').textContent = Game.correct;
  $('g-streak').textContent  = Game.streak>=3 ? '🔥'+Game.streak : '';
  setBar('g-progress', Game.qIdx/Game.levelDef.questionsCount*100);
  setTimeout(loadQuestion, wasCorrect?750:1100);
}

/* ─── DECODE MODE ────────────────────────── */
function loadDecodeQ() {
  buildMorseVisual('g-morse-visual', Game.curMorse);
  buildChoices();
  $('btn-play').classList.remove('playing');
  $('play-icon').classList.remove('spinning');
  // Hide feedback bar
  $('g-feedback-bar').style.opacity='0';
  setTimeout(()=>{ if(!Game.isPlaying) playCurrentMorse(); }, 300);
}

function buildMorseVisual(elemId, morseStr) {
  const el=$(elemId); if(!el) return;
  el.innerHTML='';
  for(const c of (morseStr||'')){
    const sym=ce('div');
    sym.className='morse-sym '+(c==='.'?'dot':'dash');
    el.appendChild(sym);
  }
}

function buildChoices() {
  const def     = Game.levelDef;
  const letters = def.letters;
  const correct = Game.curLetter;

  // Build distractor pool — prefer letters that are similar in morse
  const pool = letters.filter(l=>l!==correct);
  const wrongs = pool.sort(()=>Math.random()-0.5).slice(0,3);
  const options = [correct,...wrongs].sort(()=>Math.random()-0.5);

  const grid=$('g-choices');
  grid.innerHTML='';

  // Adaptive grid: 2 cols if ≤2 options, else 2×2
  grid.style.gridTemplateColumns = options.length<=2 ? '1fr 1fr' : '1fr 1fr';

  options.forEach(letter=>{
    const btn=ce('button');
    btn.className='choice-btn';
    btn.innerHTML=`
      <span class="cb-letter">${letter}</span>
      <span class="cb-morse">${letterToMorseDisplay(letter)}</span>
    `;
    btn.addEventListener('click',()=>handleDecodeChoice(btn,letter));
    grid.appendChild(btn);
  });

  Game.answerStart = 0; // will be set after morse plays
}

function playCurrentMorse() {
  if(Game.isPlaying) return;
  Game.isPlaying=true;
  $('btn-play').classList.add('playing');
  $('play-icon').classList.add('spinning');
  qsa('#g-morse-visual .morse-sym').forEach(s=>s.classList.remove('active','played'));

  const {charWpm,effWpm}=getLevelWpm(Game.levelNum);
  MorseAudio.playLetter(Game.curLetter,charWpm,effWpm,
    idx=>{
      qsa('#g-morse-visual .morse-sym').forEach((s,i)=>{
        if(i<idx){s.classList.remove('active');s.classList.add('played');}
        if(i===idx){s.classList.add('active');s.classList.remove('played');}
      });
    },
    ()=>{
      qsa('#g-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
      Game.isPlaying=false;
      $('btn-play').classList.remove('playing');
      $('play-icon').classList.remove('spinning');
      Game.answerStart=Date.now(); // start timing after morse plays
    }
  );
}

function handleDecodeChoice(btn,letter){
  if(btn.disabled) return;
  qsa('.choice-btn').forEach(b=>b.disabled=true);
  const correct=letter===Game.curLetter;

  if(correct){
    btn.classList.add('correct');
    MorseAudio.playSuccess();
    showFeedback(randomMsg(CORRECT_MSGS));
    vibrate(50);
    nextQuestion(true);
  } else {
    btn.classList.add('wrong');
    MorseAudio.playFail();
    vibrate([70,30,70]);
    qsa('.choice-btn').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===Game.curLetter) b.classList.add('correct');});
    showFeedback(randomMsg(WRONG_MSGS));
    nextQuestion(false);
  }
}

/* ─── SEND MODE ──────────────────────────── */
function loadSendQ(){
  $('g-send-letter').textContent=Game.curLetter;
  $('g-send-letter').className='big-letter';
  buildMorseVisual('g-send-morse-hint',Game.curMorse);
  $('g-sent-so-far').textContent='';
  $('g-send-hint').textContent='Tik kort · of houd lang —';
  $('send-btn').classList.remove('pressing','dash-mode');
  $('timer-fill').style.width='0%';
}

function initSendButton(){
  const btn=$('send-btn');
  const fresh=btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh,btn);
  const b=$('send-btn');
  b.addEventListener('pointerdown',onSendDown);
  b.addEventListener('pointerup',onSendUp);
  b.addEventListener('pointerleave',onSendUp);
  b.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
}

function onSendDown(e){
  e.preventDefault();
  if(Game.pressStart) return;
  Game.pressStart=Date.now();
  const btn=$('send-btn');
  btn.classList.add('pressing');
  Game.sidetoneNode=MorseAudio.startSidetone();
  if(Game.timerInterval) clearInterval(Game.timerInterval);
  Game.timerInterval=setInterval(()=>{
    const el=Date.now()-Game.pressStart;
    $('timer-fill').style.width=Math.min(el/(DOT_MS*2.5)*100,100)+'%';
    if(el>DOT_MS){btn.classList.add('dash-mode');btn.classList.remove('pressing');}
  },30);
}

function onSendUp(e){
  e.preventDefault();
  if(!Game.pressStart) return;
  clearInterval(Game.timerInterval);
  const el=Date.now()-Game.pressStart; Game.pressStart=0;
  $('timer-fill').style.width='0%';
  MorseAudio.stopSidetone(Game.sidetoneNode); Game.sidetoneNode=null;
  const sym=el<DOT_MS?'.':'-';
  Game.sendAccum+=sym;
  $('send-btn').classList.remove('pressing','dash-mode');
  $('g-sent-so-far').textContent=Game.sendAccum.split('').map(c=>c==='.'?'·':'—').join(' ');
  if(Game.pressTimer) clearTimeout(Game.pressTimer);
  Game.pressTimer=setTimeout(evaluateSend,600);
}

function evaluateSend(){
  const sent=Game.sendAccum, exp=Game.curMorse;
  const el=$('g-send-letter');
  if(sent===exp){
    el.classList.add('correct');
    MorseAudio.playSuccess(); vibrate(50);
    showFeedback(randomMsg(CORRECT_MSGS));
    $('g-send-hint').textContent='✅ Correct!';
    nextQuestion(true);
  } else {
    el.classList.add('wrong');
    MorseAudio.playFail(); vibrate([70,30,70]);
    $('g-send-hint').textContent='❌ Fout — probeer opnieuw!';
    setTimeout(()=>{
      el.classList.remove('wrong');
      Game.sendAccum='';
      $('g-sent-so-far').textContent='';
      $('g-send-hint').textContent='Tik kort · of houd lang —';
    },900);
    nextQuestion(false);
  }
}

/* ─── END LEVEL ──────────────────────────── */
function endLevel(){
  const def=Game.levelDef;
  const score=Math.round(Game.correct/def.questionsCount*100);
  const prev=Profile.levelScores[Game.levelNum]||0;
  Profile.levelScores[Game.levelNum]=Math.max(prev,score);

  let didUnlock=false, newLetter=null;
  if(score>=def.minScore){
    const next=Game.levelNum+1;
    if(next<=LEVELS.length && next>Profile.currentLevel){
      Profile.currentLevel=next;
      newLetter=LEVELS[Game.levelNum-1].newLetter; // may be null
      didUnlock=true;
    }
  }
  saveProfile();

  const stars=score>=90?'⭐⭐⭐':score>=70?'⭐⭐':score>=def.minScore?'⭐':'';
  const emoji=score>=90?'🏆':score>=70?'🎯':score>=def.minScore?'💪':'😤';
  const title=score>=90?'Perfecte Missie!':score>=70?'Missie Geslaagd!':score>=def.minScore?'Goed geprobeerd!':'Bijna — nog eens!';

  $('r-emoji').textContent = emoji;
  $('r-stars').textContent = stars;
  $('r-title').textContent = title;
  $('r-score').textContent = score+'%';
  $('r-sub').textContent   = `${Game.correct} van ${def.questionsCount} correct`;

  const unlockEl=$('r-unlock');
  if(newLetter && didUnlock){
    unlockEl.style.display='block';
    $('r-new-letter').textContent=newLetter;
    $('r-new-morse').textContent=letterToMorseDisplay(newLetter);
    MorseAudio.playUnlock(); launchConfetti();
  } else if(didUnlock){
    unlockEl.style.display='none';
    if(score>=90){MorseAudio.playLevelUp();launchConfetti();}
    else MorseAudio.playSuccess();
  } else {
    unlockEl.style.display='none';
  }

  $('btn-next-level').style.display = Profile.currentLevel>Game.levelNum?'block':'none';

  const streamOk=def.streamOk&&score>=def.minScore;
  $('btn-stream-bonus').style.display=streamOk?'block':'none';
  $('btn-stream-bonus').onclick=()=>startStream(Game.levelNum,true);

  showScreen('screen-result');
}

function goNextLevel()  { startLevel(Game.levelNum+1); }
function replayLevel()  { startLevel(Game.levelNum); }
function exitGame(){
  if(Game.pressTimer) clearTimeout(Game.pressTimer);
  if(Game.timerInterval) clearInterval(Game.timerInterval);
  MorseAudio.stopSidetone(Game.sidetoneNode);
  Game.pressStart=0;
  showScreen('screen-levels');
}

/* ════════════════════════════════════════════
   STREAM MODE
════════════════════════════════════════════ */
function startStream(levelNum, fromResult){
  const def=LEVELS[levelNum-1];
  if(!def||!def.streamOk) return;
  const st=Game.stream;
  st.active=true; st.fromResult=!!fromResult;
  st.idx=0; st.results=[]; st.playing=false;
  st.sequence=buildStreamSeq(def);

  const slotsEl=$('stream-slots');
  slotsEl.innerHTML='';
  st.sequence.forEach((_,i)=>{
    const s=ce('div'); s.className='stream-slot'; s.id='ss-'+i; s.textContent='?';
    slotsEl.appendChild(s);
  });

  $('stream-badge').textContent='⚡ STREAM · LEVEL '+levelNum;
  $('stream-score-val').textContent='0/'+STREAM_LEN;
  $('stream-stage-inner').classList.remove('hidden');
  $('stream-result').classList.remove('visible');
  $('stream-choices').innerHTML='';
  $('stream-timer-bar').classList.remove('running','urgent');
  $('stream-actions').style.display='none';

  showScreen('screen-stream');
  streamCountdown(3);
}

function buildStreamSeq(def){
  const letters=def.letters, focus=def.focusLetter;
  return Array.from({length:STREAM_LEN},()=>
    letters.length>1&&Math.random()<0.35 ? focus : letters[Math.floor(Math.random()*letters.length)]
  );
}

function streamCountdown(n){
  const el=$('stream-countdown');
  el.classList.remove('hidden');
  $('stream-choices').innerHTML='';
  $('stream-timer-bar').classList.remove('running','urgent');
  if(n>0){
    el.textContent=n; el.style.animation='none'; void el.offsetWidth; el.style.animation='';
    setTimeout(()=>streamCountdown(n-1),700);
  } else {
    el.textContent='GO!';
    setTimeout(()=>{ el.classList.add('hidden'); playStreamLetter(); },500);
  }
}

function playStreamLetter(){
  const st=Game.stream, idx=st.idx;
  if(idx>=STREAM_LEN){ streamFinished(); return; }
  for(let i=0;i<STREAM_LEN;i++){
    const s=$('ss-'+i); if(s) s.classList.toggle('active',i===idx);
  }
  const letter=st.sequence[idx];
  buildMorseVisual('stream-morse-visual',MORSE_TABLE[letter]||'');
  $('stream-choices').innerHTML='';
  $('stream-timer-bar').classList.remove('running','urgent');
  st.playing=true;
  const {charWpm,effWpm}=getLevelWpm(Game.levelNum);
  MorseAudio.playLetter(letter,charWpm,effWpm,
    si=>{
      const syms=qsa('#stream-morse-visual .morse-sym');
      syms.forEach((s,i)=>{
        if(i<si){s.classList.remove('active');s.classList.add('played');}
        if(i===si){s.classList.add('active');s.classList.remove('played');}
      });
    },
    ()=>{
      st.playing=false;
      qsa('#stream-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
      showStreamChoices(idx,letter);
    }
  );
}

function showStreamChoices(idx,correct){
  const st=Game.stream;
  const letters=(LEVELS[Game.levelNum-1]||{}).letters||[correct];
  const wrongs=letters.filter(l=>l!==correct).sort(()=>Math.random()-0.5).slice(0,3);
  const options=[correct,...wrongs].sort(()=>Math.random()-0.5);

  const grid=$('stream-choices'); grid.innerHTML='';
  options.forEach(l=>{
    const btn=ce('button'); btn.className='stream-choice';
    btn.innerHTML=`<span class="cb-letter">${l}</span><span class="cb-morse">${letterToMorseDisplay(l)}</span>`;
    btn.addEventListener('click',()=>handleStreamChoice(btn,l,correct,idx));
    grid.appendChild(btn);
  });

  const bar=$('stream-timer-bar');
  bar.style.setProperty('--answer-time',ANSWER_SEC+'s');
  bar.classList.remove('running','urgent'); void bar.offsetWidth; bar.classList.add('running');
  setTimeout(()=>bar.classList.add('urgent'),ANSWER_SEC*700);

  if(st.answerTimer) clearTimeout(st.answerTimer);
  st.answerTimer=setTimeout(()=>{if(st.idx===idx)handleStreamTimeout(correct,idx);},ANSWER_SEC*1000);
}

function handleStreamChoice(btn,chosen,correct,idx){
  const st=Game.stream; if(st.idx!==idx) return;
  if(st.answerTimer) clearTimeout(st.answerTimer);
  qsa('.stream-choice').forEach(b=>b.disabled=true);
  $('stream-timer-bar').classList.remove('running','urgent');
  const ok=chosen===correct; st.results.push(ok);
  btn.classList.add(ok?'correct':'wrong');
  if(!ok) qsa('.stream-choice').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  const slot=$('ss-'+idx);
  if(slot){slot.textContent=correct;slot.classList.remove('active');slot.classList.add(ok?'correct':'wrong');}
  $('stream-score-val').textContent=st.results.filter(Boolean).length+'/'+STREAM_LEN;
  MorseAudio.playTick(ok); vibrate(ok?50:[60,30,60]);
  st.idx++; setTimeout(playStreamLetter,800);
}

function handleStreamTimeout(correct,idx){
  const st=Game.stream; if(st.idx!==idx) return;
  qsa('.stream-choice').forEach(b=>{b.disabled=true;if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  $('stream-timer-bar').classList.remove('running','urgent');
  st.results.push(false);
  const slot=$('ss-'+idx);
  if(slot){slot.textContent=correct;slot.classList.remove('active');slot.classList.add('wrong');}
  MorseAudio.playTick(false); st.idx++;
  setTimeout(playStreamLetter,700);
}

function streamFinished(){
  const st=Game.stream;
  const correct=st.results.filter(Boolean).length;
  const pct=Math.round(correct/STREAM_LEN*100);
  $('stream-stage-inner').classList.add('hidden');
  $('stream-choices').innerHTML='';
  $('stream-result').classList.add('visible');
  $('stream-res-score').textContent=correct+'/'+STREAM_LEN;
  $('stream-res-label').textContent=
    correct===STREAM_LEN?'⚡ Perfecte Kopie!':correct>=4?'🌟 Geweldig!':correct>=3?'👍 Goed!':'💪 Blijven oefenen!';
  $('stream-res-sub').textContent=pct+'% — '+(pct>=80?'Jij denkt als een echte agent!':'Het komt, oefening baart kunst!');

  if(correct===STREAM_LEN){MorseAudio.playUnlock();launchConfetti();}
  else if(correct>=3) MorseAudio.playSuccess();

  const key='stream_'+Game.levelNum;
  Profile.levelScores[key]=Math.max(Profile.levelScores[key]||0,pct);
  saveProfile();
  $('stream-actions').style.display='flex';
  st.active=false;
}

function exitStream(){
  const st=Game.stream;
  if(st.answerTimer) clearTimeout(st.answerTimer);
  st.active=false;
  showScreen(st.fromResult?'screen-result':'screen-levels');
}

/* ─── UI HELPERS ─────────────────────────── */
function $(id)   { return document.getElementById(id); }
function ce(tag) { return document.createElement(tag); }
function qsa(s)  { return Array.from(document.querySelectorAll(s)); }
function setBar(id,pct){ const el=$(id); if(el) el.style.width=pct+'%'; }
function vibrate(p){ if(navigator.vibrate) navigator.vibrate(p); }

function showFeedback(msg){
  const bar=$('g-feedback-bar');
  if(!bar) return;
  bar.textContent=msg;
  bar.style.opacity='1';
  bar.style.transform='translateY(0)';
  setTimeout(()=>{bar.style.opacity='0';},900);
}

function showBanner(msg){
  const b=$('streak-banner');
  if(!b) return;
  b.textContent=msg;
  b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'),1800);
}
