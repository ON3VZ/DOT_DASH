# DOT & DASH — Leer de Taal van Spionnen 🕵️

> Een educatief morsecode-spel voor kinderen (8–15 jaar), gebouwd op de Koch-methode.
> Geen installatie, geen server, geen afhankelijkheden — gewoon één map op GitHub Pages.

---

## ⚡ Live Demo

**[https://ON3VZ.github.io/DOT_DASH/](https://ON3VZ.github.io/DOT_DASH/)**

---

## 🎮 Spelmodi

| Modus | Beschrijving | Beschikbaar vanaf |
|-------|-------------|-------------------|
| 👂 **LUISTER** | Hoor morse → kies de juiste letter uit 4 opties | Level 1 |
| 📡 **STUUR** | Zie een letter → tik zelf de morse (kort = DOT, lang = DASH) | Level 4 |
| ⚡ **STREAM** | 5 letters automatisch achter elkaar → identificeer elke letter in real-time | Na level 3 (score ≥ 70%) |

### Stream-modus: de echte uitdaging
De Stream-modus simuleert echt CW-ontvangen: letters spelen automatisch af zonder stop-knop. Na elke letter heb je **2 seconden** om de juiste keuze te tikken. Vijf letters in een reeks. Geen pauzes. Dit traint het brein om morse als *patroon* te herkennen, precies zoals echte telegrafisten.

---

## 📚 Pedagogische Aanpak

### Koch-methode
- **Karaktersnelheid altijd 20 WPM** (hersenen leren patronen, nooit tellen)
- **Farnsworth timing**: beginners krijgen langere pauzes; die krimpen automatisch naarmate je vordert
- **Eén letter per level**, in de bewezen Koch-volgorde: K → M → U → R → E → S → N → A → P → T…
- **Focus-weging**: het nieuwe letter krijgt ~40% van de oefeningen in dat level

### Progressie
| Level | Rank | Letters |
|-------|------|---------|
| 1–5   | Rookie Agent    | K M U R E |
| 6–12  | Field Operative | + S N A P T L W I |
| 13–20 | Special Agent   | + J Z F O Y G Q |
| 21–26 | Secret Operative| + V C H B D X |

Unlock vereist **≥ 70%** score. Hogere levels kunnen ook **manueel geselecteerd** worden.

---

## 🔊 Audio-engine

Gebouwd op de **Web Audio API**, exact zoals een professionele CW-generator:

- **Pre-scheduling**: alle morse-tijdstippen worden berekend via `AudioContext.currentTime` (niet via `setTimeout`) → sample-nauwkeurige timing
- **Edge shaping**: 5ms rise/fall via `setTargetAtTime()` → geen key-clicks
- **Toonhoogte**: D5 (587 Hz) → warm, kind-vriendelijk, niet irritant
- **Farnsworth**: char-gaps worden per level automatisch aangepast
- **Sidetone**: in STUUR-modus hoor je je eigen morse live terug

---

## 🛠️ Technische structuur

```
DOT_DASH/
├── index.html              ← Startpunt (enkel HTML-structuur)
├── README.md               ← Dit bestand
├── css/
│   └── main.css            ← Alle stijlen (design tokens, animaties, layouts)
└── js/
    ├── morse.js            ← Morse-tabel, Koch-reeks, level-builder, timing-formules
    ├── audio.js            ← Web Audio engine (MorseAudio object)
    ├── game.js             ← Spel-logica (decode, send, stream)
    └── app.js              ← App-init, scherm-navigatie, UI-helpers, localStorage
```

**Geen build-stap. Geen npm. Geen framework.** Gewoon statische bestanden.

---

## 🚀 GitHub Pages Deployment

### Eerste keer instellen

```bash
# Kloon de repo
git clone https://github.com/ON3VZ/DOT_DASH.git
cd DOT_DASH

# Bestanden zijn klaar — geen build nodig
```

Ga daarna naar **GitHub → Repository → Settings → Pages**:
- Source: `Deploy from a branch`
- Branch: `main` / `root`
- Klik **Save**

Na ~60 seconden is het live op: `https://ON3VZ.github.io/DOT_DASH/`

### Wijziging pushen

```bash
git add .
git commit -m "feat: beschrijving van wijziging"
git push origin main
# → automatisch live in ~30 seconden via GitHub Pages
```

---

## 🎨 Design-beslissingen

| Keuze | Reden |
|-------|-------|
| Spy/agent thema | Kinderen willen geheimen — niet radioamateurs worden |
| Donkere achtergrond + teal/yellow/orange | Contrasteert goed, voelt premium en mysterieus |
| Nunito + Space Mono | Vriendelijk leesbaar + technisch voor morse-display |
| Geen letters-toetsenbord | Kinderen leren **sturen**, niet opzoeken |
| Vibratie-feedback | Mobiele ervaring; tactiel bevestigt elke actie |
| Confetti bij unlock | Emotionele beloning voor nieuwe letter = motivatie |

---

## 📊 Voortgang & Opslag

Voortgang wordt opgeslagen via `localStorage` (geen account, geen server):
- Huidige level & scores per level
- Dag-streak (dagelijks inloggen)
- Letter-collectie
- Agent-naam

---

## 🔭 Roadmap (toekomstige features)

- [ ] PWA / offline-modus (Service Worker + manifest)
- [ ] Cijfers & leestekens (levels 27–36)
- [ ] Meerdere profielen (meerdere kinderen op één device)
- [ ] Snelheids-records per letter
- [ ] Exporteerbare agent-kaart (screenshot-to-share)
- [ ] Q-codes als bonus-levels voor gevorderden

---

## 📜 Licentie

MIT — vrij te gebruiken, aan te passen en te delen.

---

*73 de ON3VZ · DOT & DASH v2.0*

`· — · · · — — — ·`
