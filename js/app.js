/* ═══════════════════════════════════════════════
   DOT & DASH  |  js/app.js
   App Init, Screen Management, UI Helpers
═══════════════════════════════════════════════ */
'use strict';

/* ─── STATE & PERSISTENCE ─────────────────── */
const STORAGE_KEY = 'dotdash_v3';

let AppState = loadState();

function defaultState() {
  return {
    agentName:    null,
    onboardDone:  false,
    currentLevel: 1,
    levelScores:  {},  // { levelNum: score, 'stream_N': score }
    streak:       0,
    lastPlayDate: null,
    totalSessions:0,
  };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s ? { ...defaultState(), ...s } : defaultState();
  } catch { return defaultState(); }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
}

/* ─── SCREEN MANAGEMENT ───────────────────── */
const SCREENS_WITHOUT_NAV = new Set([
  'screen-game', 'screen-stream', 'screen-onboard', 'screen-result',
]);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');

  const dock = document.getElementById('nav-dock');
  if (dock) dock.style.display = SCREENS_WITHOUT_NAV.has(id) ? 'none' : 'flex';

  if (id === 'screen-home')    updateHomeStats();
  if (id === 'screen-levels')  renderLevelSelect();
  if (id === 'screen-profile') renderProfile();

  window.scrollTo(0, 0);
}

function navTo(screenId, navId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(navId);
  if (navEl) navEl.classList.add('active');
  showScreen(screenId);
}

/* ─── ONBOARDING ──────────────────────────── */
let obStep = 0;
function nextOnboard() {
  document.getElementById('ob-' + obStep).classList.remove('active');
  obStep = Math.min(obStep + 1, 3);
  document.getElementById('ob-' + obStep).classList.add('active');
  // Update indicator dots
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i === obStep));
}
function finishOnboard() {
  const name = (document.getElementById('agent-name-input').value || '').trim() || 'Agent X';
  AppState.agentName   = name;
  AppState.onboardDone = true;
  saveState();
  showScreen('screen-home');
  showToast('Welkom, ' + name + '! Jouw missie begint nu. 🕵️');
}

/* ─── HOME ────────────────────────────────── */
function updateHomeStats() {
  const lettersKnown = Math.min(AppState.currentLevel + 1, KOCH_SEQUENCE.length);
  document.getElementById('stat-level').textContent   = AppState.currentLevel;
  document.getElementById('stat-letters').textContent = lettersKnown;
  document.getElementById('stat-streak').textContent  = AppState.streak;
  document.getElementById('home-agent-name').textContent =
    AppState.agentName ? 'Agent ' + AppState.agentName : 'Agent';
}

