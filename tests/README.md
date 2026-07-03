# QA Quest — Test Suites

Three layers of coverage:

| Layer | What | Run |
|---|---|---|
| Manual | `QA-Quest-manual-test-cases.xlsx` — 53 cases across auth, start screen, practice, interview, history/leaderboard, admin, offline, security, UI/UX. Status dropdowns + auto-computed Summary sheet. | Open in Excel, execute, set Status |
| API (automated) | `api.test.js` — 22 tests for every `server.js` endpoint: auth, sessions, attempt sanitization, history isolation, leaderboard, admin authz, error handling. Zero dependencies. | `npm test` (Node 18+) |
| E2E (automated) | `e2e/app.spec.js` — 17 Playwright browser tests: auth flows, guest mode, mode/track/level selection, practice feedback, full quiz runs, interview mode + hiring verdict, history & leaderboard persistence. | `npm i` · `npx playwright install chromium` · `npm run test:e2e` |

Both automated suites boot an **isolated copy** of `server.js` with its own `data.json` (temp dir for API tests, `tests/e2e/.tmp` for E2E), so your real data is never touched.
