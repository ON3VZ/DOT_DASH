/* ═══════════════════════════════════════════════
   DOT & DASH  |  js/game.js
   Game Logic — Decode, Send, Stream modes
═══════════════════════════════════════════════ */
'use strict';

/* ─── CONSTANTS ──────────────────────────── */
const QUESTIONS_PER_LEVEL = 10;  // questions in a normal game round
const STREAM_SEQUENCE_LEN = 5;   // letters per stream round
const DOT_THRESHOLD_MS    = 350; // press duration cutoff dot vs dash
const ANSWER_TIME_SEC     = 2.0; // seconds to answer each stream letter
const MIN_UNLOCK_SCORE    = 70;  // % needed to unlock next level

/* ─── GAME STATE ──────────────────────────── */
const Game = {
  levelNum:      1,
  levelDef:      null,
  mode:          'decode',   // 'decode' | 'send'
  questions:     [],
  qIdx:          0,
  correct:       0,
  curLetter:     '',
  curMorse:      '',
  isPlaying:     false,

  // Send mode
  sendAccum:     '',         // accumulated ·/- symbols
  pressStart:    0,
  pressTimer:    null,
  timerInterval: null,
  sidetoneNode:  null,

  // Stream mode
  stream: {
    active:      false,
    sequence:    [],
    idx:         0,
    results:     [],          // true/false per slot
    answerTimer: null,
    timerAnim:   null,
    playing:     false,
    fromResult:  false,       // triggered from result screen bonus btn
  },
};

/* ════════════════════════════════════════════
   NORMAL GAME
════════════════════════════════════════════ */

function startLevel(levelNum) {
  const def = LEVELS[levelNum - 1];
  if (!def) return;

  Game.levelNum  = levelNum;
  Game.levelDef  = def;
  Game.qIdx      = 0;
  Game.correct   = 0;
  Game.questions = generateQuestions(def, QUESTIONS_PER_LEVEL);

  // Mode selection: decode-only for first 3 levels; mix after that
  Game.mode = levelNum <= 3
    ? 'decode'
    : (Math.random() < 0.55 ? 'decode' : 'send');

  // Update topbar
  $('g-level-badge').textContent = 'LEVEL ' + levelNum;
  $('g-total').textContent       = QUESTIONS_PER_LEVEL;
  $('g-correct').textContent     = 0;
  setBar('g-progress', 0);

  showScreen('screen-game');
  setGameMode(Game.mode);
  loadQuestion();

  // Update streak & session count
  const today = new Date().toDateString();
  if (AppState.lastPlayDate !== today) {
    const yd = new Date(Date.now() - 86400000).toDateString();
    AppState.streak       = AppState.lastPlayDate === yd ? AppState.streak + 1 : 1;
    AppState.lastPlayDate = today;
  }
  AppState.totalSessions++;
  saveState();
}

/* ─── QUESTION GENERATION ─────────────────── */
// Weight the focus letter at ~40%, and ensure all known letters appear.
function generateQuestions(def, count) {
  const letters = def.letters;
  const out     = [];
  for (let i = 0; i < count; i++) {
    const useFocus = letters.length > 1 && Math.random() < 0.40;
    const letter   = useFocus
      ? def.focusLetter
      : letters[Math.floor(Math.random() * letters.length)];
    out.push(letter);
  }
  return out;
}

/* ─── MODE SETUP ──────────────────────────── */
function setGameMode(mode) {
  const decodeEl = $('mode-decode');
  const sendEl   = $('mode-send');
  if (mode === 'decode') {
    decodeEl.classList.remove('hidden');
    sendEl.classList.add('hidden');
    $('g-mission-type').textContent = '👂 LUISTER & KIES';
  } else {
    decodeEl.classList.add('hidden');
    sendEl.classList.remove('hidden');
    $('g-mission-type').textContent = '📡 STUUR MORSE';
    initSendButton();
  }
}

