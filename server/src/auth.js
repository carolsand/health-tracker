const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: "not authenticated" });
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post("/signup", (req, res) => {
  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode) {
    return res.status(503).json({ error: "signups are not enabled" });
  }
  const { username, password, inviteCode } = req.body || {};
  if (!inviteCode || !safeEqual(inviteCode, expectedCode)) {
    return res.status(403).json({ error: "invalid invite code" });
  }
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: "username and an 8+ character password are required" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "that username is already taken" });
  }
  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  req.session.userId = info.lastInsertRowid;
  res.json({ ok: true });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  req.session.userId = user.id;
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ loggedIn: true });
});

module.exports = { router, requireAuth };
