# Health Tracker — notes for Claude Code

Live at **https://health.carolsanders.org** (Carol's Activity + Nutrition Tracker).

## Architecture

- `strength-nutrition-tracker.html` — **the whole front end** in one file (HTML + CSS + vanilla JS, no build step, no framework, charts drawn on `<canvas>`). Keep it a single file; don't split it, bundle it, or reformat it.
- `server/` — Node/Express backend: login/signup (`src/auth.js`), admin user management (`src/admin.js`), per-user state sync (`src/state.js`), SQLite via better-sqlite3 (`src/db.js`). `src/index.js` serves the HTML at `/` with `sendFile`, so HTML edits go live without a restart.
- `index.html` — unrelated minimal starter page. The README still describes the app as local-only; the live site is the server-backed version.
- Secrets live in `server/.env` (gitignored; see `.env.example`). Never read, print, or commit it.

## Things that break easily

- **State shape:** every top-level field in `DEFAULT_STATE` must be added in *both* `strength-nutrition-tracker.html` and `server/src/state.js`. Both merge saved state onto the defaults, so accounts saved before a field existed still get it.
- **localStorage key** `carolStrengthTracker_v1` (namespaced per user as `carolStrengthTracker_v1:<username>`) — never rename it; users' cached data and backups depend on it.
- **Doctor questions:** answers are stored by index into `DOCQ.concat(S.doctor.custom)`. Never insert into or reorder the built-in `DOCQ` array — it shifts every custom question's saved answer. Suggest new questions as custom ones instead.
- **Canvas sizing:** `setupCanvas()` reads `data-base-height` / `data-mobile-height`, not the `height` attribute. New charts need both data attributes.
- **Re-rendering a focused input** (e.g. replacing `innerHTML` from an `onchange`) throws in Chrome; blur first — see `renderCheckIn()`.

## Testing

No test suite. Verify changes in a headless browser: load the HTML with `/api/state` and `/api/me` mocked (`page.route`), exercise the changed UI, click through every nav tab, and require zero console errors. Use an old-shaped state (missing newer fields) to confirm the defaults merge works.

## Git

- Branch `main`, remote `git@github.com:carolsand/health-tracker.git`.
- **Do not add any Claude / Co-Authored-By attribution to commit messages in this repo** (Carol's explicit rule).

## Deploying

Run `./deploy.sh` from the repo root (it requires a clean tree on `main`). It:
1. pushes `main` to GitHub;
2. on the VPS (`jodicas@vps33513.dreamhostps.com`, app in `/home/jodicas/health.carolsanders.org`) takes an online SQLite backup to `~/health-tracker-backups/<timestamp>/` (keeps the last 10), then `git pull --ff-only`;
3. runs `npm install` only if `server/package*.json` changed, and `pm2 restart health-tracker` only if anything under `server/` changed;
4. checks the app answers on port 8317 and that the public site serves byte-for-byte the committed HTML.

It prints a rollback command after each update. The VPS uses nvm-installed Node; pm2 runs via `npx pm2` from `server/`, and `server/scripts/reboot-start.sh` (crontab `@reboot`) resurrects it after a reboot. The `carolsand` SSH login is not authorized for key auth — use `jodicas`.

## Work coming from Claude chat / Cowork

Changes built elsewhere may be based on an **older copy** of the HTML (missing login, plans, admin). Don't drop such a file in wholesale: diff it against the current file and port only the new features, then test and deploy as above.
