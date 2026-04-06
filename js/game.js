/* ═══════════════════════════════════════════════
   DOT & DASH v4  |  js/game.js
   Game Logic — Decode, Reeks, Stream, Briefing
   (Send mode removed — focus on listening)
═══════════════════════════════════════════════ */
'use strict';

const DOT_MS      = 350;
const ANSWER_SEC  = 2.2;
const STREAM_LEN  = 5;
const LEARN_REPS  = 3;

const Game={
  levelNum:0,levelDef:null,
  mode:'decode',   // 'learn'|'decode'|'reeks'
  questions:[],qIdx:0,correct:0,
  curLetter:'',curMorse:'',
  isPlaying:false,answerStart:0,streak:0,
  learn:{playsLeft:LEARN_REPS,playsDone:0,ready:false},
  stream:{active:false,sequence:[],idx:0,results:[],answerTimer:null,playing:false,fromResult:false},
  reeks:{letterIdx:0,pair:[],results:[]},
};

/* ════════════════════════════════════════════
   START LEVEL
════════════════════════════════════════════ */
function startLevel(levelNum){
  const def=LEVELS[levelNum-1];
  if(!def)return;
  Game.levelNum=levelNum;Game.levelDef=def;
  Game.qIdx=0;Game.correct=0;Game.streak=0;
  Game.questions=generateQuestions(def);

  // Mode: intro→learn, reeks type→reeks, else decode
  if(def.type==='intro') Game.mode='learn';
  else if(def.type==='reeks') Game.mode='reeks';
  else Game.mode='decode';

  $('g-level-badge').textContent='LEVEL '+levelNum;
  $('g-total').textContent=def.questionsCount;
  $('g-correct').textContent=0;
  $('g-streak').textContent='';
  setBar('g-progress',0);

  const today=new Date().toDateString();
  if(Profile.lastPlayDate!==today){
    const yd=new Date(Date.now()-86400000).toDateString();
    Profile.streak=Profile.lastPlayDate===yd?Profile.streak+1:1;
    Profile.lastPlayDate=today;
  }
  Profile.totalSessions++;saveProfile();

  if(Game.mode==='learn') startLearnPhase();
  else if(Game.mode==='reeks'){showScreen('screen-game');setReeksMode();loadReeksPair();}
  else{showScreen('screen-game');setDecodeMode();loadQuestion();}
}

/* ─── QUESTION GENERATION ─────────────────── */
function generateQuestions(def){
  const all=def.letters,focus=def.focusLetter,count=def.questionsCount,weight=def.focusWeight;
  const active=all.length>=2?all:[...all,...KOCH_SEQUENCE.slice(0,2)].filter((v,i,a)=>a.indexOf(v)===i);
  const out=[];

  if(def.type==='master'){
    // Guarantee every known letter appears at least once
    [...active].sort(()=>Math.random()-0.5).forEach(l=>out.push(l));
    const extra=Math.max(1,Math.round(count*weight)-1);
    for(let i=0;i<extra;i++) out.push(focus);
    while(out.length<count){
      out.push(Math.random()<weight*0.5?focus:active[Math.floor(Math.random()*active.length)]);
    }
    while(out.length>count) out.pop();
  } else if(def.type==='reeks'){
    // pairs — each "question" is a pair of letters
    for(let i=0;i<count;i++){
      const l1=active[Math.floor(Math.random()*active.length)];
      let l2=active[Math.floor(Math.random()*active.length)];
      if(l2===l1&&active.length>1){l2=active.filter(l=>l!==l1)[Math.floor(Math.random()*(active.length-1))];}
      out.push(l1+'|'+l2);
    }
    return out;
  } else {
    // Weighted random with focus guarantee
    const minFocus=Math.max(2,Math.round(count*weight*0.75));
    for(let i=0;i<minFocus;i++) out.push(focus);
    const others=active.filter(l=>l!==focus);
    while(out.length<count){
      out.push(others.length===0||Math.random()<weight*0.6
        ?focus:others[Math.floor(Math.random()*others.length)]);
    }
  }

  // Shuffle + break triple runs
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  for(let i=2;i<out.length;i++){
    if(out[i]===out[i-1]&&out[i]===out[i-2]){
      for(let j=i+1;j<out.length;j++){if(out[j]!==out[i]){[out[i],out[j]]=[out[j],out[i]];break;}}
    }
  }
  return out;
}

