/* ============================================================
   QA Quest — automated API test suite (zero-dependency)
   Run:   node --test tests/api.test.js
   Needs: Node 18+ (built-in test runner + fetch)

   Spawns server.js in an isolated temp dir (own data.json),
   so it never touches your real data.
   ============================================================ */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PORT = 3000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;
let proc, tmpDir;

/* ---------- helpers ---------- */
async function api(method, url, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
}
const uniq = p => p + Math.random().toString(36).slice(2, 8);
async function registerUser(name, password = "secret123") {
  const r = await api("POST", "/api/register", { body: { username: name, password } });
  assert.equal(r.status, 200, `register ${name}: ${JSON.stringify(r.json)}`);
  return r.json.token;
}
const validAttempt = over => Object.assign({
  id: "a1", score: 1200, correct: 8, total: 10, pct: 80, bestStreak: 5,
  track: "manual", mode: "practice", level: "middle", target: "junior", hired: true
}, over);

/* ---------- boot isolated server ---------- */
before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qaquest-test-"));
  const root = path.join(__dirname, "..");
  for (const f of ["server.js", "index.html"])
    fs.copyFileSync(path.join(root, f), path.join(tmpDir, f));
  proc = spawn(process.execPath, [path.join(tmpDir, "server.js")], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore"
  });
  // wait for /api/ping
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + "/api/ping");
      if (r.ok) return;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("server did not start on " + BASE);
});

after(() => {
  if (proc) proc.kill();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
});

/* ============================================================
   Smoke / static
   ============================================================ */
test("GET /api/ping returns ok", async () => {
  const r = await api("GET", "/api/ping");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});

test("GET / serves index.html", async () => {
  const res = await fetch(BASE + "/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(await res.text(), /QA/);
});

test("unknown route returns 404", async () => {
  const r = await api("GET", "/api/nope");
  assert.equal(r.status, 404);
});

test("invalid JSON body returns 400", async () => {
  const res = await fetch(BASE + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json"
  });
  assert.equal(res.status, 400);
});

/* ============================================================
   Registration
   ============================================================ */
test("register: valid user gets token + user object", async () => {
  const name = uniq("Alice_");
  const r = await api("POST", "/api/register", { body: { username: name, password: "secret123" } });
  assert.equal(r.status, 200);
  assert.match(r.json.token, /^[a-f0-9]{48}$/);
  assert.equal(r.json.user.username, name);
  assert.equal(r.json.user.role, "user");
});

test("register: username shorter than 2 chars rejected", async () => {
  const r = await api("POST", "/api/register", { body: { username: "a", password: "secret123" } });
  assert.equal(r.status, 400);
});

test("register: username with illegal chars rejected", async () => {
  const r = await api("POST", "/api/register", { body: { username: "bad name!", password: "secret123" } });
  assert.equal(r.status, 400);
});

test("register: password under 6 chars rejected", async () => {
  const r = await api("POST", "/api/register", { body: { username: uniq("u"), password: "12345" } });
  assert.equal(r.status, 400);
});

test("register: duplicate username rejected (case-insensitive)", async () => {
  const name = uniq("Dup_");
  await registerUser(name);
  const r = await api("POST", "/api/register", { body: { username: name.toUpperCase(), password: "secret123" } });
  assert.equal(r.status, 409);
});

/* ============================================================
   Login / session
   ============================================================ */
test("login: correct credentials succeed, username case-insensitive", async () => {
  const name = uniq("Login_");
  await registerUser(name, "pw123456");
  const r = await api("POST", "/api/login", { body: { username: name.toLowerCase(), password: "pw123456" } });
  assert.equal(r.status, 200);
  assert.match(r.json.token, /^[a-f0-9]{48}$/);
});

test("login: wrong password returns 401", async () => {
  const name = uniq("Wrong_");
  await registerUser(name);
  const r = await api("POST", "/api/login", { body: { username: name, password: "not-the-pw" } });
  assert.equal(r.status, 401);
});

test("login: unknown user returns 401", async () => {
  const r = await api("POST", "/api/login", { body: { username: uniq("ghost"), password: "whatever1" } });
  assert.equal(r.status, 401);
});

test("GET /api/me: valid token returns user, no/garbage token returns 401", async () => {
  const name = uniq("Me_");
  const token = await registerUser(name);
  const ok = await api("GET", "/api/me", { token });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.username, name);

  assert.equal((await api("GET", "/api/me")).status, 401);
  assert.equal((await api("GET", "/api/me", { token: "f".repeat(48) })).status, 401);
  assert.equal((await api("GET", "/api/me", { token: "short" })).status, 401);
});

test("logout invalidates the session token", async () => {
  const token = await registerUser(uniq("Out_"));
  assert.equal((await api("POST", "/api/logout", { token })).status, 200);
  assert.equal((await api("GET", "/api/me", { token })).status, 401);
});

/* ============================================================
   Attempts / history
   ============================================================ */
