# QA Quest — Manual & Automation QA Interview Quiz

A single-file, offline web app that drills you for **Manual QA** and **QA Automation** interviews. Friendly, futuristic UI with a built-in mini-game feel, instant explanations, a real expertise estimate, persistent score history, and a high-pressure **Interview mode**.

No build step, no dependencies. Open `index.html` directly for offline local mode, or run the included zero-dependency Node backend for accounts, synced history, a global leaderboard, and an admin view of applicant results.

**▶️ Live demo:** https://gelashvilig.github.io/QA-INTERVIEWER/ *(live once GitHub Pages is enabled).*

## Features

- **103 questions** across Manual QA and Automation, mixed multiple-choice and true/false, each with a clear explanation of the *why*.
- **Three tracks:** 🧪 Manual QA, 🤖 Automation, or 🌐 All. The start screen shows the live question count per track.
- **Two modes:**
  - **🧘 Practice** — relaxed, learn as you go. Pick an answer and the correct/incorrect choice is revealed instantly with an explanation. Live score, streak bonuses, and a progress bar.
  - **🎙️ Interview Pressure** — mimics a real interview: a per-question countdown (scaled by difficulty), a reactive interviewer who types remarks in real time, **no right/wrong feedback during the interview**, hidden score, escalating difficulty, a recording clock, look-away detection, a low-time vignette + ticking sound, a stricter pass bar, and a final **hiring verdict**.
- **Real expertise estimation — Junior / Middle / Senior / Expert.** Every question is tagged with a difficulty tier. Your level is the highest tier you clear at the pass threshold, *and only after passing every easier tier first* (fundamentals-first, like a real interview). The results screen shows a transparent per-tier accuracy breakdown.
- **Interview level selection** — apply for a 🌱 Junior, ⚙️ Middle, 🚀 Senior, or 🏆 Expert position (or run a 🎯 Full Scan). A level-L interview covers every tier up to L, and the results screen delivers a **✅ HIRED / ❌ NOT HIRED** decision for that position.
- **Login & accounts** — register/sign in to sync your score history to the server, or play as a guest with browser `localStorage`.
- **Global leaderboard** of all registered users by best score.
- **Admin view** — the `admin` account sees every applicant's attempts and hire/no-hire outcomes.
- **Persistent score history** tagged by track, mode, target level, hire outcome, and estimated level, with a best-score summary and a one-click clear.
- **Answer review** at the end so you can study everything you missed.

## Question coverage

**Manual QA:** fundamentals & testing principles, test design (BVA, equivalence partitioning, decision tables, state transition, pairwise/orthogonal arrays), test levels & types, bug lifecycle (severity vs priority), SDLC & Agile, process & strategy, coverage & metrics (statement/branch, MC/DC, cyclomatic complexity, DRE), non-functional (performance percentiles, load vs stress), security (XSS, authz/IDOR, SQL injection), database/ACID, accessibility, and more.

**Automation:** automation fundamentals & the test pyramid, Selenium/WebDriver (waits, locators, stale elements, Selenium 4 relative locators), frameworks & patterns (Page Object Model, data-driven, BDD, soft vs hard assertions, factory/builder test data, ThreadLocal parallelism), API automation (schema/contract testing, mocks/stubs, OAuth handling), and CI/CD & DevOps (pipelines, parallel execution, quality gates, Docker, flaky-test handling, visual regression).

## Usage

### With backend (accounts, leaderboard, admin)

1. Install [Node.js](https://nodejs.org) (any recent version — no npm packages needed).
2. Run `node server.js` in the project folder.
3. Open **http://localhost:3000** — register an account or play as a guest.
4. Register with the username **`admin`** to get the admin role and the 🗂️ Applicants view (all users' attempts and hire decisions).

All data is stored in a human-readable `data.json` next to `server.js`. Passwords are scrypt-hashed; sessions are bearer tokens valid for 30 days. Change the port with `PORT=8080 node server.js`.

### Without backend (offline)

Open `index.html` directly in your browser (or via GitHub Pages). The app detects that no server is reachable and runs in local mode — scores stay in the browser's `localStorage`; no login, leaderboard, or admin view.

> Interview mode uses the browser's Web Audio for ticking/buzzer cues. Audio starts after your first click (browser autoplay policy) — use the 🔊 button in the HUD to mute.

## Tech

Frontend: plain HTML, CSS, and vanilla JavaScript in one self-contained file — no frameworks or external libraries. Backend: a single-file Node.js server (`server.js`) using only the standard library (`http`, `crypto`, `fs`) with a JSON-file store — no npm install required.

**API:** `POST /api/register` · `POST /api/login` · `POST /api/logout` · `GET /api/me` · `GET/POST/DELETE /api/history|attempts` · `GET /api/leaderboard` · `GET /api/admin/results`

## License

MIT — see `LICENSE`.
