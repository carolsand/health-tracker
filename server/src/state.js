const express = require("express");
const db = require("./db");
const { requireAuth } = require("./auth");

const router = express.Router();

// Mirrors DEFAULT_STATE in strength-nutrition-tracker.html — used when a user has no saved state yet.
const DEFAULT_STATE = {
  profile: { age: 61, heightIn: 64, startWeight: null, goalWeight: null, activity: 1.375, startDate: null },
  weights: [],
  meals: [],
  activities: [],
  checks: {},
  pantry: [],
  customWorkouts: [],
  extraWeeks: 0,
  doctor: { answers: {}, custom: [], apptDate: "" }
};

router.get("/state", requireAuth, (req, res) => {
  const row = db.prepare("SELECT state_json FROM user_state WHERE user_id = ?").get(req.session.userId);
  res.json(row ? JSON.parse(row.state_json) : DEFAULT_STATE);
});

router.put("/state", requireAuth, (req, res) => {
  const stateJson = JSON.stringify(req.body || {});
  db.prepare(`
    INSERT INTO user_state (user_id, state_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `).run(req.session.userId, stateJson);
  res.json({ ok: true });
});

module.exports = router;
