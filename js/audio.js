/* ═══════════════════════════════════════════════
   DOT & DASH  |  js/audio.js
   Web Audio API Morse Engine
   - Pre-scheduled (AudioContext.currentTime, not setTimeout)
   - 5ms edge shaping (no clicks)
   - Farnsworth timing
   - Sidetone for send mode
═══════════════════════════════════════════════ */
'use strict';

const MorseAudio = (() => {
  let ctx = null;
  const FREQ      = 587;   // D5 — warm, child-friendly, not harsh
  const RISE_TIME = 0.005; // 5ms rise/fall — eliminates key-clicks
  const VOLUME    = 0.72;

  /* ─── INIT ───────────────────────────────── */
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ─── CORE PLAYBACK ──────────────────────── */
  // Plays a raw morse string (dots and dashes) using pre-scheduled audio nodes.
  // onSymbolStart(index, symbol) fires ~when each symbol begins (via setTimeout
  // calibrated to the audio clock — visual sync without jitter).
  // onDone() fires after the full sequence plus a small buffer.
  function playString(morseStr, charWpm, effWpm, onSymbolStart, onDone) {
    const ac = ensure();
    const t  = calcTiming(charWpm || 20, effWpm || 12);

    // Single oscillator always running; GainNode is the "key".
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type            = 'sine';
    osc.frequency.value = FREQ;
    gain.gain.value     = 0;
    osc.start();

    let cursor    = ac.currentTime + 0.06; // small startup buffer
    let symIndex  = 0;
    const now     = ac.currentTime;

    for (let i = 0; i < morseStr.length; i++) {
      const sym = morseStr[i];

      if (sym === '.' || sym === '-') {
        const dur     = sym === '.' ? t.dotDur : t.dashDur;
        const symStart = cursor;

        // Key ON with smooth ramp
        gain.gain.setTargetAtTime(VOLUME, symStart,       RISE_TIME);
        // Key OFF with smooth ramp
        gain.gain.setTargetAtTime(0,      symStart + dur, RISE_TIME);

        // Notify UI at the right moment
        if (onSymbolStart) {
          const delay = Math.max(0, (symStart - now) * 1000);
          const idx   = symIndex;
          setTimeout(() => onSymbolStart(idx, sym), delay);
        }
        symIndex++;
        cursor += dur + t.elemGap;
      } else if (sym === ' ') {
        // Inter-character gap (Farnsworth)
        cursor += t.charGap - t.elemGap; // elemGap already added
      } else if (sym === '/') {
        cursor += t.wordGap;
      }
    }

    const totalMs = Math.max(0, (cursor - now) * 1000) + 120;
    osc.stop(cursor + 0.15);

    if (onDone) setTimeout(onDone, totalMs);

    return { osc, gain, stopAt: cursor };
  }

  /* ─── PUBLIC API ─────────────────────────── */

  // Play the morse for a single letter.
  function playLetter(letter, charWpm, effWpm, onSymbol, onDone) {
    const morse = MORSE_TABLE[letter] || '';
    return playString(morse, charWpm, effWpm, onSymbol, onDone);
  }

  // Play a sequence of letters (with Farnsworth inter-char gaps).
  // Letters separated by spaces in the string, e.g. "K M U".
  // onLetterDone(index, letter) fires after each letter's morse finishes.
  function playSequence(letters, charWpm, effWpm, onSymbol, onLetterDone, onAllDone) {
    const ac = ensure();
    const t  = calcTiming(charWpm || 20, effWpm || 12);

    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type            = 'sine';
    osc.frequency.value = FREQ;
    gain.gain.value     = 0;
    osc.start();

    let cursor   = ac.currentTime + 0.06;
    const now    = ac.currentTime;
    let globalSym = 0;

    letters.forEach((letter, letterIdx) => {
      const morse     = MORSE_TABLE[letter] || '';
      let letterStart = cursor;

      for (let i = 0; i < morse.length; i++) {
        const sym = morse[i];
        const dur = sym === '.' ? t.dotDur : t.dashDur;

        gain.gain.setTargetAtTime(VOLUME, cursor,       RISE_TIME);
        gain.gain.setTargetAtTime(0,      cursor + dur, RISE_TIME);

        if (onSymbol) {
          const delay  = Math.max(0, (cursor - now) * 1000);
          const symIdx = globalSym;
          setTimeout(() => onSymbol(symIdx, sym, letterIdx), delay);
        }
        globalSym++;
        cursor += dur + t.elemGap;
      }

      // After this letter's morse, trigger onLetterDone
      if (onLetterDone) {
        const endDelay = Math.max(0, (cursor - now) * 1000) + 20;
        const li = letterIdx;
        setTimeout(() => onLetterDone(li, letter), endDelay);
      }

      // Farnsworth gap between letters
      cursor += t.charGap;
    });

    const totalMs = Math.max(0, (cursor - now) * 1000) + 100;
    osc.stop(cursor + 0.15);

    if (onAllDone) setTimeout(onAllDone, totalMs);
    return { osc, gain };
  }

  /* ─── FEEDBACK TONES ──────────────────────── */
  function playSuccess() {
    const ac = ensure();
    // C major arpeggio: C5 - E5 - G5
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t0 = ac.currentTime + i * 0.085;
      g.gain.setTargetAtTime(0.32, t0, 0.006);
      g.gain.setTargetAtTime(0,    t0 + 0.18, 0.025);
      osc.start(); osc.stop(t0 + 0.4);
    });
  }

  function playFail() {
    const ac  = ensure();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sawtooth'; osc.frequency.value = 200;
    g.gain.setTargetAtTime(0.12, ac.currentTime, 0.006);
    g.gain.setTargetAtTime(0,    ac.currentTime + 0.22, 0.025);
    osc.start(); osc.stop(ac.currentTime + 0.4);
  }

  function playUnlock() {
    const ac = ensure();
    // Ascending 4-note fanfare
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t0 = ac.currentTime + i * 0.1;
      g.gain.setTargetAtTime(0.28, t0, 0.005);
      g.gain.setTargetAtTime(0,    t0 + 0.22, 0.03);
      osc.start(); osc.stop(t0 + 0.45);
    });
  }

  // Sidetone for send mode — plays while key is held, same character freq
  function startSidetone() {
    const ac  = ensure();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sine'; osc.frequency.value = FREQ;
    g.gain.setTargetAtTime(0.38, ac.currentTime, 0.006);
    osc.start();
    return { osc, gain: g };
  }

  function stopSidetone(node) {
    if (!node) return;
    const ac = ensure();
    node.gain.setTargetAtTime(0, ac.currentTime, 0.008);
    node.osc.stop(ac.currentTime + 0.05);
  }

  // Short click for stream mode answer confirmation
  function playTick(correct) {
    const ac  = ensure();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = correct ? 880 : 330;
    g.gain.setTargetAtTime(0.18, ac.currentTime, 0.004);
    g.gain.setTargetAtTime(0,    ac.currentTime + 0.09, 0.01);
    osc.start(); osc.stop(ac.currentTime + 0.18);
  }

  /* ─── RESUME ON INTERACTION ──────────────── */
  function resumeOnInteraction() {
    document.addEventListener('pointerdown', () => {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }, { once: true });
  }

  return {
    ensure,
    playLetter,
    playSequence,
    playSuccess,
    playFail,
    playUnlock,
    playTick,
    startSidetone,
    stopSidetone,
    resumeOnInteraction,
  };
})();
