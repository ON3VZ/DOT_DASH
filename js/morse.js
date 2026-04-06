/* ═══════════════════════════════════════════════
   DOT & DASH v4  |  js/morse.js
═══════════════════════════════════════════════ */
'use strict';

const MORSE_TABLE={
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
  K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
  U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.','0':'-----',
  '.':'.-.-.-',',':'--..--','?':'..--..',
};
function morseToDisplay(s){return(s||'').split('').map(c=>c==='.'?'·':'—').join(' ');}
function letterToMorseDisplay(l){return morseToDisplay(MORSE_TABLE[l]||'');}

/* ─── MNEMONICS ─────────────────────────────── */
const MNEMONIC_DATA={
  K:{word:'Koffie',    syllables:['KOF','fi','e'],      hint:'Lang-kort-lang: KOF·fi·e'},
  M:{word:'Mama',      syllables:['MA','ma'],            hint:'Twee lange klanken: MA·ma'},
  U:{word:'U-boot',    syllables:['u','boot','UIT'],     hint:'Kort-kort-lang: u·boot·UIT'},
  R:{word:'Radio',     syllables:['ra','DI','o'],        hint:'Kort-lang-kort: ra·DI·o'},
  E:{word:'Eén',       syllables:['E'],                  hint:'Eén enkel tikje!'},
  S:{word:'Sinaas',    syllables:['si','na','as'],       hint:'Drie korte: si·na·as'},
  N:{word:'Negen',     syllables:['NEE','gen'],          hint:'Lang-kort: NEE·gen'},
  A:{word:'A-ha!',     syllables:['a','HA'],             hint:'Kort-lang: a·HA!'},
  P:{word:'Papaver',   syllables:['pa','PA','pa','ver'], hint:'Kort-lang-lang-kort'},
  T:{word:'Tik',       syllables:['TIK'],                hint:'Eén lange tik'},
  L:{word:'Lellebel',  syllables:['le','LLE','le','bel'],hint:'Kort-lang-kort-kort'},
  W:{word:'Wow!',      syllables:['wow','WOW','WOW'],    hint:'Kort-lang-lang'},
  I:{word:'Tiktak',    syllables:['tik','tak'],          hint:'Twee korte tikjes'},
  J:{word:'Jaja!',     syllables:['ja','JA','JA','JA'], hint:'Kort-lang-lang-lang!'},
  Z:{word:'Zeezout',   syllables:['ZEE','ZOUT','ze','ut'],hint:'Lang-lang-kort-kort'},
  F:{word:'Fietsbel',  syllables:['fie','ts','BEL','el'],hint:'Kort-kort-lang-kort'},
  O:{word:'Ooooh!',    syllables:['OOO','OOO','OOH'],   hint:'Drie lange klanken!'},
  Y:{word:'Yippee!',   syllables:['YIP','i','PEE','ee'],hint:'Lang-kort-lang-lang'},
  G:{word:'Goeiedag',  syllables:['GOE','IE','dag'],     hint:'Lang-lang-kort'},
  Q:{word:'Quebec',    syllables:['QUE','BEC','be','c'], hint:'Lang-lang-kort-lang'},
  V:{word:'Victory!',  syllables:['vic','to','ri','RY'], hint:'Kort-kort-kort-lang (Beethoven!)'},
  C:{word:'Chocola',   syllables:['CHOC','o','LA','da'], hint:'Lang-kort-lang-kort'},
  H:{word:'Hahaha',    syllables:['ha','ha','ha','ha'],  hint:'Vier korte tikjes'},
  B:{word:'Batman',    syllables:['BAT','man','n','n'],  hint:'Lang-kort-kort-kort'},
  D:{word:'Dakpan',    syllables:['DAK','pan','n'],      hint:'Lang-kort-kort'},
  X:{word:'X-factor',  syllables:['X','fac','tor','X'], hint:'Lang-kort-kort-lang'},
};
const MNEMONICS={};
Object.entries(MNEMONIC_DATA).forEach(([l,d])=>{MNEMONICS[l]=d.word+' — '+d.hint;});

const CORRECT_MSGS=['🌟 Briljant!','✨ Perfect!','🔥 On fire!','💥 Kapow!','⚡ Raak!',
  '🎯 Bullseye!','🚀 Super!','💎 Geniaal!','🏆 Top agent!','👊 Boom!','😎 Slimme agent!'];
const WRONG_MSGS=['💪 Bijna!','🤔 Nog eens…','😅 Oeps!','🎯 Mis — probeer!','💫 Dichtbij!'];
function randomMsg(arr){return arr[Math.floor(Math.random()*arr.length)];}

/* ─── KOCH SEQUENCE ──────────────────────────── */
const KOCH_SEQUENCE=[
  'K','M','U','R','E','S','N','A','P','T',
  'L','W','I','J','Z','F','O','Y','G','Q',
  'V','C','H','B','D','X',
];
const NUMBER_SEQUENCE=['1','2','3','4','5','6','7','8','9','0'];