/* ════════════════════════════════════════════
   LEARN PHASE
════════════════════════════════════════════ */
function startLearnPhase(){
  const def=Game.levelDef;
  const introLetters=def.introLetters||[def.focusLetter];
  Game.learn={playsLeft:LEARN_REPS,playsDone:0,ready:false};
  showScreen('screen-learn');

  const lettersHTML=introLetters.map(l=>{
    const mn=MNEMONIC_DATA[l];
    const morse=MORSE_TABLE[l]||'';
    let sylHTML='';
    if(mn){
      sylHTML=mn.syllables.map((s,si)=>{
        const isDah=morse[si]==='-';
        return`<span class="syl-block ${isDah?'syl-dah':'syl-di'}" id="syl-${l}-${si}">${s}</span>`;
      }).join('');
    }
    return`<div class="learn-letter-block" id="llb-${l}">
      <div class="learn-big-letter">${l}</div>
      <div class="learn-morse-txt">${letterToMorseDisplay(l)}</div>
      ${mn?`<div class="learn-sound-word">
        <div class="sound-word-label">🔊 Zeg hardop mee:</div>
        <div class="sound-word-syllables" id="syl-row-${l}">${sylHTML}</div>
        <div class="sound-word-hint">${mn.hint}</div>
      </div>`:''}
      <div class="learn-morse-dots" id="lmd-${l}"></div>
    </div>`;
  }).join('');

  $('learn-letters').innerHTML=lettersHTML;
  $('learn-level-name').textContent=def.name;
  $('learn-plays-left').textContent=`🎵 Luister ${LEARN_REPS}× en zeg het mee!`;
  $('learn-start-btn').style.display='none';
  introLetters.forEach(l=>buildMorseVisual('lmd-'+l,MORSE_TABLE[l]||''));
  setTimeout(()=>learnAutoPlay(introLetters,0),700);
}

function learnAutoPlay(letters,rep){
  if(rep>=LEARN_REPS){
    $('learn-plays-left').textContent='✅ Goed geluisterd! Je kan beginnen.';
    $('learn-start-btn').style.display='block';
    Game.learn.ready=true;return;
  }
  const msgs=['🎵 Luister goed — zeg het hardop mee!','🎵 Nog een keer — voel het ritme!','🎵 Laatste keer — jij hebt dit!'];
  $('learn-plays-left').textContent=msgs[rep]||`🎵 Herhaling ${rep+1}…`;
  const{charWpm,effWpm}=getLevelWpm(Game.levelNum);
  let idx=0;
  function playNext(){
    if(idx>=letters.length){Game.learn.playsDone++;setTimeout(()=>learnAutoPlay(letters,rep+1),900);return;}
    const l=letters[idx];
    const dots=qsa('#lmd-'+l+' .morse-sym');
    const syls=qsa(`#syl-row-${l} .syl-block`);
    dots.forEach(d=>d.classList.remove('active','played'));
    syls.forEach(s=>s.classList.remove('syl-active','syl-done'));
    qsa('.learn-letter-block').forEach(b=>b.classList.remove('llb-playing'));
    const bl=document.getElementById('llb-'+l);if(bl)bl.classList.add('llb-playing');
    MorseAudio.playLetter(l,charWpm,effWpm,si=>{
      dots.forEach((d,i)=>{if(i<si){d.classList.replace('active','played')||d.classList.add('played');}if(i===si){d.classList.add('active');d.classList.remove('played');}});
      syls.forEach((s,i)=>{s.classList.remove('syl-active');if(i<si)s.classList.add('syl-done');if(i===si){s.classList.remove('syl-done');s.classList.add('syl-active');}});
    },()=>{
      dots.forEach(d=>{d.classList.remove('active');d.classList.add('played');});
      syls.forEach(s=>{s.classList.remove('syl-active');s.classList.add('syl-done');});
      if(bl)bl.classList.remove('llb-playing');
      idx++;setTimeout(playNext,600);
    });
  }
  playNext();
}
function learnPlayAgain(){
  const letters=Game.levelDef.introLetters||[Game.levelDef.focusLetter];
  letters.forEach(l=>{
    qsa('#lmd-'+l+' .morse-sym').forEach(d=>d.classList.remove('active','played'));
    qsa(`#syl-row-${l} .syl-block`).forEach(s=>s.classList.remove('syl-active','syl-done'));
  });
  learnAutoPlay(letters,0);
}
function learnStartQuiz(){showScreen('screen-game');setDecodeMode();loadQuestion();}
function exitLearn(){showScreen('screen-levels');}

/* ════════════════════════════════════════════
   DECODE MODE
════════════════════════════════════════════ */
function setDecodeMode(){
  $('mode-decode').classList.remove('hidden');
  $('mode-reeks').classList.add('hidden');
  $('g-mission-type').textContent='👂 LUISTER & KIES';
}