test("POST /api/attempts requires auth", async () => {
  const r = await api("POST", "/api/attempts", { body: validAttempt() });
  assert.equal(r.status, 401);
});

test("POST /api/attempts stores a sanitized attempt", async () => {
  const token = await registerUser(uniq("Att_"));
  const r = await api("POST", "/api/attempts", { token, body: validAttempt() });
  assert.equal(r.status, 200);
  const a = r.json.attempt;
  assert.equal(a.score, 1200);
  assert.equal(a.track, "manual");
  assert.equal(a.hired, true);
  assert.ok(a.ts > 0);
});

test("attempt sanitization: clamps numbers, defaults bad enums, null hired", async () => {
  const token = await registerUser(uniq("San_"));
  const r = await api("POST", "/api/attempts", {
    token,
    body: validAttempt({
      score: -50, pct: 999, correct: "abc", total: 1e9,
      track: "hacker", mode: "cheat", level: "god", target: "root",
      hired: "yes", id: "x".repeat(100)
    })
  });
  assert.equal(r.status, 200);
  const a = r.json.attempt;
  assert.equal(a.score, 0);            // negative clamped to 0
  assert.equal(a.pct, 100);            // clamped to max
  assert.equal(a.correct, 0);          // NaN → 0
  assert.equal(a.total, 1000);         // clamped to max
  assert.equal(a.track, "manual");     // bad enum → first allowed
  assert.equal(a.mode, "practice");
  assert.equal(a.level, "trainee");
  assert.equal(a.target, "any");
  assert.equal(a.hired, null);         // non-boolean → null
  assert.equal(a.id.length, 40);       // id truncated
});

test("GET /api/history returns only the caller's attempts", async () => {
  const t1 = await registerUser(uniq("H1_"));
  const t2 = await registerUser(uniq("H2_"));
  await api("POST", "/api/attempts", { token: t1, body: validAttempt({ score: 111 }) });
  await api("POST", "/api/attempts", { token: t2, body: validAttempt({ score: 222 }) });
  const h1 = await api("GET", "/api/history", { token: t1 });
  assert.equal(h1.status, 200);
  assert.equal(h1.json.attempts.length, 1);
  assert.equal(h1.json.attempts[0].score, 111);
});

test("DELETE /api/history clears only the caller's attempts", async () => {
  const t1 = await registerUser(uniq("D1_"));
  const t2 = await registerUser(uniq("D2_"));
  await api("POST", "/api/attempts", { token: t1, body: validAttempt() });
  await api("POST", "/api/attempts", { token: t2, body: validAttempt() });
  assert.equal((await api("DELETE", "/api/history", { token: t1 })).status, 200);
  assert.equal((await api("GET", "/api/history", { token: t1 })).json.attempts.length, 0);
  assert.equal((await api("GET", "/api/history", { token: t2 })).json.attempts.length, 1);
});

/* ============================================================
   Leaderboard
   ============================================================ */
test("leaderboard is public, keeps best score per user, sorted desc", async () => {
  const name = uniq("Lead_");
  const token = await registerUser(name);
  await api("POST", "/api/attempts", { token, body: validAttempt({ score: 100, pct: 10 }) });
  await api("POST", "/api/attempts", { token, body: validAttempt({ score: 5000, pct: 90 }) });
  const r = await api("GET", "/api/leaderboard");
  assert.equal(r.status, 200);
  const me = r.json.leaderboard.find(e => e.username === name);
  assert.ok(me, "user missing from leaderboard");
  assert.equal(me.bestScore, 5000);
  assert.equal(me.attempts, 2);
  const scores = r.json.leaderboard.map(e => e.bestScore);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  assert.ok(r.json.leaderboard.length <= 20);
});

/* ============================================================
   Admin
   ============================================================ */
test("admin: 'admin' username gets admin role and sees all results", async () => {
  const userToken = await registerUser(uniq("App_"));
  await api("POST", "/api/attempts", { token: userToken, body: validAttempt({ hired: false }) });

  const r = await api("POST", "/api/register", { body: { username: "admin", password: "admin123" } });
  // admin may already exist from an earlier run of this file
  const adminToken = r.status === 200
    ? r.json.token
    : (await api("POST", "/api/login", { body: { username: "admin", password: "admin123" } })).json.token;

  const me = await api("GET", "/api/me", { token: adminToken });
  assert.equal(me.json.user.role, "admin");

  const res = await api("GET", "/api/admin/results", { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.json.userCount >= 2);
  assert.ok(Array.isArray(res.json.results) && res.json.results.length >= 1);
  assert.ok(res.json.results[0].username, "results should carry display username");
});

test("admin endpoint: non-admin gets 403, anonymous gets 401", async () => {
  const token = await registerUser(uniq("Pleb_"));
  assert.equal((await api("GET", "/api/admin/results", { token })).status, 403);
  assert.equal((await api("GET", "/api/admin/results")).status, 401);
});
