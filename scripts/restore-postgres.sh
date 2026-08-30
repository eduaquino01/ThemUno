#!/bin/sh
set -eu

if [ "${1:-}" != "--confirm" ] || [ -z "${2:-}" ]; then
  echo "Uso: scripts/restore-postgres.sh --confirm caminho/do/backup.dump" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL não foi definida." >&2
  exit 1
fi

backup_file="$2"
if [ ! -f "$backup_file" ]; then
  echo "Backup não encontrado: $backup_file" >&2
  exit 1
fi

pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$backup_file"
echo "Restauração concluída a partir de: $backup_file"