function loadQuestion(){
  if(Game.qIdx>=Game.levelDef.questionsCount){endLevel();return;}
  Game.curLetter=Game.questions[Game.qIdx];
  Game.curMorse=MORSE_TABLE[Game.curLetter]||'';
  buildMorseVisual('g-morse-visual',Game.curMorse);
  buildChoices($('g-choices'),Game.levelDef.letters,Game.curLetter);
  $('btn-play').classList.remove('playing');
  $('play-icon').classList.remove('spinning');
  $('g-feedback-bar').style.opacity='0';
  const hintEl=$('g-mnemonic-hint');if(hintEl){hintEl.style.opacity='0';hintEl.textContent='';}
  setTimeout(()=>{if(!Game.isPlaying)playCurrentMorse();},300);
}

function buildMorseVisual(elemId,morseStr){
  const el=$(elemId);if(!el)return;
  el.innerHTML='';
  for(const c of(morseStr||'')){
    const s=ce('div');s.className='morse-sym '+(c==='.'?'dot':'dash');el.appendChild(s);
  }
}

function buildChoices(grid,letters,correct){
  grid.innerHTML='';
  const pool=letters.filter(l=>l!==correct);
  const wrongs=pool.sort(()=>Math.random()-0.5).slice(0,3);
  const options=[correct,...wrongs].sort(()=>Math.random()-0.5);
  options.forEach(letter=>{
    const btn=ce('button');btn.className='choice-btn';
    btn.innerHTML=`<span class="cb-letter">${letter}</span><span class="cb-morse">${letterToMorseDisplay(letter)}</span>`;
    btn.addEventListener('click',()=>handleDecodeChoice(btn,letter,correct));
    grid.appendChild(btn);
  });
  Game.answerStart=0;
}

