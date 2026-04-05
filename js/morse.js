/* ═══════════════════════════════════════════════
   DOT & DASH v3  |  js/morse.js
═══════════════════════════════════════════════ */
'use strict';

/* ─── MORSE TABLE ─────────────────────────────── */
const MORSE_TABLE = {
  A:'.-',   B:'-...', C:'-.-.',  D:'-..', E:'.',
  F:'..-.', G:'--.',  H:'....',  I:'..',  J:'.---',
  K:'-.-',  L:'.-..', M:'--',    N:'-.',  O:'---',
  P:'.--.', Q:'--.-', R:'.-.',   S:'...', T:'-',
  U:'..-',  V:'...-', W:'.--',   X:'-..-',Y:'-.--',
  Z:'--..',
  '1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.','0':'-----',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', '!':'-.-.--',
  '/':'-..-.', '(':'-.--.',  ')':'-.--.-',
};

function morseToDisplay(s) {
  return (s||'').split('').map(c=>c==='.'?'·':'—').join(' ');
}
function letterToMorseDisplay(l) { return morseToDisplay(MORSE_TABLE[l]||''); }

/* ─── MNEMONICS ───────────────────────────────── */
const MNEMONICS = {
  K:'Koffie: DAH·di·DAH',  M:'Mama: DAH·DAH',
  U:'U-boot: di·di·DAH',   R:'Radio: di·DAH·di',
  E:'Eén tikje: di',        S:'SOS: di·di·di',
  N:'Nee: DAH·di',          A:'Alfa: di·DAH',
  P:'Papa: di·DAH·DAH·di', T:'Tik: DAH',
  L:'Lima: di·DAH·di·di',   W:'Whisky: di·DAH·DAH',
  I:'Insect: di·di',        J:'Juliet: di·DAH·DAH·DAH',
  Z:'Zebra: DAH·DAH·di·di', F:'Foxtrot: di·di·DAH·di',
  O:'Ooo: DAH·DAH·DAH',    Y:'Yankee: DAH·di·DAH·DAH',
  G:'Golf: DAH·DAH·di',    Q:'Quebec: DAH·DAH·di·DAH',
  V:'Victor: di·di·di·DAH', C:'Charlie: DAH·di·DAH·di',
  H:'Hotel: di·di·di·di',  B:'Bravo: DAH·di·di·di',
  D:'Delta: DAH·di·di',    X:'X-ray: DAH·di·di·DAH',
  '1':'1 = .----', '2':'2 = ..---', '3':'3 = ...--',
  '4':'4 = ....-', '5':'5 = .....', '6':'6 = -....',
  '7':'7 = --...', '8':'8 = ---..', '9':'9 = ----.',
  '0':'0 = -----',
};

/* ─── FUN MESSAGES ────────────────────────────── */
const CORRECT_MSGS = [
  '🌟 Briljant!','✨ Perfect!','🔥 On fire!','💥 Kapow!','⚡ Raak!',
  '🎯 Bullseye!','🚀 Super!','💎 Geniaal!','🏆 Top agent!','👊 Boom!',
];
const WRONG_MSGS = [
  '💪 Bijna!','🤔 Nog eens...','😅 Oeps!','🎯 Mis — probeer!','💫 Dichtbij!',
];
const STREAK_MSGS = [3,'🔥 3 op rij!', 5,'⚡ 5 op rij! Agent!', 8,'🌟 8 op rij!! ELITE!'];

