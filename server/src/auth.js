const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: "not authenticated" });
}

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
