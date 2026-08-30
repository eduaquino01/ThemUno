import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.postgresql.prisma',
  datasource: {
    url: process.env.DATABASE_URL
      ?? 'postgresql://themuno:themuno@localhost:5432/themuno',
  },
  migrations: {
    path: 'prisma/migrations-postgresql',
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
});
