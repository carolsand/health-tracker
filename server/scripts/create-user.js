// Interactive one-time account setup. Run with: node scripts/create-user.js
// Password is read via a masked terminal prompt — never pass it as a CLI arg or env var.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const readline = require("readline");
const bcrypt = require("bcryptjs");
const db = require("../src/db");

function ask(question, { mask = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!mask) {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
      return;
    }
    // Mask input for the password prompt.
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        rl.close();
        resolve(value);
        return;
      }
      if (char === "") process.exit(1); // Ctrl+C
      if (char === "") { value = value.slice(0, -1); return; } // backspace
      value += char;
    };
    stdin.on("data", onData);
  });
}

(async () => {
  const defaultUsername = "carolsand";
  const usernameInput = await ask(`Username [${defaultUsername}]: `);
  const username = usernameInput.trim() || defaultUsername;

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    console.error(`User "${username}" already exists. Delete it first if you want to reset the password.`);
    process.exit(1);
  }

  const password = await ask("Password: ", { mask: true });
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  const confirm = await ask("Confirm password: ", { mask: true });
  if (password !== confirm) {
    console.error("Passwords did not match.");
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 12);
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`Created user "${username}".`);
  process.exit(0);
})();