function playCurrentMorse(){
  if(Game.isPlaying)return;
  Game.isPlaying=true;
  $('btn-play').classList.add('playing');$('play-icon').classList.add('spinning');
  qsa('#g-morse-visual .morse-sym').forEach(s=>s.classList.remove('active','played'));
  const{charWpm,effWpm}=getLevelWpm(Game.levelNum);
  MorseAudio.playLetter(Game.curLetter,charWpm,effWpm,
    idx=>{qsa('#g-morse-visual .morse-sym').forEach((s,i)=>{
      if(i<idx){s.classList.remove('active');s.classList.add('played');}
      if(i===idx){s.classList.add('active');s.classList.remove('played');}
    });},
    ()=>{
      qsa('#g-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
      Game.isPlaying=false;
      $('btn-play').classList.remove('playing');$('play-icon').classList.remove('spinning');
      Game.answerStart=Date.now();
      const mn=MNEMONIC_DATA[Game.curLetter];
      const hintEl=$('g-mnemonic-hint');
      if(hintEl&&mn&&Game.levelNum<=14){hintEl.textContent=`💡 Denk aan: "${mn.word}"`;hintEl.style.opacity='1';}
    }
  );
}

function handleDecodeChoice(btn,letter,correct){
  if(btn.disabled)return;
  qsa('.choice-btn').forEach(b=>b.disabled=true);
  const ok=letter===correct;
  btn.classList.add(ok?'correct':'wrong');
  if(!ok) qsa('.choice-btn').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  if(ok){MorseAudio.playSuccess();Game.correct++;showFeedback(randomMsg(CORRECT_MSGS));vibrate(50);
    if(Game.answerStart>0){const ms=Date.now()-Game.answerStart;if(!Profile.speedRecords)Profile.speedRecords={};
      if(!Profile.speedRecords[correct]||ms<Profile.speedRecords[correct])Profile.speedRecords[correct]=ms;}
    Game.streak++;const sm={3:'🔥 3 op rij!',5:'⚡ 5 op rij!',8:'🌟 8 op rij!!',10:'💥 LEGENDARISCH!!'};
    if(sm[Game.streak])showBanner(sm[Game.streak]);
  } else {MorseAudio.playFail();vibrate([70,30,70]);showFeedback(randomMsg(WRONG_MSGS));Game.streak=0;}
  Game.qIdx++;$('g-correct').textContent=Game.correct;
  $('g-streak').textContent=Game.streak>=3?'🔥'+Game.streak:'';
  setBar('g-progress',Game.qIdx/Game.levelDef.questionsCount*100);
  setTimeout(loadQuestion,ok?750:1100);
}

/* ════════════════════════════════════════════
   REEKS MODE — 2 letters achter elkaar horen
   Speler klikt BEIDE letters in volgorde
════════════════════════════════════════════ */
function setReeksMode(){
  $('mode-decode').classList.add('hidden');
  $('mode-reeks').classList.remove('hidden');
  $('g-mission-type').textContent='👂👂 REEKS LUISTEREN';
}

function loadReeksPair(){
  if(Game.qIdx>=Game.levelDef.questionsCount){endLevel();return;}
  const pair=Game.questions[Game.qIdx].split('|'); // e.g. ['K','M']
  Game.reeks={letterIdx:0,pair,results:[]};

  // Show 2 blank slots
  $('reeks-slot-0').textContent='?';$('reeks-slot-0').className='reeks-slot';
  $('reeks-slot-1').textContent='?';$('reeks-slot-1').className='reeks-slot';
  $('reeks-choices').innerHTML='';
  $('reeks-status').textContent='🔊 Luister naar de twee letters…';
  $('reeks-morse-visual').innerHTML='';
  $('btn-reeks-play').disabled=false;$('btn-reeks-play').style.opacity='1';

  // Build choice pool (all known letters, 4 choices)
  const letters=Game.levelDef.letters;
  buildReeksChoices(letters,pair[0]); // pre-build for letter 1

  // Auto play both letters
  setTimeout(()=>playReeksPair(pair,()=>{
    $('reeks-status').textContent=`Letter 1 van 2 — welke hoorde je?`;
    $('btn-reeks-play').disabled=false;
    buildReeksChoices(letters,pair[0]);
  }),400);
}

function playReeksPair(pair,onDone){
  const{charWpm,effWpm}=getLevelWpm(Game.levelNum);
  $('btn-reeks-play').disabled=true;$('btn-reeks-play').style.opacity='0.5';
  $('reeks-slot-0').className='reeks-slot active';
  $('reeks-slot-1').className='reeks-slot';
  $('reeks-slot-0').textContent='?';$('reeks-slot-1').textContent='?';

  const ac=MorseAudio.ensure();
  const t=calcTiming(charWpm,effWpm);

  // Schedule both letters in sequence on audio timeline
  MorseAudio.playLetter(pair[0],charWpm,effWpm,
    si=>{
      const syms=qsa('#reeks-morse-visual .morse-sym');
      syms.forEach((s,i)=>{
        if(i<si){s.classList.remove('active');s.classList.add('played');}
        if(i===si){s.classList.add('active');s.classList.remove('played');}
      });
    },
    ()=>{
      qsa('#reeks-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
      $('reeks-slot-0').className='reeks-slot done';
      $('reeks-slot-1').className='reeks-slot active';
      buildMorseVisual('reeks-morse-visual',MORSE_TABLE[pair[1]]||'');
      MorseAudio.playLetter(pair[1],charWpm,effWpm,
        si=>{
          const syms=qsa('#reeks-morse-visual .morse-sym');
          syms.forEach((s,i)=>{
            if(i<si){s.classList.remove('active');s.classList.add('played');}
            if(i===si){s.classList.add('active');s.classList.remove('played');}
          });
        },
        ()=>{
          qsa('#reeks-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
          $('reeks-slot-1').className='reeks-slot done';
          if(onDone)onDone();
        }
      );
    }
  );
  buildMorseVisual('reeks-morse-visual',MORSE_TABLE[pair[0]]||'');
}

function buildReeksChoices(letters,correct){
  const grid=$('reeks-choices');grid.innerHTML='';
  const pool=letters.filter(l=>l!==correct);
  const wrongs=pool.sort(()=>Math.random()-0.5).slice(0,3);
  const options=[correct,...wrongs].sort(()=>Math.random()-0.5);
  options.forEach(letter=>{
    const btn=ce('button');btn.className='choice-btn';
    btn.innerHTML=`<span class="cb-letter">${letter}</span><span class="cb-morse">${letterToMorseDisplay(letter)}</span>`;
    btn.addEventListener('click',()=>handleReeksChoice(btn,letter));
    grid.appendChild(btn);
  });
}

function handleReeksChoice(btn,letter){
  if(btn.disabled)return;
  qsa('#reeks-choices .choice-btn').forEach(b=>b.disabled=true);
  const pair=Game.reeks.pair;
  const expected=pair[Game.reeks.letterIdx];
  const ok=letter===expected;
  btn.classList.add(ok?'correct':'wrong');
  if(!ok)qsa('#reeks-choices .choice-btn').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===expected)b.classList.add('correct');});
  Game.reeks.results.push(ok);

  // Update slot
  const slot=$(`reeks-slot-${Game.reeks.letterIdx}`);
  if(slot){slot.textContent=expected;slot.className='reeks-slot '+(ok?'correct':'wrong');}

  MorseAudio.playTick(ok);vibrate(ok?40:[60,30,60]);

  Game.reeks.letterIdx++;

  if(Game.reeks.letterIdx<pair.length){
    // Move to next letter
    setTimeout(()=>{
      $('reeks-status').textContent=`Letter 2 van 2 — welke hoorde je?`;
      buildReeksChoices(Game.levelDef.letters,pair[Game.reeks.letterIdx]);
    },700);
  } else {
    // Pair done — evaluate
    const pairCorrect=Game.reeks.results.every(Boolean);
    if(pairCorrect){MorseAudio.playSuccess();Game.correct++;showFeedback(randomMsg(CORRECT_MSGS));vibrate(50);Game.streak++;}
    else{MorseAudio.playFail();Game.streak=0;showFeedback(randomMsg(WRONG_MSGS));}
    Game.qIdx++;
    $('g-correct').textContent=Game.correct;
    $('g-streak').textContent=Game.streak>=3?'🔥'+Game.streak:'';
    setBar('g-progress',Game.qIdx/Game.levelDef.questionsCount*100);
    setTimeout(loadReeksPair,pairCorrect?900:1300);
  }
}

