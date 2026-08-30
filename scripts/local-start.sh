#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
state_dir="$project_dir/.themuno"
pid_file="$state_dir/dev.pid"
log_file="$state_dir/dev.log"
next_lock="$project_dir/.next/dev/lock"
port="${PORT:-3000}"

mkdir -p "$state_dir"
if [ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)" = "200" ]; then
  if [ -f "$next_lock" ]; then
    node -e "const fs=require('fs');const lock=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(lock.pid)fs.writeFileSync(process.argv[2],String(lock.pid))" "$next_lock" "$pid_file"
  fi
  echo "ThemUno já está iniciado em http://127.0.0.1:$port"
  exit 0
fi

if [ -f "$pid_file" ]; then
  existing_pid="$(cat "$pid_file")"
  if kill -0 "$existing_pid" 2>/dev/null; then
    echo "ThemUno já está iniciado em http://127.0.0.1:$port"
    exit 0
  fi
  rm -f "$pid_file"
fi

cd "$project_dir"
node scripts/backup-sqlite.mjs
nohup ./node_modules/.bin/next dev --hostname 127.0.0.1 --port "$port" >"$log_file" 2>&1 </dev/null &
server_pid=$!
echo "$server_pid" >"$pid_file"

attempt=0
while [ "$attempt" -lt 30 ]; do
  if [ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)" = "200" ]; then
    if [ -f "$next_lock" ]; then
      node -e "const fs=require('fs');const lock=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(lock.pid)fs.writeFileSync(process.argv[2],String(lock.pid))" "$next_lock" "$pid_file"
    fi
    echo "ThemUno iniciado: http://127.0.0.1:$port"
    echo "Log: $log_file"
    exit 0
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    rm -f "$pid_file"
    echo "Falha ao iniciar. Consulte: $log_file" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

echo "O servidor iniciou, mas não respondeu em 30 segundos. Consulte: $log_file" >&2
exit 1
