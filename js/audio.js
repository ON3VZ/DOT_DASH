/* ═══════════════════════════════════════════════
   DOT & DASH v3  |  js/audio.js
═══════════════════════════════════════════════ */
'use strict';

const MorseAudio = (() => {
  let ctx = null;
  const FREQ=587, RISE=0.005, VOL=0.70;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)();
    if (ctx.state==='suspended') ctx.resume();
    return ctx;
  }

  function playString(morseStr, charWpm, effWpm, onSym, onDone) {
    const ac = ensure();
    const t  = calcTiming(charWpm||20, effWpm||12);
    const osc=ac.createOscillator(), gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type='sine'; osc.frequency.value=FREQ; gain.gain.value=0; osc.start();
    let cursor=ac.currentTime+0.06, symIdx=0;
    const now=ac.currentTime;
    for(const sym of morseStr) {
      if(sym==='.'||sym==='-') {
        const dur=sym==='.'?t.dotDur:t.dashDur, s0=cursor;
        gain.gain.setTargetAtTime(VOL, s0, RISE);
        gain.gain.setTargetAtTime(0, s0+dur, RISE);
        if(onSym){const i=symIdx,d=Math.max(0,(s0-now)*1000);setTimeout(()=>onSym(i,sym),d);}
        symIdx++; cursor+=dur+t.elemGap;
      } else if(sym===' ') { cursor+=t.charGap-t.elemGap; }
      else if(sym==='/') { cursor+=t.wordGap; }
    }
    const totalMs=Math.max(0,(cursor-now)*1000)+120;
    osc.stop(cursor+0.15);
    if(onDone) setTimeout(onDone, totalMs);
    return {osc,gain,endAt:cursor};
  }

  function playLetter(letter, charWpm, effWpm, onSym, onDone) {
    return playString(MORSE_TABLE[letter]||'', charWpm, effWpm, onSym, onDone);
  }

  // Play a letter N times with a gap between repeats
  function playLetterRepeat(letter, times, charWpm, effWpm, onSym, onDone) {
    const ac = ensure();
    const t  = calcTiming(charWpm||20, effWpm||12);
    const morse = MORSE_TABLE[letter]||'';
    const osc=ac.createOscillator(), gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type='sine'; osc.frequency.value=FREQ; gain.gain.value=0; osc.start();
    let cursor=ac.currentTime+0.1, symIdx=0;
    const now=ac.currentTime;

    for(let rep=0; rep<times; rep++){
      for(const sym of morse){
        if(sym==='.'||sym==='-'){
          const dur=sym==='.'?t.dotDur:t.dashDur, s0=cursor;
          gain.gain.setTargetAtTime(VOL, s0, RISE);
          gain.gain.setTargetAtTime(0, s0+dur, RISE);
          if(onSym){const i=symIdx,d=Math.max(0,(s0-now)*1000);setTimeout(()=>onSym(i,sym,rep),d);}
          symIdx++; cursor+=dur+t.elemGap;
        } else if(sym===' '){cursor+=t.charGap-t.elemGap;}
      }
      if(rep<times-1) cursor+=t.wordGap*2; // pause between repeats
    }
    const totalMs=Math.max(0,(cursor-now)*1000)+150;
    osc.stop(cursor+0.2);
    if(onDone) setTimeout(onDone, totalMs);
    return {osc,gain};
  }

  function playSuccess() {
    const ac=ensure();
    [523.25,659.25,783.99].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='sine';o.frequency.value=f;
      const t0=ac.currentTime+i*0.085;
      g.gain.setTargetAtTime(0.30,t0,0.006); g.gain.setTargetAtTime(0,t0+0.18,0.025);
      o.start();o.stop(t0+0.4);
    });
  }

  function playFail() {
    const ac=ensure(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sawtooth';o.frequency.value=200;
    g.gain.setTargetAtTime(0.10,ac.currentTime,0.006);
    g.gain.setTargetAtTime(0,ac.currentTime+0.22,0.025);
    o.start();o.stop(ac.currentTime+0.4);
  }

  function playUnlock() {
    const ac=ensure();
    [392,523.25,659.25,783.99,1046.5].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='sine';o.frequency.value=f;
      const t0=ac.currentTime+i*0.09;
      g.gain.setTargetAtTime(0.26,t0,0.005); g.gain.setTargetAtTime(0,t0+0.22,0.03);
      o.start();o.stop(t0+0.45);
    });
  }

  function playLevelUp() {
    const ac=ensure();
    // Triumphant fanfare
    [[392,0],[523,0.1],[659,0.2],[784,0.3],[1047,0.4],[784,0.55],[1047,0.65]].forEach(([f,delay])=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.type='sine';o.frequency.value=f;
      const t0=ac.currentTime+delay;
      g.gain.setTargetAtTime(0.22,t0,0.005); g.gain.setTargetAtTime(0,t0+0.18,0.03);
      o.start();o.stop(t0+0.4);
    });
  }

  function playTick(correct) {
    const ac=ensure(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sine';
    o.frequency.value=correct?880:330;
    g.gain.setTargetAtTime(0.18,ac.currentTime,0.004);
    g.gain.setTargetAtTime(0,ac.currentTime+0.09,0.01);
    o.start();o.stop(ac.currentTime+0.18);
  }

  function startSidetone() {
    const ac=ensure(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sine';o.frequency.value=FREQ;
    g.gain.setTargetAtTime(0.36,ac.currentTime,0.006); o.start();
    return {osc:o,gain:g};
  }

  function stopSidetone(node) {
    if(!node) return;
    const ac=ensure();
    node.gain.setTargetAtTime(0,ac.currentTime,0.008);
    node.osc.stop(ac.currentTime+0.05);
  }

  function resumeOnInteraction() {
    document.addEventListener('pointerdown',()=>{
      if(ctx&&ctx.state==='suspended') ctx.resume();
    },{once:true});
  }

  return {ensure,playLetter,playLetterRepeat,playString,
          playSuccess,playFail,playUnlock,playLevelUp,playTick,
          startSidetone,stopSidetone,resumeOnInteraction};
})();