/* ─── RANKS ──────────────────────────────────── */
const RANKS=[
  {name:'Rookie Agent',       color:'#00dfc4',emoji:'🔵',maxStep:4 },
  {name:'Field Operative',    color:'#9066f8',emoji:'🟣',maxStep:9 },
  {name:'Special Agent',      color:'#ff7c2a',emoji:'🟠',maxStep:16},
  {name:'Secret Operative',   color:'#ffe44f',emoji:'🟡',maxStep:21},
  {name:'Elite Spy',          color:'#ff4466',emoji:'🔴',maxStep:26},
  {name:'Master Cryptologist',color:'#2de88a',emoji:'🟢',maxStep:99},
];
function getRankForStep(s){return RANKS.find(r=>s<r.maxStep)||RANKS[RANKS.length-1];}
function getRankForLevel(n){return getRankForStep(Math.floor((n-1)/3.5));}

/* ─── LEVEL BUILDER ──────────────────────────── */
function buildLevels(){
  const levels=[];
  function push(obj){obj.num=levels.length+1;levels.push(obj);}

  KOCH_SEQUENCE.forEach((letter,stepIdx)=>{
    const knownMin2=KOCH_SEQUENCE.slice(0,Math.max(stepIdx+1,2));
    const rank=getRankForStep(stepIdx);

    // A) INTRO — leer de letter + korte quiz
    push({type:'intro',group:'alphabet',letters:knownMin2,
      focusLetter:letter,newLetter:letter,
      introLetters:stepIdx===0?['K','M']:[letter],
      questionsCount:6,focusWeight:0.82,minScore:50,
      reeksOk:false,streamOk:false,rank,
      name:stepIdx===0?'Missie Start: K & M':`Nieuwe letter: ${letter}`,
    });

    // B) FOCUS — nieuw letter verankeren, 12 vragen
    push({type:'focus',group:'alphabet',letters:knownMin2,
      focusLetter:letter,newLetter:null,introLetters:null,
      questionsCount:12,focusWeight:0.65,minScore:65,
      reeksOk:false,streamOk:false,rank,
      name:stepIdx===0?'K & M — dieper oefenen':`${letter} — verankeren`,
    });

    // C) PRACTICE — eerlijke mix van alle gekende letters, 16 vragen
    if(stepIdx>=1){
      push({type:'practice',group:'alphabet',letters:knownMin2,
        focusLetter:letter,newLetter:null,introLetters:null,
        questionsCount:16,focusWeight:0.35,minScore:70,
        reeksOk:stepIdx>=4,streamOk:stepIdx>=3,rank,
        name:`Mix — alle ${knownMin2.length} letters`,
      });
    }

    // D) MASTER — brede herhaling, elke letter ≥1×, schaalbaar
    if(stepIdx>=4){
      const masterQ=Math.max(18,Math.min(knownMin2.length+12,32));
      push({type:'master',group:'alphabet',letters:knownMin2,
        focusLetter:letter,newLetter:null,introLetters:null,
        questionsCount:masterQ,focusWeight:0.20,minScore:75,
        reeksOk:true,streamOk:true,rank,
        name:`Meester — alle ${knownMin2.length} letters!`,
      });
    }

    // E) REEKS — 2 letters achter elkaar horen & allebei aanduiden
    if(stepIdx>=5){
      push({type:'reeks',group:'alphabet',letters:knownMin2,
        focusLetter:letter,newLetter:null,introLetters:null,
        questionsCount:10,focusWeight:0.30,minScore:70,
        reeksOk:true,streamOk:false,rank,
        name:`Reeks luisteren — ${knownMin2.length} letters`,
      });
    }
  });

  // CIJFERS
  [{digits:['1','2','3','4','5'],name:'Cijfers 1-5'},
   {digits:['6','7','8','9','0'],name:'Cijfers 6-0'}].forEach((grp,gi)=>{
    const allNums=[...Array(gi+1)].flatMap((_,i)=>
      [{digits:['1','2','3','4','5']},{digits:['6','7','8','9','0']}][i].digits);
    push({type:'intro',group:'numbers',letters:grp.digits,
      focusLetter:grp.digits[0],newLetter:grp.digits[0],introLetters:grp.digits,
      questionsCount:8,focusWeight:0.5,minScore:55,reeksOk:false,streamOk:false,
      rank:RANKS[5],name:`Leer: ${grp.name}`});
    push({type:'practice',group:'numbers',letters:allNums,
      focusLetter:grp.digits[0],newLetter:null,introLetters:null,
      questionsCount:16,focusWeight:0.28,minScore:70,reeksOk:true,streamOk:true,
      rank:RANKS[5],name:`${grp.name} — oefening`});
  });
  push({type:'master',group:'numbers',
    letters:[...KOCH_SEQUENCE.slice(0,12),...NUMBER_SEQUENCE],
    focusLetter:'5',newLetter:null,introLetters:null,
    questionsCount:22,focusWeight:0.12,minScore:72,reeksOk:true,streamOk:true,
    rank:RANKS[5],name:'Letters + Cijfers megamix'});

  // Q-CODES
  [{code:'QRZ',meaning:'Wie roept mij?'},{code:'QTH',meaning:'Mijn locatie…'},
   {code:'QSL',meaning:'Ik bevestig!'},{code:'QRM',meaning:'Storing'},{code:'QRP',meaning:'Minder vermogen'}
  ].forEach(qc=>{
    push({type:'qcode',group:'bonus',letters:KOCH_SEQUENCE,
      focusLetter:qc.code[0],newLetter:null,introLetters:null,
      questionsCount:10,focusWeight:0.28,minScore:65,reeksOk:true,streamOk:true,
      rank:RANKS[5],name:`Q-code: ${qc.code}`,desc:qc.meaning,qcode:qc});
  });

  return levels;
}
const LEVELS=buildLevels();