/* ─── QUESTION FLOW ───────────────────────── */
function loadQuestion() {
  if (Game.qIdx >= QUESTIONS_PER_LEVEL) {
    endLevel();
    return;
  }
  Game.curLetter = Game.questions[Game.qIdx];
  Game.curMorse  = MORSE_TABLE[Game.curLetter] || '';
  Game.sendAccum = '';

  if (Game.mode === 'decode') loadDecodeQ();
  else                        loadSendQ();
}

function nextQuestion() {
  Game.qIdx++;
  $('g-correct').textContent = Game.correct;
  setBar('g-progress', Game.qIdx / QUESTIONS_PER_LEVEL * 100);
  setTimeout(loadQuestion, 80);
}

/* ─── DECODE MODE ─────────────────────────── */
function loadDecodeQ() {
  buildMorseVisual('g-morse-visual', Game.curMorse);
  buildChoices();

  const btn = $('btn-play');
  btn.classList.remove('playing');
  $('play-icon').classList.remove('spinning');

  // Auto-play after a short pause
  setTimeout(() => { if (!Game.isPlaying) playCurrentMorse(); }, 350);
}

function buildMorseVisual(elemId, morseStr) {
  const el = $(elemId);
  el.innerHTML = '';
  for (const c of (morseStr || '')) {
    const sym = ce('div');
    sym.className = 'morse-sym ' + (c === '.' ? 'dot' : 'dash');
    el.appendChild(sym);
  }
}

function buildChoices() {
  const letters = Game.levelDef.letters;
  // 3 distractors different from correct
  const wrongs  = letters.filter(l => l !== Game.curLetter)
                         .sort(() => Math.random() - 0.5)
                         .slice(0, 3);
  const options = [Game.curLetter, ...wrongs].sort(() => Math.random() - 0.5);

  const grid = $('g-choices');
  grid.innerHTML = '';
  options.forEach(letter => {
    const btn = ce('button');
    btn.className   = 'choice-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => handleDecodeChoice(btn, letter));
    grid.appendChild(btn);
  });
}

function playCurrentMorse() {
  if (Game.isPlaying) return;
  Game.isPlaying = true;
  const btn = $('btn-play');
  btn.classList.add('playing');
  $('play-icon').classList.add('spinning');

  // Reset visual
  qsa('#g-morse-visual .morse-sym').forEach(s => s.classList.remove('active','played'));

  const { charWpm, effWpm } = getLevelWpm(Game.levelNum);

  MorseAudio.playLetter(
    Game.curLetter, charWpm, effWpm,
    (idx) => {
      const syms = qsa('#g-morse-visual .morse-sym');
      syms.forEach((s, i) => {
        if (i < idx) s.classList.replace('active','played') || s.classList.add('played');
        if (i === idx) { s.classList.add('active'); s.classList.remove('played'); }
      });
    },
    () => {
      qsa('#g-morse-visual .morse-sym').forEach(s => {
        s.classList.remove('active'); s.classList.add('played');
      });
      Game.isPlaying = false;
      btn.classList.remove('playing');
      $('play-icon').classList.remove('spinning');
    }
  );
}

function handleDecodeChoice(btn, letter) {
  if (btn.disabled) return;
  qsa('.choice-btn').forEach(b => b.disabled = true);

  if (letter === Game.curLetter) {
    btn.classList.add('correct');
    MorseAudio.playSuccess();
    Game.correct++;
    showFeedback('✨');
    vibrate(50);
    setTimeout(nextQuestion, 850);
  } else {
    btn.classList.add('wrong');
    MorseAudio.playFail();
    vibrate([80, 40, 80]);
    // Reveal correct
    qsa('.choice-btn').forEach(b => {
      if (b.textContent === Game.curLetter) b.classList.add('correct');
    });
    showFeedback('💫');
    setTimeout(nextQuestion, 1200);
  }
}

