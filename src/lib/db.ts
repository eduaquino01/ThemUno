import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const dbPath = path.resolve(process.cwd(), 'dev.db');
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
