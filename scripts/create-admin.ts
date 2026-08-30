import bcrypt from 'bcryptjs';
import pkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const { PrismaClient } = pkg;
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: 'file:dev.db' }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Administrador ThemUno';

  if (!email || !password || password.length < 12) {
    throw new Error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD com pelo menos 12 caracteres.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const companies = await prisma.company.findMany({ select: { id: true } });
  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
    },
    update: {
      name,
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
    },
  });

  await prisma.$transaction(
    companies.map((company) => prisma.userCompany.upsert({
      where: {
        user_id_company_id: { user_id: admin.id, company_id: company.id },
      },
      create: { user_id: admin.id, company_id: company.id },
      update: {},
    })),
  );

  console.log(`Administrador local preparado: ${admin.email}`);
}

main()
  .finally(async () => prisma.$disconnect());