/* ─── SEND MODE ───────────────────────────── */
function loadSendQ() {
  $('g-send-letter').textContent = Game.curLetter;
  $('g-send-letter').className   = 'big-letter';
  buildMorseVisual('g-send-morse-hint', Game.curMorse);
  $('g-sent-so-far').textContent = '';
  $('g-send-hint').textContent   = 'Tik kort voor · of houd vast voor —';
  const btn = $('send-btn');
  btn.classList.remove('pressing','dash-mode');
  $('timer-fill').style.width = '0%';
}

function initSendButton() {
  const btn = $('send-btn');
  // Replace node to clear all previous listeners
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  const b = $('send-btn');

  b.addEventListener('pointerdown', onSendDown);
  b.addEventListener('pointerup',   onSendUp);
  b.addEventListener('pointerleave',onSendUp);
  b.addEventListener('touchstart',  e => e.preventDefault(), { passive: false });
}

function onSendDown(e) {
  e.preventDefault();
  if (Game.pressStart) return;
  Game.pressStart    = Date.now();
  const btn = $('send-btn');
  btn.classList.add('pressing');
  Game.sidetoneNode  = MorseAudio.startSidetone();
  if (Game.timerInterval) clearInterval(Game.timerInterval);
  Game.timerInterval = setInterval(() => {
    const elapsed = Date.now() - Game.pressStart;
    const pct     = Math.min(elapsed / (DOT_THRESHOLD_MS * 2.5) * 100, 100);
    $('timer-fill').style.width = pct + '%';
    if (elapsed > DOT_THRESHOLD_MS) {
      btn.classList.add('dash-mode');
      btn.classList.remove('pressing');
    }
  }, 30);
}

function onSendUp(e) {
  e.preventDefault();
  if (!Game.pressStart) return;

  clearInterval(Game.timerInterval);
  const elapsed  = Date.now() - Game.pressStart;
  Game.pressStart = 0;
  $('timer-fill').style.width = '0%';

  MorseAudio.stopSidetone(Game.sidetoneNode);
  Game.sidetoneNode = null;

  const sym        = elapsed < DOT_THRESHOLD_MS ? '.' : '-';
  Game.sendAccum  += sym;

  const btn = $('send-btn');
  btn.classList.remove('pressing','dash-mode');

  // Update display
  $('g-sent-so-far').textContent = Game.sendAccum
    .split('').map(c => c === '.' ? '·' : '—').join(' ');

  // After inter-element gap, evaluate
  if (Game.pressTimer) clearTimeout(Game.pressTimer);
  Game.pressTimer = setTimeout(evaluateSend, 600);
}

function evaluateSend() {
  const sent     = Game.sendAccum;
  const expected = Game.curMorse;
  const letterEl = $('g-send-letter');

  if (sent === expected) {
    letterEl.classList.add('correct');
    MorseAudio.playSuccess();
    Game.correct++;
    vibrate(50);
    showFeedback('🌟');
    $('g-send-hint').textContent = '✅ Correct!';
    setTimeout(nextQuestion, 900);
  } else {
    letterEl.classList.add('wrong');
    MorseAudio.playFail();
    vibrate([80, 40, 80]);
    $('g-send-hint').textContent = '❌ Fout — probeer opnieuw!';
    setTimeout(() => {
      letterEl.classList.remove('wrong');
      Game.sendAccum = '';
      $('g-sent-so-far').textContent = '';
      $('g-send-hint').textContent   = 'Tik kort voor · of houd vast voor —';
    }, 900);
  }
}

