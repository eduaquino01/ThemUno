import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../prisma/schema.prisma', import.meta.url);
const targetPath = new URL('../prisma/schema.postgresql.prisma', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const postgresSchema = source.replace(
  'provider = "sqlite"',
  'provider = "postgresql"',
);

if (postgresSchema === source) {
  throw new Error('Não foi possível localizar o provider SQLite no schema principal.');
}

await writeFile(targetPath, postgresSchema);
console.log('Schema PostgreSQL gerado em prisma/schema.postgresql.prisma');
