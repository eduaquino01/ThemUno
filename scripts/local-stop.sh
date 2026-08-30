#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
pid_file="$project_dir/.themuno/dev.pid"
next_lock="$project_dir/.next/dev/lock"
port="${PORT:-3000}"

if [ -f "$next_lock" ]; then
  next_pid="$(node -e "const fs=require('fs');try{const lock=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(lock.pid)process.stdout.write(String(lock.pid))}catch{}" "$next_lock")"
  if [ -n "$next_pid" ]; then
    mkdir -p "$(dirname "$pid_file")"
    echo "$next_pid" >"$pid_file"
  fi
fi

if [ ! -f "$pid_file" ] && [ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)" != "200" ]; then
  echo "ThemUno já está parado."
  exit 0
fi

server_pid="$(cat "$pid_file" 2>/dev/null || true)"
case "$server_pid" in
  ''|*[!0-9]*) echo "Não foi possível identificar com segurança o processo do ThemUno." >&2; exit 1 ;;
esac
if kill -0 "$server_pid" 2>/dev/null; then
  kill "$server_pid"
  attempt=0
  while kill -0 "$server_pid" 2>/dev/null && [ "$attempt" -lt 10 ]; do
    attempt=$((attempt + 1))
    sleep 1
  done
fi
rm -f "$pid_file"
if [ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)" = "200" ]; then
  echo "Existe outro servidor respondendo na porta $port; ele não foi encerrado por segurança." >&2
  exit 1
fi
echo "ThemUno parado."
