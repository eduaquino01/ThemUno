import Database from 'better-sqlite3';
import { copyFile, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const confirmationIndex = process.argv.indexOf('--confirm');
const sourceArgument = confirmationIndex >= 0 ? process.argv[confirmationIndex + 1] : undefined;

if (!sourceArgument) {
  console.error('Uso: npm run restore:sqlite -- --confirm backups/arquivo.db');
  process.exit(1);
}

const stateDirectory = path.join(projectRoot, '.themuno');
const pidFile = path.join(stateDirectory, 'dev.pid');
const runningPid = await readFile(pidFile, 'utf8').catch(() => '');
if (runningPid.trim()) {
  try {
    process.kill(Number(runningPid.trim()), 0);
    throw new Error('Pare o sistema com npm run local:stop antes de restaurar o banco.');
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ESRCH')) throw error;
  }
}

const sourcePath = path.resolve(sourceArgument);
const databasePath = path.resolve(process.env.SQLITE_DATABASE_PATH ?? path.join(projectRoot, 'dev.db'));
const temporaryPath = `${databasePath}.restore.tmp`;
await stat(sourcePath).catch(() => { throw new Error(`Backup não encontrado: ${sourcePath}`); });

const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
try {
  const integrity = source.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') throw new Error(`Backup inválido: ${integrity}`);
} finally {
  source.close();
}

await mkdir(path.dirname(databasePath), { recursive: true });
await copyFile(sourcePath, temporaryPath);
if (await stat(databasePath).then(() => true).catch(() => false)) {
  const safetyPath = `${databasePath}.before-restore-${Date.now()}.db`;
  const current = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    await current.backup(safetyPath);
  } finally {
    current.close();
  }
  console.log(`Cópia de segurança anterior: ${safetyPath}`);
}

await rename(temporaryPath, databasePath).catch(async (error) => {
  await rm(temporaryPath, { force: true });
  throw error;
});
console.log(`Banco restaurado e validado: ${databasePath}`);
