const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { requireAdmin } = require("./auth");

const router = express.Router();

router.get("/admin/users", requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, is_admin, created_at FROM users ORDER BY created_at").all();
  res.json(users);
});

router.post("/admin/users/:id/reset-password", requireAdmin, (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "new password must be at least 8 characters" });
  }
  const id = Number(req.params.id);
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "user not found" });
  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
  res.json({ ok: true });
});

module.exports = router;