/* ─── END LEVEL ───────────────────────────── */
function endLevel() {
  const score    = Math.round(Game.correct / QUESTIONS_PER_LEVEL * 100);
  const prev     = AppState.levelScores[Game.levelNum] || 0;
  AppState.levelScores[Game.levelNum] = Math.max(prev, score);

  let newLetter  = null;
  let didUnlock  = false;

  // Unlock next level if score ≥ 70%
  if (score >= MIN_UNLOCK_SCORE) {
    const nextNum = Game.levelNum + 1;
    if (nextNum <= LEVELS.length && nextNum > AppState.currentLevel) {
      AppState.currentLevel = nextNum;
      newLetter             = LEVELS[Game.levelNum - 1].focusLetter; // letter completed
      didUnlock             = true;
    }
  }
  saveState();

  // Build result screen
  const stars = score >= 90 ? '⭐⭐⭐' : score >= 70 ? '⭐⭐' : '⭐';
  const emoji = score >= 90 ? '🏆' : score >= 70 ? '🎯' : '💪';
  const title = score >= 90 ? 'Perfecte Missie!' : score >= 70 ? 'Missie Geslaagd!' : 'Goed geprobeerd!';

  $('r-emoji').textContent  = emoji;
  $('r-stars').textContent  = stars;
  $('r-title').textContent  = title;
  $('r-score').textContent  = score + '%';
  $('r-sub').textContent    = `${Game.correct} van ${QUESTIONS_PER_LEVEL} correct`;

  const unlockEl = $('r-unlock');
  if (newLetter && didUnlock) {
    unlockEl.style.display  = 'block';
    $('r-new-letter').textContent = newLetter;
    $('r-new-morse').textContent  = letterToMorseDisplay(newLetter);
    MorseAudio.playUnlock();
    launchConfetti();
  } else {
    unlockEl.style.display = 'none';
    if (score >= 90) launchConfetti();
  }

  // Next level button
  const btnNext = $('btn-next-level');
  btnNext.style.display = AppState.currentLevel > Game.levelNum ? 'block' : 'none';

  // Stream bonus button: show if level has stream and score was good
  const btnStream = $('btn-stream-bonus');
  const streamOk  = Game.levelDef.streamOk && score >= MIN_UNLOCK_SCORE;
  btnStream.style.display = streamOk ? 'block' : 'none';
  btnStream.onclick       = () => startStream(Game.levelNum, true);

  showScreen('screen-result');
}

function goNextLevel()  { startLevel(Game.levelNum + 1); }
function replayLevel()  { startLevel(Game.levelNum); }

function exitGame() {
  if (Game.pressTimer)    clearTimeout(Game.pressTimer);
  if (Game.timerInterval) clearInterval(Game.timerInterval);
  MorseAudio.stopSidetone(Game.sidetoneNode);
  Game.pressStart = 0;
  showScreen('screen-levels');
}

/* ════════════════════════════════════════════
   STREAM MODE
   — Introduced after successfully learning a new letter.
   — Player hears a sequence of STREAM_SEQUENCE_LEN letters
     played automatically (no play button).
   — After each letter plays, 4-choice buttons appear with
     a visible countdown timer (ANSWER_TIME_SEC seconds).
   — Must answer before timer expires; timeout = wrong.
   — Score shown at the end. Pure real-time CW copy training.
════════════════════════════════════════════ */

function startStream(levelNum, fromResult) {
  const def = LEVELS[levelNum - 1];
  if (!def || !def.streamOk) return;

  const st        = Game.stream;
  st.active       = true;
  st.fromResult   = !!fromResult;
  st.idx          = 0;
  st.results      = [];
  st.playing      = false;
  st.sequence     = buildStreamSequence(def);

  // Reset slots
  const slotsEl = $('stream-slots');
  slotsEl.innerHTML = '';
  st.sequence.forEach((_, i) => {
    const slot = ce('div');
    slot.className = 'stream-slot';
    slot.id        = 'ss-' + i;
    slot.textContent = '?';
    slotsEl.appendChild(slot);
  });

  $('stream-badge').textContent = 'STREAM · LEVEL ' + levelNum;
  $('stream-score-val').textContent = '0/' + STREAM_SEQUENCE_LEN;
  $('stream-stage-inner').classList.remove('hidden');
  $('stream-result').classList.remove('visible');
  $('stream-choices').innerHTML = '';
  $('stream-timer-bar').classList.remove('running','urgent');

  showScreen('screen-stream');
  streamCountdown(3);
}

