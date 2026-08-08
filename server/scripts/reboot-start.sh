#!/bin/bash
# Run via crontab @reboot — cron's minimal environment doesn't source .bashrc,
# so nvm/node/npx aren't on PATH unless explicitly sourced here.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use default
cd "$(dirname "$0")/.."
npx pm2 resurrect