/* ─── LEVEL SELECT ────────────────────────── */
function renderLevelSelect() {
  const container = document.getElementById('levels-container');
  container.innerHTML = '';

  let currentRankName = null;
  let currentGrid     = null;
  let section         = null;

  LEVELS.forEach(lv => {
    const rank     = getRankForLevel(lv.num);
    const unlocked = lv.num <= AppState.currentLevel;
    const score    = AppState.levelScores[lv.num];
    const isCur    = lv.num === AppState.currentLevel;
    const done     = score !== undefined && score >= 70;
    const streamScore = AppState.levelScores['stream_' + lv.num];

    // New rank section?
    if (rank.name !== currentRankName) {
      currentRankName = rank.name;
      section         = document.createElement('div');
      section.className = 'rank-section';

      const hdr = document.createElement('div');
      hdr.className = 'rank-header';
      hdr.innerHTML =
        `<span class="rank-dot" style="background:${rank.color}"></span>${rank.name}`;
      section.appendChild(hdr);

      currentGrid = document.createElement('div');
      currentGrid.className = 'levels-grid';
      section.appendChild(currentGrid);
      container.appendChild(section);
    }

    // Stars
    const stars = score === undefined ? ''
      : score >= 90 ? '⭐⭐⭐' : score >= 70 ? '⭐⭐' : '⭐';

    // Card
    const card = document.createElement('div');
    card.className = [
      'level-card',
      !unlocked ? 'locked' : '',
      isCur     ? 'current' : '',
      done      ? 'done'    : '',
    ].join(' ').trim();

    const displayLetters = lv.letters.slice(0, 5).join(' ');

    card.innerHTML = `
      <div class="lc-num">LEVEL ${lv.num}</div>
      <div class="lc-letters">${unlocked ? displayLetters : '?'}</div>
      ${lv.newLetter && unlocked ? `<div class="lc-new-badge">+${lv.newLetter}</div>` : '<div style="min-height:20px"></div>'}
      <div class="lc-stars">${unlocked ? (stars || '○○○') : ''}</div>
      ${!unlocked ? '<div class="lc-lock">🔒</div>' : ''}
      ${unlocked && lv.streamOk && done ? `
        <div class="lc-stream-btn" id="stream-btn-${lv.num}">⚡ STREAM${streamScore ? ' ' + streamScore + '%' : ''}</div>
      ` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', e => {
        // Don't trigger level start if stream button clicked
        if (e.target.classList.contains('lc-stream-btn')) return;
        if (lv.num > AppState.currentLevel) {
          AppState.currentLevel = lv.num;
          saveState();
        }
        startLevel(lv.num);
      });
    }
    currentGrid.appendChild(card);
  });

  // Wire up stream buttons after render
  LEVELS.forEach(lv => {
    const sb = document.getElementById('stream-btn-' + lv.num);
    if (sb) sb.addEventListener('click', e => {
      e.stopPropagation();
      startStream(lv.num, false);
    });
  });
}

/* ─── PROFILE ──────────────────────────────── */
function renderProfile() {
  const name = AppState.agentName || 'Agent X';
  const rank = getRankForLevel(AppState.currentLevel);

  document.getElementById('p-name').textContent    = name;
  document.getElementById('p-level').textContent   = AppState.currentLevel;
  document.getElementById('p-sessions').textContent= AppState.totalSessions;
  document.getElementById('p-streak').textContent  = AppState.streak;

  const rankEl = document.getElementById('p-rank-tag');
  rankEl.textContent = rank.name;
  rankEl.style.background = rank.color + '22';
  rankEl.style.color      = rank.color;
  rankEl.style.border     = '1px solid ' + rank.color + '55';

  // Collection grid
  const grid    = document.getElementById('p-collection');
  grid.innerHTML = '';
  const known   = new Set(KOCH_SEQUENCE.slice(0, Math.min(AppState.currentLevel + 1, KOCH_SEQUENCE.length)));

  KOCH_SEQUENCE.forEach(letter => {
    const el = document.createElement('div');
    el.className = 'col-letter' + (known.has(letter) ? ' mastered' : '');
    el.innerHTML = `${letter}<div class="col-morse">${(MORSE_TABLE[letter]||'').replace(/\./g,'·').replace(/-/g,'—')}</div>`;
    grid.appendChild(el);
  });
}

function resetProgress() {
  if (!confirm('Alle voortgang wissen en opnieuw beginnen?')) return;
  const name = AppState.agentName;
  AppState = defaultState();
  AppState.agentName   = name;
  AppState.onboardDone = true;
  saveState();
  renderProfile();
  updateHomeStats();
  showToast('Voortgang gewist. Nieuw begin! 💪');
}

/* ─── STAR FIELD ──────────────────────────── */
function createStars() {
  const sf = document.getElementById('starfield');
  for (let i = 0; i < 90; i++) {
    const s    = document.createElement('div');
    s.className = 'star';
    const sz   = Math.random() * 2.2 + 0.4;
    s.style.cssText = `
      left:${(Math.random()*100).toFixed(1)}%;
      top:${(Math.random()*100).toFixed(1)}%;
      width:${sz}px; height:${sz}px;
      --d:${(Math.random()*3.5+2).toFixed(1)}s;
      --delay:${(Math.random()*5).toFixed(1)}s;
      --o1:${(Math.random()*0.25+0.05).toFixed(2)};
      --o2:${(Math.random()*0.55+0.45).toFixed(2)};
    `;
    sf.appendChild(s);
  }
}

/* ─── TOAST ───────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ─── FEEDBACK OVERLAY ─────────────────────── */
function showFeedback(emoji) {
  const o = document.getElementById('feedback-overlay');
  const b = document.getElementById('feedback-burst');
  b.textContent = emoji;
  o.classList.add('show');
  setTimeout(() => o.classList.remove('show'), 550);
}

/* ─── CONFETTI ─────────────────────────────── */
function launchConfetti() {
  const colors = ['#ffe44f','#00dfc4','#ff7c2a','#9066f8','#ff4466','#2de88a','#ffffff'];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${(Math.random()*100).toFixed(1)}vw;
      top:${-12}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      transform:rotate(${Math.floor(Math.random()*360)}deg);
      animation-delay:${(Math.random()*0.45).toFixed(2)}s;
      animation-duration:${(Math.random()*0.7+0.9).toFixed(2)}s;
      border-radius:${Math.random() < 0.4 ? '50%' : '2px'};
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }
}

/* ─── INIT ────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  createStars();
  MorseAudio.resumeOnInteraction();

  if (!AppState.onboardDone) {
    showScreen('screen-onboard');
  } else {
    showScreen('screen-home');
    if (AppState.agentName) {
      showToast('Welkom terug, ' + AppState.agentName + '! 🕵️');
    }
  }
});