function buildStreamSequence(def) {
  const letters = def.letters;
  const seq     = [];
  for (let i = 0; i < STREAM_SEQUENCE_LEN; i++) {
    // Weight focus letter ~35%
    const useFocus = letters.length > 1 && Math.random() < 0.35;
    seq.push(useFocus ? def.focusLetter : letters[Math.floor(Math.random() * letters.length)]);
  }
  return seq;
}

function streamCountdown(n) {
  const cntEl = $('stream-countdown');
  cntEl.classList.remove('hidden');
  $('stream-morse-visual').innerHTML = '';
  $('stream-choices').innerHTML      = '';
  $('stream-timer-bar').classList.remove('running','urgent');

  if (n > 0) {
    cntEl.textContent = n;
    cntEl.style.animation = 'none';
    // Force reflow
    void cntEl.offsetWidth;
    cntEl.style.animation = '';
    setTimeout(() => streamCountdown(n - 1), 700);
  } else {
    cntEl.textContent = 'GO!';
    setTimeout(() => {
      cntEl.classList.add('hidden');
      playStreamLetter();
    }, 500);
  }
}

function playStreamLetter() {
  const st  = Game.stream;
  const idx = st.idx;
  if (idx >= STREAM_SEQUENCE_LEN) {
    streamFinished();
    return;
  }

  // Mark current slot as active
  for (let i = 0; i < STREAM_SEQUENCE_LEN; i++) {
    const slot = $('ss-' + i);
    if (slot) slot.classList.toggle('active', i === idx);
  }

  const letter = st.sequence[idx];
  const morse  = MORSE_TABLE[letter] || '';
  buildMorseVisual('stream-morse-visual', morse);
  $('stream-choices').innerHTML = '';
  $('stream-timer-bar').classList.remove('running','urgent');

  st.playing = true;
  const { charWpm, effWpm } = getLevelWpm(Game.levelNum);

  MorseAudio.playLetter(
    letter, charWpm, effWpm,
    (symIdx) => {
      const syms = qsa('#stream-morse-visual .morse-sym');
      syms.forEach((s, i) => {
        if (i < symIdx) { s.classList.remove('active'); s.classList.add('played'); }
        if (i === symIdx) { s.classList.add('active'); s.classList.remove('played'); }
      });
    },
    () => {
      // Morse done — show answer choices
      st.playing = false;
      qsa('#stream-morse-visual .morse-sym').forEach(s => {
        s.classList.remove('active'); s.classList.add('played');
      });
      showStreamChoices(idx, letter);
    }
  );
}

function showStreamChoices(idx, correctLetter) {
  const st      = Game.stream;
  const letters = (LEVELS[Game.levelNum - 1] || {}).letters || [correctLetter];

  // Build 3 distractors
  const wrongs = letters.filter(l => l !== correctLetter)
                        .sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correctLetter, ...wrongs].sort(() => Math.random() - 0.5);

  const grid = $('stream-choices');
  grid.innerHTML = '';
  options.forEach(letter => {
    const btn = ce('button');
    btn.className   = 'stream-choice';
    btn.textContent = letter;
    btn.addEventListener('click', () => handleStreamChoice(btn, letter, correctLetter, idx));
    grid.appendChild(btn);
  });

  // Start countdown timer
  const bar = $('stream-timer-bar');
  bar.style.setProperty('--answer-time', ANSWER_TIME_SEC + 's');
  bar.classList.remove('running','urgent');
  void bar.offsetWidth; // reflow
  bar.classList.add('running');

  // Urgent colour at last 30%
  setTimeout(() => {
    bar.classList.add('urgent');
  }, ANSWER_TIME_SEC * 700);

  // Auto-timeout
  if (st.answerTimer) clearTimeout(st.answerTimer);
  st.answerTimer = setTimeout(() => {
    if (st.idx !== idx) return; // already answered
    handleStreamTimeout(correctLetter, idx);
  }, ANSWER_TIME_SEC * 1000);
}

