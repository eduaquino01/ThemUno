#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
pid_file="$project_dir/.themuno/dev.pid"
port="${PORT:-3000}"

if [ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null || true)" = "200" ]; then
  echo "Servidor: ativo em http://127.0.0.1:$port"
else
  echo "Servidor: parado"
fi

cd "$project_dir"
node -e "const Database=require('better-sqlite3');const db=new Database('dev.db',{readonly:true});console.log('Banco: '+db.pragma('integrity_check',{simple:true}));console.log('Lançamentos financeiros: '+db.prepare('select count(*) total from FinancialEntry').get().total);db.close();"

latest_backup="$(find "$project_dir/backups" -maxdepth 1 -name 'themuno-*.db' -type f 2>/dev/null | sort | tail -1 || true)"
if [ -n "$latest_backup" ]; then
  echo "Último backup: $latest_backup"
else
  echo "Último backup: ainda não criado"
fi
