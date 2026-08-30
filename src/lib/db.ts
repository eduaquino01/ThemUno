import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const provider = process.env.DATABASE_PROVIDER
    ?? (databaseUrl?.startsWith('postgres') ? 'postgresql' : 'sqlite');
  const adapter = provider === 'postgresql'
    ? new PrismaPg({
        connectionString: databaseUrl ?? '',
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 30_000,
        max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      })
    : new PrismaBetterSqlite3({
        url: databaseUrl?.startsWith('file:')
          ? databaseUrl
          : `file:${path.resolve(process.cwd(), 'dev.db')}`,
      });

  if (provider === 'postgresql' && !databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória quando DATABASE_PROVIDER=postgresql.');
  }
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
