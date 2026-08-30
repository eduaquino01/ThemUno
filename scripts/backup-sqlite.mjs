import Database from 'better-sqlite3';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const databasePath = path.resolve(process.env.SQLITE_DATABASE_PATH ?? path.join(projectRoot, 'dev.db'));
const backupDirectory = path.resolve(process.env.SQLITE_BACKUP_DIR ?? path.join(projectRoot, 'backups'));
const force = process.argv.includes('--force');
const keepArgument = process.argv.find((item) => item.startsWith('--keep='));
const keep = Math.max(1, Number(keepArgument?.split('=')[1] ?? 30));

await stat(databasePath).catch(() => {
  throw new Error(`Banco SQLite não encontrado: ${databasePath}`);
});
await mkdir(backupDirectory, { recursive: true });

const now = new Date();
const dateKey = now.toISOString().slice(0, 10).replaceAll('-', '');
const existingFiles = (await readdir(backupDirectory))
  .filter((name) => name.startsWith(`themuno-${dateKey}`) && name.endsWith('.db'));

if (existingFiles.length && !force) {
  console.log(`Backup diário já existe: ${existingFiles.sort().at(-1)}`);
  process.exit(0);
}

const timestamp = now.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
const backupPath = path.join(backupDirectory, `themuno-${timestamp}.db`);
const database = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  const integrity = database.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') throw new Error(`Falha na integridade do banco: ${integrity}`);
  await database.backup(backupPath);
} finally {
  database.close();
}

const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
try {
  const integrity = backup.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') throw new Error(`Backup inválido: ${integrity}`);
} finally {
  backup.close();
}

const backups = (await readdir(backupDirectory))
  .filter((name) => /^themuno-\d{8}T\d{6}Z\.db$/.test(name))
  .sort()
  .reverse();
for (const oldBackup of backups.slice(keep)) {
  await rm(path.join(backupDirectory, oldBackup));
}

console.log(`Backup SQLite criado e validado: ${backupPath}`);