function replayReeksPair(){
  playReeksPair(Game.reeks.pair,()=>{
    $('reeks-status').textContent=`Letter ${Game.reeks.letterIdx+1} van 2 — welke hoorde je?`;
    buildReeksChoices(Game.levelDef.letters,Game.reeks.pair[Game.reeks.letterIdx]);
  });
}

/* ════════════════════════════════════════════
   END LEVEL
════════════════════════════════════════════ */
function endLevel(){
  const def=Game.levelDef;
  const score=Math.round(Game.correct/def.questionsCount*100);
  Profile.levelScores[Game.levelNum]=Math.max(Profile.levelScores[Game.levelNum]||0,score);

  let newLetter=null,didUnlock=false;
  if(score>=def.minScore){
    const next=Game.levelNum+1;
    if(next<=LEVELS.length&&next>Profile.currentLevel){
      Profile.currentLevel=next;newLetter=def.newLetter;didUnlock=true;
    }
  }
  saveProfile();

  const stars=score>=90?'⭐⭐⭐':score>=70?'⭐⭐':score>=def.minScore?'⭐':'';
  const emoji=score>=90?'🏆':score>=70?'🎯':score>=def.minScore?'💪':'😤';
  $('r-emoji').textContent=emoji;$('r-stars').textContent=stars;
  $('r-title').textContent=score>=90?'Perfecte Missie!':score>=70?'Missie Geslaagd!':score>=def.minScore?'Goed geprobeerd!':'Bijna — nog eens!';
  $('r-score').textContent=score+'%';
  $('r-sub').textContent=`${Game.correct} van ${def.questionsCount} correct`;

  const unlockEl=$('r-unlock');
  if(newLetter&&didUnlock){
    unlockEl.style.display='block';
    $('r-new-letter').textContent=newLetter;
    $('r-new-morse').textContent=letterToMorseDisplay(newLetter);
    MorseAudio.playUnlock();launchConfetti();
  } else {unlockEl.style.display='none';if(score>=90){MorseAudio.playLevelUp();launchConfetti();}else if(score>=70)MorseAudio.playSuccess();}

  $('btn-next-level').style.display=Profile.currentLevel>Game.levelNum?'block':'none';
  const streamOk=def.streamOk&&score>=def.minScore;
  $('btn-stream-bonus').style.display=streamOk?'block':'none';
  $('btn-stream-bonus').onclick=()=>startStream(Game.levelNum,true);
  showScreen('screen-result');
}

function goNextLevel(){startLevel(Game.levelNum+1);}
function replayLevel(){startLevel(Game.levelNum);}
function exitGame(){showScreen('screen-levels');}

