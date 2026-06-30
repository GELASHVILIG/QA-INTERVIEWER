# QA Quest — Manual & Automation QA Interview Quiz

A single-file, offline web app that drills you for **Manual QA** and **QA Automation** interviews. Friendly, futuristic UI with a built-in mini-game feel, instant explanations, a real expertise estimate, persistent score history, and a high-pressure **Interview mode**.

No build step, no dependencies, no server — just open `qa-interview-quiz.html` in any modern browser.

## Features

- **103 questions** across Manual QA and Automation, mixed multiple-choice and true/false, each with a clear explanation of the *why*.
- **Three tracks:** 🧪 Manual QA, 🤖 Automation, or 🌐 All. The start screen shows the live question count per track.
- **Two modes:**
  - **🧘 Practice** — relaxed, learn as you go. Pick an answer and the correct/incorrect choice is revealed instantly with an explanation. Live score, streak bonuses, and a progress bar.
  - **🎙️ Interview Pressure** — mimics a real interview: a per-question countdown (scaled by difficulty), a reactive interviewer who types remarks in real time, **no right/wrong feedback during the interview**, hidden score, escalating difficulty, a recording clock, look-away detection, a low-time vignette + ticking sound, a stricter pass bar, and a final **hiring verdict**.
- **Real expertise estimation — Junior / Middle / Senior / Expert.** Every question is tagged with a difficulty tier. Your level is the highest tier you clear at the pass threshold, *and only after passing every easier tier first* (fundamentals-first, like a real interview). The results screen shows a transparent per-tier accuracy breakdown.
- **Persistent score history** stored in your browser (`localStorage`), tagged by track, mode, and estimated level, with a best-score summary and a one-click clear.
- **Answer review** at the end so you can study everything you missed.

## Question coverage

**Manual QA:** fundamentals & testing principles, test design (BVA, equivalence partitioning, decision tables, state transition, pairwise/orthogonal arrays), test levels & types, bug lifecycle (severity vs priority), SDLC & Agile, process & strategy, coverage & metrics (statement/branch, MC/DC, cyclomatic complexity, DRE), non-functional (performance percentiles, load vs stress), security (XSS, authz/IDOR, SQL injection), database/ACID, accessibility, and more.

**Automation:** automation fundamentals & the test pyramid, Selenium/WebDriver (waits, locators, stale elements, Selenium 4 relative locators), frameworks & patterns (Page Object Model, data-driven, BDD, soft vs hard assertions, factory/builder test data, ThreadLocal parallelism), API automation (schema/contract testing, mocks/stubs, OAuth handling), and CI/CD & DevOps (pipelines, parallel execution, quality gates, Docker, flaky-test handling, visual regression).

## Usage

1. Download or clone the repo.
2. Open `qa-interview-quiz.html` in your browser (double-click, or drag it into a browser window).
3. Pick a mode and track, then start.

> Interview mode uses the browser's Web Audio for ticking/buzzer cues. Audio starts after your first click (browser autoplay policy) — use the 🔊 button in the HUD to mute.

## Tech

Plain HTML, CSS, and vanilla JavaScript in one self-contained file. No frameworks, no external libraries, no network calls. All state (history, settings) lives in the browser.

## License

MIT — see `LICENSE`.
