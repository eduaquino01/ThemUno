import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL
      : 'file:./dev.db',
  },
  migrations: {
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
});
