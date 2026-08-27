import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: 'file:./dev.db',
  },
  migrations: {
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
});
