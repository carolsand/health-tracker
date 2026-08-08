require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);

const { router: authRouter } = require("./auth");
const stateRouter = require("./state");

const PORT = process.env.PORT || 8317;
const IS_PROD = process.env.NODE_ENV === "production";
const APP_HTML = path.join(__dirname, "..", "..", "strength-nutrition-tracker.html");

const app = express();
app.set("trust proxy", 1); // required for secure cookies behind DreamHost's TLS-terminating proxy

app.use(express.json());
app.use(
  session({
    store: new FileStore({ path: path.join(__dirname, "..", "data", "sessions"), logFn: () => {} }),
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  })
);

app.get("/", (req, res) => res.sendFile(APP_HTML));

app.use("/api", authRouter);
app.use("/api", stateRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`health-tracker server listening on 0.0.0.0:${PORT}`);
});
