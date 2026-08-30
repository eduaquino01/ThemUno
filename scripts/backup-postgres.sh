#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL não foi definida." >&2
  exit 1
fi

backup_dir="${1:-backups}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir/themuno-$timestamp.dump"

pg_dump "$DATABASE_URL" --format=custom --compress=9 --file="$backup_file"
echo "Backup criado: $backup_file"
