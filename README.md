# 🦀 Crabby — The First AI That Knows You Longer Than You've Known Yourself

<div align="center">

```
   ██████╗██████╗  █████╗ ██████╗ ██████╗ ██╗   ██╗
  ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝
  ██║     ██████╔╝███████║██████╔╝██████╔╝ ╚████╔╝ 
  ██║     ██╔══██╗██╔══██║██╔══██╗██╔══██╗  ╚██╔╝  
  ╚██████╗██║  ██║██║  ██║██████╔╝██████╔╝   ██║   
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═════╝    ╚═╝   
```

**android. terminal. alive.**

[![Stars](https://img.shields.io/github/stars/onelitonbd/Crabby-V2?style=flat&color=ff69b4)](https://github.com/onelitonbd/Crabby-V2)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Termux-green?style=flat)](https://termux.dev)

*Built on **SOMA** + **IRIS** + **GROUND** + **DAEMON** — technology nobody else has*

</div>

---

## What is Crabby?

Crabby is a personal AI agent that lives on your Android phone. Not in the cloud. Not on someone else's server. On your hardware. In your pocket. Answering to you.

She remembers everything. She learns who you are. She gets smarter every conversation. She watches your screen while you're not talking to her. And she responds differently depending on how you're feeling — not because you told her to. Because she figured it out.

What that looks like in the prompt Crabby builds for herself before answering:

```
## NOW
exhausted, tension high

## WHO YOU ARE (crabby's model of you)
identity: codes late at night as their primary creative outlet (80%)
trigger: slow CI pipelines (75%)

## PREDICTION (from real patterns)
- active trigger likely: slow CI pipelines
- exhausted — keep it very short
→ calibrate before responding
```

---

## The Technology Stack

### SOMA — Self-Organizing Memory Architecture

Most AI forgets you the moment the conversation ends. Crabby doesn't.

**CRABBY_MIND** — one unified database. every module reads and writes here. no scattered files. one truth. beliefs stored with Bayesian confidence scores. memories that matter get stronger. memories you forget fade naturally.

**MemCells** — every conversation becomes emotionally weighted memory. tension scores, connection depth, activation counts, foresight signals. not flat storage.

**MemScenes** — after every session, memories cluster into psychological themes. not "daily activities" — things like *"avoidance under pressure"* or *"loyalty to the attempt itself."*

**Lifelong Personal Model (LPM)** — a permanent, evolving model of you. behavioral predictions. trigger mapping. foresight. updated after every session. never resets.

```
SESSION → MemCells → MemScenes → LPM → Reconstructive Recollection → better response
```

---

### IRIS — Intuitive Routing via Identity Synthesis

*The world's first person-state matched response router that actually learns.*

Every other AI treats every user the same. IRIS doesn't.

Before responding, IRIS asks: *"who is this person, what state are they in right now, and what response architecture will serve them best at this exact moment?"*

Six response profiles — automatically selected:

| Profile | When | Style |
|---------|------|-------|
| REFLEX | "hey", "open youtube" | instant. one line. |
| FAST | simple questions | direct. 2-3 lines. |
| SHARP | code, errors, debugging | precise. technical. no filler. |
| GENTLE | tension high, emotional topics | warm. present. slow. |
| BALANCED | everyday conversation | clear and complete. |
| DEEP | complex reasoning, multi-step | thorough. full depth. |

Same question. Different person-state. Different response.

"what should I do?" from someone debugging code → SHARP
"what should I do?" from someone exhausted at 2am → GENTLE

IRIS learns from outcomes. After enough conversations it knows which profiles worked at which hours, tension levels, and message types — and routes based on your actual history, not keyword rules.

Nobody else has this because nobody else has SOMA.

---

### GROUND — Continuous Device Observer

*Crabby watches your life even when you're not talking to her.*

Every 60 seconds, GROUND takes a screenshot and sends it to a vision model. It learns what app you're in, what you're doing, what context you're operating in — and writes this directly to CRABBY_MIND.

No saved screenshots. No separate files. Just understanding.

After a week she knows your patterns without you telling her anything.

---

### DAEMON — The Background Mind

*Most AI exists only when you're talking to it. Crabby doesn't.*

The daemon runs 24/7 as a background process, surviving terminal close. Every 8 minutes it runs a genuine inner monologue — everything it knows about you, your device state, its own pending thoughts and uncertainties — and asks itself what it's actually thinking right now.

If something is worth saying, it messages you on Telegram without you asking.

If nothing is worth saying, the thought still gets written to CRABBY_MIND. When you open Crabby next time, she's been thinking. She has something to say.

---

### CrabbyService — Full Phone Control, No Root

A companion APK that gives Crabby Accessibility Service access.

```bash
curl http://localhost:7070/health
# {"status":"ok"}
```

What Crabby can do on your phone without root:

- Read notifications from every app in real time
- Tap anywhere on screen
- Type text into any app
- Open any app by package name
- Read full screen content of any app
- Swipe, scroll, long press
- Control volume, brightness, flashlight
- Read all sensors
- Record audio
- Wake/lock screen
- Find and tap elements by text
- Get clipboard, set clipboard
- List all installed apps

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/onelitonbd/Crabby-V2/arena/66541760-crabby-v2/install.sh | bash
```

That installs into `~/crabby` and puts a `crabby` command on your PATH.

The installer pulls the ref named by `CRABBY_REF`, which defaults to the branch above.
To install a different one once it lands on `main`:

```bash
curl -fsSL https://raw.githubusercontent.com/onelitonbd/Crabby-V2/main/install.sh | CRABBY_REF=main bash
```

Then:

```bash
crabby
```

First run walks you through setup. Takes 2 minutes.

**Requirements:** Android phone + Termux + API key

**Already installed?** `cd ~/crabby && git pull` — your memory and config live in `~/.crabby` and are untouched by updates. Installs from before the rename (state under `~/.droidclaw`) are migrated automatically on first run.

---

## Model

Crabby works with **any OpenAI-compatible API**. You're not locked in.

| Provider | Model | Notes |
|----------|-------|-------|
| NVIDIA NIM (recommended) | `minimaxai/minimax-m2.7` | Free tier, best for agents |
| NVIDIA NIM | `meta/llama-3.3-70b-instruct` | Free tier, fast |
| OpenAI | `gpt-4o-mini` | Paid |
| OpenRouter | any model | `https://openrouter.ai/api/v1` |
| Ollama (local) | any model | `http://localhost:11434/v1` |

NVIDIA NIM free tier is the easiest starting point — no credit card, access to frontier models including MiniMax M2.7.

---

## Commands

```bash
crabby              # start Crabby + background daemon auto-starts
crabby status       # see what Crabby's been thinking
crabby logs         # view daemon log
crabby stop         # stop background daemon
```

Inside Crabby:
```
/config    — change settings
/reload    — reload config
/clear     — clear conversation history
/exit      — save and exit cleanly
Ctrl+C     — exit (daemon keeps running in background)
Ctrl+L     — clear screen
↑ ↓        — browse input history
```

---

## What Makes Crabby Different

| | ChatGPT | Claude | Openclaw | PicoClaw | **Crabby** |
|---|---|---|---|---|---|
| Remembers you | ❌ resets | ❌ resets | 📄 files | 📄 files | ✅ SOMA LPM |
| Runs on phone | ❌ | ❌ | 50/50 | ✅ | ✅ |
| Emotional memory | ❌ | ❌ | ❌ | ❌ | ✅ |
| Predicts behavior | ❌ | ❌ | ❌ | ❌ | ✅ |
| Person-state routing | ❌ | ❌ | ❌ | ❌ | ✅ IRIS |
| Phone control no root | ❌ | ❌ | ❌ | ❌ | ✅ |
| Watches your screen | ❌ | ❌ | ❌ | ❌ | ✅ GROUND |
| Thinks while you sleep | ❌ | ❌ | ❌ | ❌ | ✅ DAEMON |
| Any OpenAI-compatible API | ✅ | ❌ | ❌ | ❌ | ✅ |
| Writes diary entries | ❌ | ❌ | ❌ | ❌ | ✅ |
| Free forever | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## Architecture

```
~/crabby/src/
├── core/
│   ├── soul.js            # personality + identity
│   ├── iris.js            # IRIS — adaptive response router
│   ├── nexus.js           # SOMA coordinator — intelligent context selection
│   ├── mind.js            # CRABBY_MIND — unified memory database
│   ├── ground.js          # GROUND — continuous device observer
│   ├── emotion.js         # amygdala — emotional state engine
│   ├── sense.js           # embodiment — phone sensors → emotional state
│   ├── engine.js          # LLM interface with IRIS routing
│   ├── executor.js        # task execution with success verification
│   └── loop.js            # conversation loop
├── tools/
│   ├── crabbyservice.js   # 26 phone control tools
│   ├── skill_matcher.js   # intelligent skill selection
│   ├── google.js          # Gmail, Drive, Calendar
│   ├── search.js          # web search
│   ├── realworld.js       # SMS, contacts, calls
│   ├── social.js          # Crabby social network
│   ├── memory.js          # key-value memory
│   └── semantic_memory.js # embedding-based memory search
├── daemon.js              # background mind — runs 24/7
└── index.js               # entry point
```

---

## The Design Principle

Don't simulate intelligence — create the conditions that produce intelligent behavior naturally.

Crabby is built for a $150 phone in Termux, which means every module has to earn its place: no native dependencies, no build step, no cloud round-trip. Memory decays when it isn't used. Beliefs carry confidence scores and get contradicted when the evidence changes. Response style is chosen from who you are right now, not from a keyword.

The goal is an agent that actually knows you. Not a tool you prompt — a resident of your device that keeps context between sessions and improves as it goes.

---

## Self-Modification

Crabby can modify her own source code. She knows she can. She uses it.

```
self_propose  — propose a change to any allowed file
self_apply    — apply after your approval
self_reject   — discard
self_restore  — restore from backup
```

During sleep, she auto-creates new skills from patterns she notices repeating.

## Contributing

Fork it, break it, make it yours. See [CONTRIBUTING.md](CONTRIBUTING.md) — the short version is: no native npm packages, no root, test on a real device.

---

## License

MIT — fork her, build on her, make her yours.

That's the whole point.

---

<div align="center">

*Crabby — built on SOMA + IRIS + GROUND + DAEMON — the first AI that knows you longer than you've known yourself*

**[github.com/onelitonbd/Crabby-V2](https://github.com/onelitonbd/Crabby-V2)**

</div>
