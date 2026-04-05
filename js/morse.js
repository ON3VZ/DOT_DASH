/* ═══════════════════════════════════════════════
   DOT & DASH  |  js/morse.js
   Morse data, Koch sequence, level builder, timing
═══════════════════════════════════════════════ */
'use strict';

/* ─── MORSE TABLE ─────────────────────────── */
const MORSE_TABLE = {
  A:'.-',   B:'-...', C:'-.-.',  D:'-..', E:'.',
  F:'..-.', G:'--.',  H:'....',  I:'..',  J:'.---',
  K:'-.-',  L:'.-..', M:'--',    N:'-.',  O:'---',
  P:'.--.', Q:'--.-', R:'.-.',   S:'...', T:'-',
  U:'..-',  V:'...-', W:'.--',   X:'-..-',Y:'-.--',
  Z:'--..',
  '1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.','0':'-----',
};

/* ─── DISPLAY CONVERSION ─────────────────── */
function morseToDisplay(morseStr) {
  return (morseStr || '').split('').map(c => c === '.' ? '·' : '—').join(' ');
}
function letterToMorseDisplay(letter) {
  return morseToDisplay(MORSE_TABLE[letter] || '');
}

/* ─── KOCH SEQUENCE ──────────────────────── */
// Letters introduced in the Koch-recommended order.
// Each letter is maximally different (in sound) from the previous ones.
const KOCH_SEQUENCE = [
  'K','M','U','R','E',
  'S','N','A','P','T',
  'L','W','I','J','Z',
  'F','O','Y','G','Q',
  'V','C','H','B','D','X',
];

/* ─── RANK SYSTEM ─────────────────────────── */
const RANKS = [
  { name:'Rookie Agent',     color:'#00dfc4', maxLevel:5  },
  { name:'Field Operative',  color:'#9066f8', maxLevel:12 },
  { name:'Special Agent',    color:'#ff7c2a', maxLevel:20 },
  { name:'Secret Operative', color:'#ffe44f', maxLevel:26 },
];

function getRankForLevel(levelNum) {
  return RANKS.find(r => levelNum <= r.maxLevel) || RANKS[RANKS.length - 1];
}

/* ─── LEVEL BUILDER ──────────────────────── */
// Level N = player knows letters KOCH_SEQUENCE[0..N]  (cumulative)
// Focus letter = KOCH_SEQUENCE[N-1] (the newest addition)
// Stream mode unlocks at level 3+ (at least 3 letters known)
function buildLevels() {
  const levels = [];
  for (let i = 0; i < KOCH_SEQUENCE.length; i++) {
    const letters = KOCH_SEQUENCE.slice(0, i + 2); // at least 2 letters per level
    const safe = letters.slice(0, Math.min(letters.length, 26));
    levels.push({
      num:         i + 1,
      letters:     safe,
      focusLetter: KOCH_SEQUENCE[i],       // the letter being trained in this level
      newLetter:   i > 0 ? KOCH_SEQUENCE[i] : null, // letter first introduced here
      streamOk:    i >= 2,                 // stream available from level 3 (i=2)
    });
  }
  return levels;
}

const LEVELS = buildLevels();

/* ─── TIMING CALCULATOR ──────────────────── */
// Character speed is ALWAYS 20 WPM (Koch principle: never go slow).
// Farnsworth effective speed starts low (long gaps) and grows level by level.
// At max level, eff speed == char speed (no Farnsworth stretching).
function getLevelWpm(levelNum) {
  const charWpm = 20;
  const effWpm  = Math.min(8 + (levelNum - 1) * 0.48, charWpm);
  return { charWpm, effWpm };
}

// Returns all timing values in seconds for a given WPM pair.
function calcTiming(charWpm, effWpm) {
  const dotDur  = 1.2 / charWpm;          // PARIS standard
  const dashDur = 3 * dotDur;
  const elemGap = dotDur;                  // gap between dots/dashes in same char
  // Farnsworth: inter-character gap derived from effective (slower) WPM
  const charGap = Math.max(
    (60 / effWpm / 5) - 4 * (1.2 / charWpm),
    3 * dotDur
  );
  const wordGap = charGap * 7 / 3;        // word gap ≈ 7 units
  return { dotDur, dashDur, elemGap, charGap, wordGap };
}