/* ════════════════════════════════════════════
   STREAM MODE
════════════════════════════════════════════ */
function startStream(levelNum,fromResult){
  const def=LEVELS[levelNum-1];if(!def||!def.streamOk)return;
  const st=Game.stream;
  st.active=true;st.fromResult=!!fromResult;st.idx=0;st.results=[];st.playing=false;
  st.sequence=[...Array(STREAM_LEN)].map(()=>{
    const ls=def.letters;
    return ls.length>1&&Math.random()<0.35?def.focusLetter:ls[Math.floor(Math.random()*ls.length)];
  });
  const slotsEl=$('stream-slots');slotsEl.innerHTML='';
  st.sequence.forEach((_,i)=>{const s=ce('div');s.className='stream-slot';s.id='ss-'+i;s.textContent='?';slotsEl.appendChild(s);});
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
function streamCountdown(n){
  const el=$('stream-countdown');el.classList.remove('hidden');
  $('stream-choices').innerHTML='';$('stream-timer-bar').classList.remove('running','urgent');
  if(n>0){el.textContent=n;el.style.animation='none';void el.offsetWidth;el.style.animation='';setTimeout(()=>streamCountdown(n-1),700);}
  else{el.textContent='GO!';setTimeout(()=>{el.classList.add('hidden');playStreamLetter();},500);}
}
function playStreamLetter(){
  const st=Game.stream,idx=st.idx;
  if(idx>=STREAM_LEN){streamFinished();return;}
  for(let i=0;i<STREAM_LEN;i++){const s=$('ss-'+i);if(s)s.classList.toggle('active',i===idx);}
  const letter=st.sequence[idx];
  buildMorseVisual('stream-morse-visual',MORSE_TABLE[letter]||'');
  $('stream-choices').innerHTML='';$('stream-timer-bar').classList.remove('running','urgent');
  const{charWpm,effWpm}=getLevelWpm(Game.levelNum);
  MorseAudio.playLetter(letter,charWpm,effWpm,
    si=>{const syms=qsa('#stream-morse-visual .morse-sym');syms.forEach((s,i)=>{if(i<si){s.classList.remove('active');s.classList.add('played');}if(i===si){s.classList.add('active');s.classList.remove('played');}});},
    ()=>{qsa('#stream-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});showStreamChoices(idx,letter);}
  );
}
function showStreamChoices(idx,correct){
  const st=Game.stream;
  const letters=(LEVELS[Game.levelNum-1]||{}).letters||[correct];
  const wrongs=letters.filter(l=>l!==correct).sort(()=>Math.random()-0.5).slice(0,3);
  const options=[correct,...wrongs].sort(()=>Math.random()-0.5);
  const grid=$('stream-choices');grid.innerHTML='';
  options.forEach(l=>{
    const btn=ce('button');btn.className='stream-choice';
    btn.innerHTML=`<span class="cb-letter">${l}</span><span class="cb-morse">${letterToMorseDisplay(l)}</span>`;
    btn.addEventListener('click',()=>handleStreamChoice(btn,l,correct,idx));
    grid.appendChild(btn);
  });
  const bar=$('stream-timer-bar');
  bar.style.setProperty('--answer-time',ANSWER_SEC+'s');
  bar.classList.remove('running','urgent');void bar.offsetWidth;bar.classList.add('running');
  setTimeout(()=>bar.classList.add('urgent'),ANSWER_SEC*700);
  if(st.answerTimer)clearTimeout(st.answerTimer);
  st.answerTimer=setTimeout(()=>{if(st.idx===idx)handleStreamTimeout(correct,idx);},ANSWER_SEC*1000);
}
function handleStreamChoice(btn,chosen,correct,idx){
  const st=Game.stream;if(st.idx!==idx)return;
  if(st.answerTimer)clearTimeout(st.answerTimer);
  qsa('.stream-choice').forEach(b=>b.disabled=true);$('stream-timer-bar').classList.remove('running','urgent');
  const ok=chosen===correct;st.results.push(ok);
  btn.classList.add(ok?'correct':'wrong');
  if(!ok)qsa('.stream-choice').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  const slot=$('ss-'+idx);if(slot){slot.textContent=correct;slot.classList.remove('active');slot.classList.add(ok?'correct':'wrong');}
  $('stream-score-val').textContent=st.results.filter(Boolean).length+'/'+STREAM_LEN;
  MorseAudio.playTick(ok);vibrate(ok?50:[60,30,60]);
  st.idx++;setTimeout(playStreamLetter,800);
}
function handleStreamTimeout(correct,idx){
  const st=Game.stream;if(st.idx!==idx)return;
  qsa('.stream-choice').forEach(b=>{b.disabled=true;if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  $('stream-timer-bar').classList.remove('running','urgent');st.results.push(false);
  const slot=$('ss-'+idx);if(slot){slot.textContent=correct;slot.classList.remove('active');slot.classList.add('wrong');}
  MorseAudio.playTick(false);st.idx++;setTimeout(playStreamLetter,700);
}
function streamFinished(){
  const st=Game.stream,correct=st.results.filter(Boolean).length,pct=Math.round(correct/STREAM_LEN*100);
  $('stream-stage-inner').classList.add('hidden');$('stream-choices').innerHTML='';
  $('stream-result').classList.add('visible');
  $('stream-res-score').textContent=correct+'/'+STREAM_LEN;
  $('stream-res-label').textContent=correct===STREAM_LEN?'⚡ Perfecte Kopie!':correct>=4?'🌟 Geweldig!':correct>=3?'👍 Goed!':'💪 Blijven oefenen!';
  $('stream-res-sub').textContent=pct+'% — '+(pct>=80?'Jij denkt als een echte agent!':'Het komt!');
  if(correct===STREAM_LEN){MorseAudio.playUnlock();launchConfetti();}else if(correct>=3)MorseAudio.playSuccess();
  const key='stream_'+Game.levelNum;
  Profile.levelScores[key]=Math.max(Profile.levelScores[key]||0,pct);saveProfile();
  $('stream-actions').style.display='flex';st.active=false;
}
function exitStream(){
  const st=Game.stream;if(st.answerTimer)clearTimeout(st.answerTimer);st.active=false;
  showScreen(st.fromResult?'screen-result':'screen-levels');
}

/* ════════════════════════════════════════════
   GEHEIME BRIEFING
   5 Nederlandse woorden, letter voor letter
════════════════════════════════════════════ */
const Briefing={
  words:[],wordIdx:0,letterIdx:0,
  wordResults:[],isPlaying:false,currentWord:'',
  letterResults:[],
};

function startBriefing(){
  if(!canPlayBriefing()){showToast('Leer eerst meer letters! 📚');return;}
  const words=pickBriefingWords(5);
  if(!words.length){showToast('Nog niet genoeg letters geleerd!');return;}
  Briefing.words=words;Briefing.wordIdx=0;Briefing.wordResults=[];Briefing.isPlaying=false;
  showScreen('screen-briefing');
  briefingLoadWord();
}

function briefingLoadWord(){
  const word=Briefing.words[Briefing.wordIdx];
  Briefing.currentWord=word;Briefing.letterIdx=0;Briefing.letterResults=[];

  // Progress dots
  qsa('.br-word-dot').forEach((d,i)=>{
    d.className='br-word-dot'+(i<Briefing.wordIdx?' done':i===Briefing.wordIdx?' active':'');
  });
  $('br-word-counter').textContent=`${Briefing.wordIdx+1}/5`;
  $('br-word-label').textContent='🔊 Luister naar het woord…';

  // Build letter tiles
  const tilesEl=$('br-tiles');tilesEl.innerHTML='';
  word.split('').forEach((_,i)=>{
    const t=ce('div');t.className='br-tile';t.id='brt-'+i;t.textContent='_';tilesEl.appendChild(t);
  });

  $('br-choices').innerHTML='';
  $('br-morse-visual').innerHTML='';
  $('btn-br-replay').disabled=true;$('btn-br-replay').style.opacity='0.4';

  // Play full word as preview
  briefingPlayFullWord(()=>{
    $('btn-br-replay').disabled=false;$('btn-br-replay').style.opacity='1';
    $('br-word-label').textContent=`Letter 1 van ${word.length} — welke letter?`;
    briefingPlayAndAskLetter();
  });
}

function briefingPlayFullWord(onDone){
  const word=Briefing.currentWord;
  const{charWpm,effWpm}=getLevelWpm(Profile.currentLevel||1);
  Briefing.isPlaying=true;
  $('btn-br-replay').disabled=true;$('btn-br-replay').style.opacity='0.4';

  // Pre-schedule the full word letter by letter
  let i=0;
  function playNext(){
    if(i>=word.length){Briefing.isPlaying=false;if(onDone)onDone();return;}
    const l=word[i];
    MorseAudio.playLetter(l,charWpm,effWpm,null,()=>{i++;setTimeout(playNext,300);});
  }
  playNext();
}

function briefingPlayAndAskLetter(){
  const word=Briefing.currentWord;
  const l=word[Briefing.letterIdx];
  const{charWpm,effWpm}=getLevelWpm(Profile.currentLevel||1);

  // Highlight current tile
  qsa('.br-tile').forEach((t,i)=>t.classList.toggle('active',i===Briefing.letterIdx));

  buildMorseVisual('br-morse-visual',MORSE_TABLE[l]||'');
  $('br-choices').innerHTML='';
  Briefing.isPlaying=true;

  MorseAudio.playLetter(l,charWpm,effWpm,
    si=>{const syms=qsa('#br-morse-visual .morse-sym');syms.forEach((s,i)=>{
      if(i<si){s.classList.remove('active');s.classList.add('played');}
      if(i===si){s.classList.add('active');s.classList.remove('played');}
    });},
    ()=>{
      qsa('#br-morse-visual .morse-sym').forEach(s=>{s.classList.remove('active');s.classList.add('played');});
      Briefing.isPlaying=false;
      briefingBuildChoices(l);
    }
  );
}

function briefingBuildChoices(correct){
  const letters=getKnownLetterSet();
  const pool=[...letters].filter(l=>l!==correct).sort(()=>Math.random()-0.5).slice(0,3);
  const options=[correct,...pool].sort(()=>Math.random()-0.5);
  const grid=$('br-choices');grid.innerHTML='';
  options.forEach(letter=>{
    const btn=ce('button');btn.className='choice-btn';
    btn.innerHTML=`<span class="cb-letter">${letter}</span><span class="cb-morse">${letterToMorseDisplay(letter)}</span>`;
    btn.addEventListener('click',()=>briefingHandleChoice(btn,letter,correct));
    grid.appendChild(btn);
  });
}

function briefingHandleChoice(btn,chosen,correct){
  if(btn.disabled)return;
  qsa('#br-choices .choice-btn').forEach(b=>b.disabled=true);
  const ok=chosen===correct;
  btn.classList.add(ok?'correct':'wrong');
  if(!ok)qsa('#br-choices .choice-btn').forEach(b=>{if(b.querySelector('.cb-letter')?.textContent===correct)b.classList.add('correct');});
  MorseAudio.playTick(ok);vibrate(ok?40:[60,20,60]);
  Briefing.letterResults.push(ok);

  // Fill tile
  const tile=$('brt-'+Briefing.letterIdx);
  if(tile){tile.textContent=correct;tile.classList.remove('active');tile.classList.add(ok?'correct':'wrong');}

  Briefing.letterIdx++;

  if(Briefing.letterIdx<Briefing.currentWord.length){
    setTimeout(()=>{
      $('br-word-label').textContent=`Letter ${Briefing.letterIdx+1} van ${Briefing.currentWord.length} — welke letter?`;
      briefingPlayAndAskLetter();
    },800);
  } else {
    // Word done
    const wordCorrect=Briefing.letterResults.every(Boolean);
    if(wordCorrect){MorseAudio.playSuccess();showFeedback('🌟');}else{showFeedback('💪');}
    Briefing.wordResults.push({word:Briefing.currentWord,correct:wordCorrect,letterResults:[...Briefing.letterResults]});
    Briefing.wordIdx++;
    if(Briefing.wordIdx<Briefing.words.length){
      setTimeout(briefingLoadWord,1200);
    } else {
      setTimeout(briefingFinished,800);
    }
  }
}

function briefingReplayWord(){
  if(Briefing.isPlaying)return;
  // Reset letter progress and replay from current letter
  briefingPlayAndAskLetter();
}

function briefingFinished(){
  const correct=Briefing.wordResults.filter(r=>r.correct).length;
  const pct=Math.round(correct/5*100);

  $('br-result-score').textContent=correct+'/5';
  $('br-result-label').textContent=
    correct===5?'🏆 Perfecte Briefing!':correct>=4?'🌟 Uitstekend!':correct>=3?'👍 Goed!':'💪 Blijven oefenen!';
  $('br-result-sub').textContent=pct+'% woorden correct — '+(pct>=80?'Je bent een echte agent!':'Elke oefening telt!');

  // Show word breakdown
  const listEl=$('br-result-words');listEl.innerHTML='';
  Briefing.wordResults.forEach(r=>{
    const el=ce('div');el.className='br-result-word';
    el.innerHTML=`<span class="brw-icon">${r.correct?'✅':'❌'}</span><span class="brw-word">${r.word}</span>`;
    listEl.appendChild(el);
  });

  if(correct===5){MorseAudio.playUnlock();launchConfetti();}
  else if(correct>=3)MorseAudio.playSuccess();

  const key='briefing_best';
  Profile.levelScores[key]=Math.max(Profile.levelScores[key]||0,pct);saveProfile();

  $('br-stage').style.display='none';
  $('br-result').style.display='flex';
}

function exitBriefing(){showScreen('screen-home');}
function briefingPlayAgain(){Briefing.wordIdx=0;Briefing.wordResults=[];$('br-stage').style.display='flex';$('br-result').style.display='none';briefingLoadWord();}

/* ─── HELPERS ─────────────────────────────── */
function $(id){return document.getElementById(id);}
function ce(tag){return document.createElement(tag);}
function qsa(s){return Array.from(document.querySelectorAll(s));}
function setBar(id,pct){const el=$(id);if(el)el.style.width=pct+'%';}
function vibrate(p){if(navigator.vibrate)navigator.vibrate(p);}
function showFeedback(msg){const b=$('g-feedback-bar');if(!b)return;b.textContent=msg;b.style.opacity='1';setTimeout(()=>{b.style.opacity='0';},900);}
function showBanner(msg){const b=$('streak-banner');if(!b)return;b.textContent=msg;b.classList.add('show');setTimeout(()=>b.classList.remove('show'),1800);}