/* ─── TIMING ─────────────────────────────────── */
function getLevelWpm(levelNum){
  return{charWpm:20,effWpm:Math.min(7+(levelNum-1)*0.30,20)};
}
function calcTiming(charWpm,effWpm){
  const dotDur=1.2/charWpm,dashDur=3*dotDur,elemGap=dotDur;
  const charGap=Math.max((60/effWpm/5)-4*(1.2/charWpm),3*dotDur);
  return{dotDur,dashDur,elemGap,charGap,wordGap:charGap*7/3};
}
function formatMs(ms){if(!ms||ms>9999)return'—';return(ms/1000).toFixed(1)+'s';}

/* ═══════════════════════════════════════════════
   GEHEIME BRIEFING — Nederlandse woordenlijst
═══════════════════════════════════════════════ */
const BRIEFING_WORDS=[
  // 3L — unlock bij K,M,U,R,E,S (stap 5)
  'ARM','KUS','MES','MUS','REM','RUM','RUS','KAM','RAM','SER',
  // 4L — stap 6+ (met N)
  'KERN','KERS','KEUR','KRUK','MARS','MEER','MERK','MUSK','NEUS',
  'REUS','RAMP','RAAM','MAAN','MAST','NAAM','SNEL','SLAK','UREN',
  // 4L — stap 7+ (met A)
  'KAMP','KANT','KNAL','RANK','TANK','RAKEN','RAMEN','SAMEN',
  // 4L — stap 9+ (met T)
  'STAM','TRAM','TRAP','STEM','NEST','REST','TEST','WEST',
  'BEST','GAST','LAST','PAST','VAST','MALT','WARM','WERK','WENS',
  // 5L — stap 10+
  'ANKER','KAMER','KRANT','KRAAN','MUREN','NAMEN','PLANT','SNAAR',
  'STAMP','STRAK','TREIN','WAPEN','LAKEN','PLANK','KRANS','TRAAN',
  'TALEN','MALEN','PAREN','STALEN','BANKEN',
  // 6L — stap 12+
  'STAKEN','WERKEN','KANSEN','WARMEN','PLANTEN','KRANEN',
  'STAMPEN','LANSEN','DANKEN','TANKEN',
];

const MIN_BRIEFING_WORDS=6;

function getKnownLetterSet(){
  if(!Profile)return new Set();
  return new Set(KOCH_SEQUENCE.slice(0,Math.min((Profile.currentLevel||1)+1,KOCH_SEQUENCE.length)));
}
function getAvailableBriefingWords(knownSet){
  const seen=new Set();
  return BRIEFING_WORDS.filter(w=>{
    if(seen.has(w))return false; seen.add(w);
    return w.length>=3&&w.split('').every(l=>knownSet.has(l));
  });
}
function canPlayBriefing(){
  return getAvailableBriefingWords(getKnownLetterSet()).length>=MIN_BRIEFING_WORDS;
}
function pickBriefingWords(count=5){
  const knownSet=getKnownLetterSet();
  const available=getAvailableBriefingWords(knownSet);
  if(!available.length)return[];
  const kc=knownSet.size;
  const pool=[];
  available.forEach(w=>{
    const r=w.length<=3?(kc<8?5:2):w.length===4?2:1;
    for(let i=0;i<r;i++)pool.push(w);
  });
  const picked=[],used=new Set();let tries=0;
  while(picked.length<count&&tries<400){
    const w=pool[Math.floor(Math.random()*pool.length)];
    if(!used.has(w)){picked.push(w);used.add(w);}
    tries++;
  }
  return picked;
}
