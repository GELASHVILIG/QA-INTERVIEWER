#!/usr/bin/env node
/* ============================================================
   QA Quest — zero-dependency backend
   Run:   node server.js          (then open http://localhost:3000)
   Data:  stored in ./data.json   (users, sessions, attempts)
   Admin: register with username "admin" to get the admin role
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_USERNAMES = ["admin"];              // usernames granted the admin role (case-insensitive)
const SESSION_TTL = 30 * 24 * 3600 * 1000;      // 30 days

/* ---------- tiny JSON-file "database" ---------- */
let db = { users: {}, sessions: {}, attempts: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))); } catch (e) {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(db, null, 1), err => {
      if (err) console.error("!! failed to save data.json:", err.message);
    });
  }, 100);
}

/* ---------- auth helpers ---------- */
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
function checkPw(user, pw) {
  const a = Buffer.from(hashPw(pw, user.salt), "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function pruneSessions() {
  const now = Date.now();
  let dropped = 0;
  for (const t in db.sessions)
    if (now - db.sessions[t].ts > SESSION_TTL) { delete db.sessions[t]; dropped++; }
  if (dropped) save();
}
function newSession(username) {
  pruneSessions();                              // keep data.json from growing forever
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions[token] = { u: username, ts: Date.now() };
  save();
  return token;
}
setInterval(pruneSessions, 6 * 3600 * 1000).unref();
function userFor(req) {
  const m = /^Bearer\s+([a-f0-9]{48})$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const s = db.sessions[m[1]];
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL) { delete db.sessions[m[1]]; save(); return null; }
  return db.users[s.u] || null;
}
const pub = u => ({ username: u.username, role: u.role });

/* ---------- request helpers ---------- */
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", c => { b += c; if (b.length > 1e5) { reject(new Error("body too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}
const NUM = (v, max) => Math.max(0, Math.min(Math.round(Number(v) || 0), max));
const ENUM = (v, allowed) => allowed.includes(v) ? v : allowed[0];
function sanitizeAttempt(a, username) {
  return {
    id: String(a.id || "").slice(0, 40),
    user: username,
    ts: Date.now(),
    score: NUM(a.score, 100000),
    correct: NUM(a.correct, 1000),
    total: NUM(a.total, 1000),
    pct: NUM(a.pct, 100),
    bestStreak: NUM(a.bestStreak, 1000),
    track: ENUM(a.track, ["manual", "auto", "all"]),
    mode: ENUM(a.mode, ["practice", "interview"]),
    level: ENUM(a.level, ["trainee", "junior", "middle", "senior", "expert"]),
    target: ENUM(a.target, ["any", "junior", "middle", "senior", "expert"]),
    hired: a.hired === true ? true : a.hired === false ? false : null
  };
}

/* ---------- API routes ---------- */
const routes = {
  "GET /api/ping": (req, res) => send(res, 200, { ok: true }),

  "POST /api/register": async (req, res) => {
    const { username = "", password = "" } = await readBody(req);
    const name = String(username).trim();
    if (!/^[A-Za-z0-9_]{2,20}$/.test(name))
      return send(res, 400, { error: "Username: 2–20 letters, digits or _" });
    if (String(password).length < 6)
      return send(res, 400, { error: "Password must be at least 6 characters" });
    const key = name.toLowerCase();
    if (db.users[key]) return send(res, 409, { error: "That username is taken" });
    const salt = crypto.randomBytes(16).toString("hex");
    db.users[key] = {
      username: name, salt, hash: hashPw(String(password), salt),
      role: ADMIN_USERNAMES.includes(key) ? "admin" : "user",
      created: Date.now()
    };
    const token = newSession(key);
    send(res, 200, { token, user: pub(db.users[key]) });
  },

  "POST /api/login": async (req, res) => {
    const { username = "", password = "" } = await readBody(req);
    const user = db.users[String(username).trim().toLowerCase()];
    if (!user || !checkPw(user, String(password)))
      return send(res, 401, { error: "Wrong username or password" });
    const token = newSession(user.username.toLowerCase());
    send(res, 200, { token, user: pub(user) });
  },

  "POST /api/logout": (req, res) => {
    const m = /^Bearer\s+([a-f0-9]{48})$/.exec(req.headers.authorization || "");
    if (m) { delete db.sessions[m[1]]; save(); }
    send(res, 200, { ok: true });
  },

  "GET /api/me": (req, res) => {
    const u = userFor(req);
    if (!u) return send(res, 401, { error: "Not signed in" });
    send(res, 200, { user: pub(u) });
  },

  "GET /api/history": (req, res) => {
    const u = userFor(req);
    if (!u) return send(res, 401, { error: "Not signed in" });
    const key = u.username.toLowerCase();
    send(res, 200, { attempts: db.attempts.filter(a => a.user === key) });
  },

  "POST /api/attempts": async (req, res) => {
    const u = userFor(req);
    if (!u) return send(res, 401, { error: "Not signed in" });
    const entry = sanitizeAttempt(await readBody(req), u.username.toLowerCase());
    db.attempts.push(entry);
    save();
    send(res, 200, { attempt: entry });
  },

  "DELETE /api/history": (req, res) => {
    const u = userFor(req);
    if (!u) return send(res, 401, { error: "Not signed in" });
    const key = u.username.toLowerCase();
    db.attempts = db.attempts.filter(a => a.user !== key);
    save();
    send(res, 200, { ok: true });
  },

  "GET /api/leaderboard": (req, res) => {
    const per = {};
    for (const a of db.attempts) {
      const dn = (db.users[a.user] || {}).username || a.user;
      const p = per[a.user] || (per[a.user] = { username: dn, attempts: 0, bestScore: 0, bestPct: 0 });
      p.attempts++;
      p.bestScore = Math.max(p.bestScore, a.score);
      p.bestPct = Math.max(p.bestPct, a.pct);
    }
    const leaderboard = Object.values(per)
      .sort((x, y) => y.bestScore - x.bestScore || y.bestPct - x.bestPct)
      .slice(0, 20);
    send(res, 200, { leaderboard });
  },

  "GET /api/admin/results": (req, res) => {
    const u = userFor(req);
    if (!u) return send(res, 401, { error: "Not signed in" });
    if (u.role !== "admin") return send(res, 403, { error: "Admins only" });
    const results = db.attempts.slice(-500).reverse()
      .map(a => ({ ...a, username: (db.users[a.user] || {}).username || a.user }));
    send(res, 200, { userCount: Object.keys(db.users).length, results });
  }
};

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  const handler = routes[req.method + " " + url];
  if (handler) {
    try { await handler(req, res); }
    catch (e) { send(res, 400, { error: e.message || "Bad request" }); }
    return;
  }
  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
    return;
  }
  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`🛰️  QA Quest server running →  http://localhost:${PORT}`);
  console.log(`    Data file: ${DATA_FILE}`);
  console.log(`    Admin: register with username "${ADMIN_USERNAMES[0]}" to view applicant results`);
});
