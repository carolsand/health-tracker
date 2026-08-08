module.exports = {
  apps: [
    {
      name: "health-tracker",
      script: "src/index.js",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
