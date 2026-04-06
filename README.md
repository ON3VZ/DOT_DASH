# DOT & DASH 🕵️
### *Leer de Taal van Spionnen*

> Een educatief morsecode-spel voor kinderen (7–15 jaar), gebouwd op de **Koch-methode**.
> Puur luisteren. Geen installatie. Geen server. Rechtstreeks op GitHub Pages.

**Live:** [https://ON3VZ.github.io/DOT_DASH/](https://ON3VZ.github.io/DOT_DASH/)

---

## Inhoudstafel

1. [Pedagogische aanpak](#1-pedagogische-aanpak)
2. [Speelmodi](#2-speelmodi)
3. [Levelstructuur — 130 levels](#3-levelstructuur--130-levels)
4. [Geheime Briefing](#4-geheime-briefing)
5. [Audio-engine](#5-audio-engine)
6. [Profielen & Voortgang](#6-profielen--voortgang)
7. [Technische structuur](#7-technische-structuur)
8. [Deployment op GitHub Pages](#8-deployment-op-github-pages)
9. [Valkuilen & Mitigaties](#9-valkuilen--mitigaties)
10. [Roadmap](#10-roadmap)

---

## 1. Pedagogische aanpak

### De Koch-methode

De Koch-methode (Ludwig Koch, 1936) is de wetenschappelijk bewezen beste manier om morsecode te leren. De twee centrale principes:

**Principe 1 — Altijd op volle snelheid**
De karaktersnelheid is altijd **20 WPM** (words per minute), ook voor absolute beginners. Het brein heeft geen keuze dan morse als *klankpatroon* te herkennen — tellen is onmogelijk op die snelheid. Dit voorkomt de meest gemaakte fout: leren op langzame snelheid en daarna vastlopen op een plafond.

**Principe 2 — Één letter per keer**
Beginners starten met slechts twee letters (K en M). Pas wanneer die volledig geautomatiseerd zijn, komt er een derde letter bij. Stap voor stap, nooit meer dan één nieuw teken per keer.

### Farnsworth-timing

Terwijl de tekens altijd 20 WPM klinken, worden de **pauzes** tussen letters geleidelijk verkort naarmate de leerder vordert:

| Level | Karakter-snelheid | Effectieve snelheid | Pauzeverhouding |
|-------|-------------------|---------------------|-----------------|
| 1     | 20 WPM            | 7,0 WPM             | Grote pauzes    |
| 20    | 20 WPM            | 12,7 WPM            | Middelgrote pauzes |
| 70    | 20 WPM            | 20,0 WPM            | Geen extra pauze |

Dit geeft beginners de tijd om na te denken zonder het verkeerde ritme aan te leren.

### Klankgeheugen — het geheim achter de leerfase

Elke nieuw te leren letter heeft een **mnemonisch geheugenwoord** waarvan het ritme exact overeenkomt met de morse:

| Letter | Morse | Geheugenwoord | Uitleg |
|--------|-------|---------------|--------|
| K | `— · —` | **KOF**·fi·e | Lang-kort-lang |
| M | `— —` | **MA**·ma | Lang-lang |
| U | `. . —` | u·boot·**UIT** | Kort-kort-lang |
| R | `. — .` | ra·**DI**·o | Kort-lang-kort |
| E | `.` | **Eén** | Eén tikje |
| S | `. . .` | si·na·as | Drie korte |

Tijdens de leer-fase **pulsen de lettergrepen visueel mee** met de morse: grote oranje blokken voor DAH, kleine teal-blokken voor DI. Het kind ziet én hoort tegelijk hoe het ritme van het woord de morse IS.

De instructie "🔊 Zeg het hardop mee!" is essentieel: door actief mee te spreken wordt het klankpatroon via meerdere kanalen tegelijk verankerd (auditief + motorisch + visueel).

### Vraagverdeling per leveltype

Elk leveltype heeft een bewust gekozen verhouding van herhaling versus nieuwheid:

| Type | Focus op nieuwe letter | Overige letters | Garantie |
|------|------------------------|-----------------|---------|
| 🎓 Intro | 82% | 18% | — |
| 🎯 Focus | 65% | 35% | — |
| 🏋️ Practice | 35% | 65% | — |
| 👑 Master | 20% | 80% | **Elke letter ≥1×** |

In MASTER-levels zorgt een expliciete buffer ervoor dat elke bekende letter minstens één keer in de vragenreeks verschijnt — ook K en M die al maanden geleden geleerd werden. Zo vergeten kinderen vroeg aangeleerde letters nooit.

---

## 2. Speelmodi

### 🎓 LEER — de introductie
*Beschikbaar: elk intro-level bij een nieuwe letter*

Voordat er één vraag gesteld wordt, speelt de nieuwe letter automatisch **3× af** met volledige klanksynchronisatie. De leerder ziet en hoort:
- De letter groot in beeld
- De morse-symbolen die meelichten
- De lettergrepen van het geheugenwoord die pulsen
- Een teksthint over het ritme

Na 3 luisterbeurten verschijnt de knop "Ik ken hem! Start oefening →". Er is geen druk — de leerder kiest zelf wanneer hij klaar is.

---

### 👂 LUISTER & KIES — de kernoefening
*Beschikbaar: alle decode/practice/master levels*

1. Morse speelt automatisch af
2. De morse-symbolen lichten mee (visuele sync)
3. Na afloop verschijnt een mnemonic-hint: *"💡 Denk aan: Koffie"* (alleen bij de eerste 14 levels)
4. 4 keuze-knoppen verschijnen — elke knop toont de letter én de morse eronder
5. Klik de juiste letter

**Keuze-architectuur:** de 3 distractors komen altijd uit de bekende letterenpool. Er verschijnen nooit onbekende letters als keuzeoptie.

---

### 👂👂 REEKS — twee letters achter elkaar
*Beschikbaar: vanaf stap 6 (8 letters bekend), 21 levels*

De brug tussen "één letter herkennen" en "echt kopiëren":

1. Twee letters spelen **automatisch achter elkaar** af met Farnsworth-pauze ertussen
2. Twee lege vakjes tonen de positie van elke letter
3. Na het afspelen: kies letter 1
4. Daarna: kies letter 2
5. Beide correct = volledig goed, ongeacht individuele fouten

Dit traint het **werkgeheugen**: het brein moet de eerste letter vasthouden terwijl de tweede al begint. Dit is de cruciale vaardigheid voor echte CW-ontvangst.

---

### ⚡ STREAM — real-time kopiëren
*Beschikbaar: van practice levels af, 5 letters per ronde*

De Stream-modus simuleert echt CW-ontvangen:
- 5 letters spelen automatisch af, één voor één
- Na elke letter: **2,2 seconden** om de juiste keuze te tikken
- Een kleurbar tikt af (groen → rood bij urgentie)
- Geen pauze-knop, geen herkansen — net als echte morse

---

### 🔐 GEHEIME BRIEFING — Nederlandse woorden
*Zie sectie 4 voor volledige beschrijving*

---

## 3. Levelstructuur — 130 levels

### Alfabet (120 levels)

Per Koch-stap worden tot 5 leveltypen aangemaakt:

```
Stap 0 (K):   INTRO + FOCUS                          = 2 levels
Stap 1 (M):   INTRO + FOCUS + PRACTICE               = 3 levels
Stap 2 (U):   INTRO + FOCUS + PRACTICE               = 3 levels
Stap 3 (R):   INTRO + FOCUS + PRACTICE               = 3 levels
Stap 4 (E):   INTRO + FOCUS + PRACTICE               = 3 levels
Stap 5 (S):   INTRO + FOCUS + PRACTICE + MASTER + REEKS = 5 levels
...
Stap 25 (X):  INTRO + FOCUS + PRACTICE + MASTER + REEKS = 5 levels
```

**Totaal alfabet:** 26×INTRO + 26×FOCUS + 25×PRACTICE + 22×MASTER + 21×REEKS = 120 levels

### Cijfers (5 levels)

| Level | Inhoud | Vragen |
|-------|--------|--------|
| Cijfers 1–5 intro | 1,2,3,4,5 leren | 8 |
| Cijfers 1–5 practice | 1–5 oefening | 16 |
| Cijfers 6–0 intro | 6,7,8,9,0 leren | 8 |
| Cijfers 6–0 practice | 6–0 oefening | 16 |
| Megamix | Letters + alle cijfers | 22 |

### Q-codes bonus (5 levels)

| Q-code | Betekenis |
|--------|-----------|
| QRZ | Wie roept mij? |
| QTH | Mijn locatie is… |
| QSL | Ik bevestig ontvangst! |
| QRM | Er is storing op de frequentie |
| QRP | Ik verlaag mijn vermogen |

### Rangsysteem

| Rang | Kleur | Stappen |
|------|-------|---------|
| 🔵 Rookie Agent | Teal | Stap 0–3 (K,M,U,R) |
| 🟣 Field Operative | Paars | Stap 4–8 (E t/m A) |
| 🟠 Special Agent | Oranje | Stap 9–15 (P t/m Z) |
| 🟡 Secret Operative | Geel | Stap 16–20 (F t/m Q) |
| 🔴 Elite Spy | Rood | Stap 21–25 (V t/m X) |
| 🟢 Master Cryptologist | Groen | Cijfers & Q-codes |

### Unlock-systeem

| Leveltype | Minimale score om te ontgrendelen |
|-----------|-----------------------------------|
| Intro | 50% |
| Focus | 65% |
| Practice | 70% |
| Master | 75% |
| Reeks | 70% |
| Cijfers | 55–72% |
| Q-codes | 65% |

Hogere levels kunnen ook **manueel geselecteerd** worden vanuit de missiekaart, zelfs zonder de unlock-score te halen. Zo kunnen gevorderde spelers direct het gewenste niveau kiezen.

---

## 4. Geheime Briefing

### Concept

De Geheime Briefing is de eindbaas van het leren: volledige **Nederlandse woorden** horen in morse en letter voor letter decoderen. Dit is het dichtstst bij echte CW-ontvangst.

### Unlock

De Geheime Briefing-knop verschijnt op het homescreen zodra **≥6 woorden beschikbaar zijn** in de woordenlijst op basis van de gekende letters. Dit is automatisch het geval vanaf **stap 5** (K,M,U,R,E,S gekend):

Eerste beschikbare woorden: `KUS · MES · MUS · REM · RUM · RUS · SER`

Meer letters = meer en langere woorden. Bij stap 6 (+ N) zijn er al 16+ woorden beschikbaar.

### Spelverloop

1. **5 woorden** worden gekozen op basis van gekende letters
2. Per woord: het **volledige woord** speelt eerst als preview af
3. Dan: letter voor letter, met 4-keuze knoppen per letter
4. Het correct ingevulde woord blijft zichtbaar in de tegels
5. Na 5 woorden: overzicht met score en welke woorden correct/incorrect waren

### Woordenlijst (selectie)

| Bekende letters | Woorden |
|-----------------|---------|
| K,M,U,R,E,S | KUS · MES · MUS · REM · RUM · RUS |
| + N | KERN · KERS · NEUS · REUS · RAMP |
| + A | KAMP · MARS · SAMEN · RAMEN · ANKER |
| + T | STAM · TRAM · TRAP · TREIN · WAPEN |
| + L,W | PLANK · KRANT · STRAK · LAKEN · KRAAN |

De woordenlijst bevat 60+ woorden van 3 tot 6 letters, allemaal Nederlandstalig en didactisch gerangschikt.

---

## 5. Audio-engine

De audio is gebouwd op de **Web Audio API** met professionele CW-kwaliteit.

### Kernprincipes

**Pre-scheduling (niet setTimeout)**
Alle morse-tijdstippen worden berekend via `AudioContext.currentTime` en ingepland op de audio-tijdlijn. Dit geeft sample-nauwkeurige timing — volledig onafhankelijk van JavaScript's event loop. Naïeve implementaties met `setTimeout` geven onregelmatige timing; dat is hier uitgesloten.

**Edge shaping — geen keyklicks**
Elke aan/uit-overgang van het signaal verloopt via een 5ms exponentiële ramp (`setTargetAtTime`). Zonder dit klinkt morse als een harde klik die vermoeiend is voor kinderen. Met edge shaping klinkt het warm en aangenaam.

**Toonhoogte: D5 (587 Hz)**
Gekozen voor warmte en kind-vriendelijkheid. Hogere frequenties (zoals de klassieke 700 Hz op radio) zijn scherper en vermoeiender. D5 klinkt als een xylofoon-tik.

### Geluidshiërarchie

| Moment | Geluid | Karakter |
|--------|--------|---------|
| Correct antwoord | Oplopende majeur-drieklank (E-G-B) | Duidelijk vrolijk, xylofoon-stijl |
| Fout antwoord | Zacht dalend "wah-wah" | Vriendelijk, niet strafend, GEEN buzzer |
| Nieuwe letter unlock | 5-noot fanfare | Triomfantelijk |
| Level up | 7-noot melodie | Feestelijk |
| Stream/reeks bevestiging | Korte tik hoog/laag | Neutraal, informatief |

### Technische signaalketen

```
OscillatorNode (sine, 587 Hz)
    → GainNode (morse "sleutel": aan/uit met 5ms ramp)
        → AudioContext.destination
```

---

## 6. Profielen & Voortgang

### Meerdere profielen

Tot **3 agent-profielen** per toestel. Elk profiel heeft:
- Eigen naam en avatar-emoji
- Aparte voortgang, scores en level-unlock
- Eigen dag-streak
- Eigen snelheidsrecords per letter

Bij het opstarten met meerdere profielen verschijnt automatisch een profielselectiescherm.

### Wat wordt bijgehouden

- **Huidige level** (hoogst bereikt)
- **Score per level** (hoogste score, niet de laatste)
- **Streak** — aantal opeenvolgende dagen dat er gespeeld werd
- **Totaal aantal sessies**
- **Snelheidsrecord per letter** — reactietijd in milliseconden na het afspelen van de morse

### Snelheidsrecords

Na elke correct beantwoorde vraag in decode-modus wordt de tijd gemeten tussen het einde van het morse-signaal en de klik. Dit is het meest zuivere maat van herkenningsautomatisering.

Zichtbaar in het Agent-dossier, met de 3 snelste letters uitgelicht.

### Opslag

Alle voortgang wordt opgeslagen via `localStorage`. Geen account, geen server, geen privacy-probleem. Werkt offline.

---

## 7. Technische structuur

```
DOT_DASH/
├── index.html          ← HTML-structuur (alle schermen)
├── README.md           ← Dit bestand
├── css/
│   └── main.css        ← Alle stijlen (~540 regels)
└── js/
    ├── morse.js        ← Morse-tabel, Koch-reeks, level-builder,
    │                      timing-formules, briefing-woordenlijst
    ├── audio.js        ← Web Audio engine (MorseAudio object)
    ├── game.js         ← Spellogica: decode, reeks, stream, briefing
    └── app.js          ← Profielen, schermnavigatie, UI-helpers,
                           localStorage, sterren, confetti
```

**Geen build-stap. Geen npm. Geen framework. Geen afhankelijkheden.**

Scripts worden geladen in volgorde: `morse.js` → `audio.js` → `game.js` → `app.js`. Elk script gebruikt globale functies en objecten die door de vorige zijn gedefinieerd.

### Schermen (screens)

| Screen ID | Beschrijving |
|-----------|-------------|
| `screen-profiles` | Profielselectie bij meerdere profielen |
| `screen-onboard` | 4-staps onboarding voor nieuwe gebruikers |
| `screen-home` | Homescreen met statistieken |
| `screen-levels` | Missiekaart met alle 130 levels |
| `screen-learn` | Leer-fase met klanksynchronisatie |
| `screen-game` | Spelscherm (decode + reeks) |
| `screen-stream` | Stream-modus (5 letters real-time) |
| `screen-briefing` | Geheime Briefing (Nederlandse woorden) |
| `screen-result` | Resultaat na een level |
| `screen-profile` | Agent-dossier met collectie en records |

---

## 8. Deployment op GitHub Pages

### Eerste keer

1. Ga naar [github.com/ON3VZ/DOT_DASH](https://github.com/ON3VZ/DOT_DASH)
2. Laad alle bestanden op (index.html, README.md, css/, js/)
3. Ga naar **Settings → Pages → Source: Deploy from branch → main → Save**
4. Na ~60 seconden live op: `https://ON3VZ.github.io/DOT_DASH/`

### Update pushen

```bash
git add .
git commit -m "feat: beschrijving van wijziging"
git push origin main
# → automatisch live in ~30 seconden
```

### Bestandsstructuur voor upload

De bestanden moeten exact in deze structuur staan in de root van de repository:

```
/index.html
/README.md
/css/main.css
/js/morse.js
/js/audio.js
/js/game.js
/js/app.js
```

---

## 9. Valkuilen & Mitigaties

| Valkuil | Probleem | Hoe DOT & DASH het oplost |
|---------|----------|--------------------------|
| Te traag beginnen | Kind leert verkeerd ritme aan | Altijd 20 WPM karaktersnelheid, nooit langzamer |
| Tellen in plaats van horen | Kind telt stippen/strepen | 20 WPM maakt tellen onmogelijk |
| Nieuwe letter domineert te lang | Verveling, geen echte mix | PRACTICE 35% focus, MASTER 20% met garantie alle letters |
| Vroeg aangeleerde letters vergeten | Regressie op K, M, E… | MASTER: elke letter gegarandeerd ≥1× per sessie |
| Eén letter herkennen ≠ kopiëren | Kloof naar echt CW | Reeks-modus: 2 letters achter elkaar horen |
| Frustratie bij fouten | Kind stopt | Zachte fail-toon, geen rode X, altijd een weg vooruit |
| "Educatief" label | Kinderen haken af | Spy-thema, missies, badges, briefings |
| Te snel te moeilijk | Frustratie-drempel | Drempel per type: Intro 50%, Master 75% |
| Geluid vermoeiend | Kind stopt na 5 min | Warme D5-toon + edge shaping = aangenaam voor lang spelen |
| Stuurmodus te complex | Kinderen haken af | Verwijderd — 100% focus op luisteren |

---

## 10. Roadmap

- [ ] **PWA / offline-modus** — Service Worker + manifest voor gebruik zonder internet
- [ ] **Meer briefing-woorden** — woordenlijst uitbreiden naar 150+
- [ ] **Leestekens** — `.` `,` `?` als extra bonus-levels
- [ ] **Exporteerbare agent-kaart** — screenshot deelbaar als badge
- [ ] **Vergelijking met leeftijdsgenoten** — snelheidsrecords anoniem vergelijken
- [ ] **Adaptieve moeilijkheidsgraad** — automatisch minder focus op letters die de leerder al snel herkent

---

## Over het project

Morsecode heeft alles wat een perfect kinderspel nodig heeft: een meetbare vaardigheid, een geheimzinnige aura, een universele code en eindeloze progressie-ruimte. Het mist enkel de juiste verpakking.

DOT & DASH is die verpakking: het spy-thema, de Koch-methode als onzichtbare pedagogiek, en een game-loop die motiverend blijft.

*73 de ON3VZ · DOT & DASH v4.0*

`-.- — ..-  -.. .- -  -.- .- -. .--- .---!`
*(Dat is "KOU DAT KAN JJ!" in morse — bijna goed 😄)*