function handleStreamChoice(btn, chosen, correct, idx) {
  const st = Game.stream;
  if (st.idx !== idx) return; // stale click
  if (st.answerTimer) clearTimeout(st.answerTimer);

  qsa('.stream-choice').forEach(b => b.disabled = true);
  $('stream-timer-bar').classList.remove('running','urgent');

  const isCorrect = chosen === correct;
  st.results.push(isCorrect);

  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    // Highlight correct answer
    qsa('.stream-choice').forEach(b => {
      if (b.textContent === correct) b.classList.add('correct');
    });
  }

  // Update slot
  const slot = $('ss-' + idx);
  if (slot) {
    slot.textContent = correct;
    slot.classList.remove('active');
    slot.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  const correctCount = st.results.filter(Boolean).length;
  $('stream-score-val').textContent = correctCount + '/' + STREAM_SEQUENCE_LEN;

  MorseAudio.playTick(isCorrect);
  vibrate(isCorrect ? 50 : [60,30,60]);

  st.idx++;
  setTimeout(playStreamLetter, 800);
}

function handleStreamTimeout(correct, idx) {
  const st = Game.stream;
  if (st.idx !== idx) return;

  qsa('.stream-choice').forEach(b => {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add('correct');
  });
  $('stream-timer-bar').classList.remove('running','urgent');

  st.results.push(false);

  const slot = $('ss-' + idx);
  if (slot) {
    slot.textContent = correct;
    slot.classList.remove('active');
    slot.classList.add('wrong');
  }

  MorseAudio.playTick(false);
  st.idx++;
  setTimeout(playStreamLetter, 700);
}

function streamFinished() {
  const st          = Game.stream;
  const correctCount = st.results.filter(Boolean).length;
  const pct         = Math.round(correctCount / STREAM_SEQUENCE_LEN * 100);

  $('stream-stage-inner').classList.add('hidden');
  $('stream-choices').innerHTML = '';

  const resEl = $('stream-result');
  resEl.classList.add('visible');

  $('stream-res-score').textContent = correctCount + '/' + STREAM_SEQUENCE_LEN;
  const label = correctCount === STREAM_SEQUENCE_LEN ? '⚡ Perfecte Kopie!' :
                correctCount >= 4 ? '🌟 Geweldig werk!' :
                correctCount >= 3 ? '👍 Goed gedaan!' : '💪 Oefening baart kunst!';
  $('stream-res-label').textContent = label;
  $('stream-res-sub').textContent   = pct + '% correct — ' +
    (pct >= 80 ? 'Jij denkt als een echte agent!' : 'Blijf oefenen, het komt!');

  if (correctCount === STREAM_SEQUENCE_LEN) {
    MorseAudio.playUnlock();
    launchConfetti();
  } else if (correctCount >= 3) {
    MorseAudio.playSuccess();
  }

  // Update stream high score
  const key = 'stream_' + Game.levelNum;
  AppState.levelScores[key] = Math.max(AppState.levelScores[key] || 0, pct);
  saveState();

  // Show action buttons
  const actionsEl = $('stream-actions');
  if (actionsEl) actionsEl.style.display = 'flex';

  st.active = false;
}

function exitStream() {
  const st = Game.stream;
  if (st.answerTimer) clearTimeout(st.answerTimer);
  st.active = false;
  if (st.fromResult) {
    showScreen('screen-result');
  } else {
    showScreen('screen-levels');
  }
}

/* ─── HELPERS ──────────────────────────────── */
function $  (id)  { return document.getElementById(id); }
function ce (tag) { return document.createElement(tag); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
function setBar(id, pct) {
  const el = $(id);
  if (el) el.style.width = pct + '%';
}
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