function randomMsg(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

/* ─── KOCH SEQUENCE ───────────────────────────── */
const KOCH_SEQUENCE = [
  'K','M','U','R','E','S','N','A','P','T',
  'L','W','I','J','Z','F','O','Y','G','Q',
  'V','C','H','B','D','X',
];

const NUMBER_SEQUENCE = ['1','2','3','4','5','6','7','8','9','0'];

/* ─── Q-CODES ─────────────────────────────────── */
const Q_CODES = [
  { code:'QRZ', meaning:'Wie roept mij?',   letters:['Q','R','Z'] },
  { code:'QTH', meaning:'Mijn locatie is…', letters:['Q','T','H'] },
  { code:'QSL', meaning:'Ik bevestig!',      letters:['Q','S','L'] },
  { code:'QRM', meaning:'Storing op freq.', letters:['Q','R','M'] },
  { code:'QRP', meaning:'Minder vermogen',  letters:['Q','R','P'] },
];

/* ─── RANKS ───────────────────────────────────── */
const RANKS = [
  { name:'Rookie Agent',      color:'#00dfc4', emoji:'🔵', maxStep:4  },
  { name:'Field Operative',   color:'#9066f8', emoji:'🟣', maxStep:9  },
  { name:'Special Agent',     color:'#ff7c2a', emoji:'🟠', maxStep:16 },
  { name:'Secret Operative',  color:'#ffe44f', emoji:'🟡', maxStep:21 },
  { name:'Elite Spy',         color:'#ff4466', emoji:'🔴', maxStep:26 },
  { name:'Master Cryptologist',color:'#2de88a',emoji:'🟢', maxStep:99 },
];

function getRankForStep(step) {
  return RANKS.find(r => step < r.maxStep) || RANKS[RANKS.length-1];
}
function getRankForLevel(levelNum) {
  // approximate: ~3 levels per step
  return getRankForStep(Math.floor((levelNum-1)/3));
}

/* ─── LEVEL BUILDER ───────────────────────────── */
/*
  Structure per Koch step:
  Step 0 (K): INTRO (2-choice, K only) + EASY (K vs M)  = 2 levels
  Step 1 (M): INTRO (M intro) + EASY + MIX              = 3 levels
  Step 2+ :   INTRO + FOCUS + PRACTICE + (MASTER from step 4+) = 3-4 levels
  Numbers:    INTRO group + PRACTICE = 2 levels per group
  Q-codes:    1 level per Q-code
*/
function buildLevels() {
  const levels = [];

  function push(obj) {
    obj.num = levels.length + 1;
    levels.push(obj);
  }

  // ── ALPHABET ────────────────────────────────────
  KOCH_SEQUENCE.forEach((letter, stepIdx) => {
    // Letters known AFTER this step (min 2 always for choice variety)
    const knownSoFar = KOCH_SEQUENCE.slice(0, stepIdx + 1);
    const knownMin2  = knownSoFar.length >= 2
      ? knownSoFar
      : KOCH_SEQUENCE.slice(0, 2);
    const rank = getRankForStep(stepIdx);

    // A) INTRO — learn the letter, quick 5Q quiz (80% focus)
    push({
      type: 'intro',
      group: 'alphabet',
      letters: knownMin2,
      focusLetter: letter,
      newLetter: letter,
      introLetters: stepIdx === 0 ? ['K','M'] : [letter],
      questionsCount: 5,
      focusWeight: 0.82,
      minScore: 50,       // low bar — this is just learning
      streamOk: false,
      sendOk: false,
      rank,
      name: stepIdx === 0 ? 'Missie Start: K & M' : `Nieuwe letter: ${letter}`,
      desc: MNEMONICS[letter] || letter,
    });

    // B) FOCUS — still heavy on new letter (8Q, 60% focus)
    push({
      type: 'focus',
      group: 'alphabet',
      letters: knownMin2,
      focusLetter: letter,
      newLetter: null,
      introLetters: null,
      questionsCount: 8,
      focusWeight: 0.62,
      minScore: 65,
      streamOk: false,
      sendOk: false,
      rank,
      name: stepIdx === 0 ? 'K & M oefening' : `${letter} — Blijven oefenen`,
      desc: `${knownMin2.length} letters in totaal`,
    });

    // C) PRACTICE — balanced (10Q, 40% focus) — from step 1+
    if (stepIdx >= 1) {
      push({
        type: 'practice',
        group: 'alphabet',
        letters: knownMin2,
        focusLetter: letter,
        newLetter: null,
        introLetters: null,
        questionsCount: 10,
        focusWeight: 0.40,
        minScore: 70,
        streamOk: stepIdx >= 3,
        sendOk: stepIdx >= 4,
        rank,
        name: `Mix tot ${letter}`,
        desc: `${knownMin2.length} letters door elkaar`,
      });
    }

    // D) MASTER — real mix, all letters fairly (10Q, 25% focus) — from step 4+
    if (stepIdx >= 4) {
      push({
        type: 'master',
        group: 'alphabet',
        letters: knownMin2,
        focusLetter: letter,
        newLetter: null,
        introLetters: null,
        questionsCount: 10,
        focusWeight: 0.25,
        minScore: 75,
        streamOk: true,
        sendOk: true,
        rank,
        name: `Meester-oefening ${letter}`,
        desc: `Pure mix — alle ${knownMin2.length} letters!`,
      });
    }
  });

  // ── NUMBERS ─────────────────────────────────────
  const numGroups = [
    { digits:['1','2','3','4','5'], name:'Cijfers 1-5' },
    { digits:['6','7','8','9','0'], name:'Cijfers 6-0' },
  ];
  const allLetters = [...KOCH_SEQUENCE];

  numGroups.forEach((grp, gi) => {
    const allNums = numGroups.slice(0, gi+1).flatMap(g=>g.digits);
    const pool = [...allLetters, ...allNums];
    const rank = RANKS[5];

    push({
      type: 'intro',
      group: 'numbers',
      letters: grp.digits,
      focusLetter: grp.digits[0],
      newLetter: grp.digits[0],
      introLetters: grp.digits,
      questionsCount: 8,
      focusWeight: 0.5,
      minScore: 55,
      streamOk: false, sendOk: false,
      rank, name: `Leer: ${grp.name}`, desc:'Morse heeft ook cijfers!',
    });

    push({
      type: 'practice',
      group: 'numbers',
      letters: allNums,
      focusLetter: grp.digits[0],
      newLetter: null, introLetters: null,
      questionsCount: 10,
      focusWeight: 0.35,
      minScore: 70,
      streamOk: true, sendOk: true,
      rank, name: `${grp.name} — oefening`, desc:'Cijfers door elkaar',
    });
  });

  // Mixed numbers + letters
  push({
    type: 'master',
    group: 'numbers',
    letters: [...KOCH_SEQUENCE.slice(0,10), ...NUMBER_SEQUENCE],
    focusLetter: '5',
    newLetter: null, introLetters: null,
    questionsCount: 12,
    focusWeight: 0.20,
    minScore: 72,
    streamOk: true, sendOk: true,
    rank: RANKS[5],
    name: 'Letters + Cijfers Mix',
    desc: 'De ultieme uitdaging!',
  });

  // ── Q-CODES ──────────────────────────────────────
  Q_CODES.forEach(qc => {
    push({
      type: 'qcode',
      group: 'bonus',
      letters: KOCH_SEQUENCE,
      focusLetter: qc.code[0],
      newLetter: null, introLetters: null,
      questionsCount: 8,
      focusWeight: 0.35,
      minScore: 65,
      streamOk: true, sendOk: false,
      rank: RANKS[5],
      name: `Q-code: ${qc.code}`,
      desc: qc.meaning,
      qcode: qc,
    });
  });

  return levels;
}

const LEVELS = buildLevels();

/* ─── TIMING ─────────────────────────────────── */
function getLevelWpm(levelNum) {
  const charWpm = 20;
  const effWpm  = Math.min(7 + (levelNum - 1) * 0.35, charWpm);
  return { charWpm, effWpm };
}

function calcTiming(charWpm, effWpm) {
  const dotDur  = 1.2 / charWpm;
  const dashDur = 3 * dotDur;
  const elemGap = dotDur;
  const charGap = Math.max((60/effWpm/5) - 4*(1.2/charWpm), 3*dotDur);
  const wordGap = charGap * 7 / 3;
  return { dotDur, dashDur, elemGap, charGap, wordGap };
}

/* ─── SPEED RECORD HELPERS ────────────────────── */
function formatMs(ms) {
  if (!ms || ms > 9999) return '—';
  return (ms/1000).toFixed(1)+'s';
}
