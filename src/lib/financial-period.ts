import 'server-only';
import { prisma } from '@/lib/db';

export async function assertFinancialPeriodOpen(companyId: string, date: Date) {
  const year = date.getUTCFullYear(); const month = date.getUTCMonth() + 1;
  const period = await prisma.financialPeriodClose.findUnique({ where: { company_id_year_month: { company_id: companyId, year, month } }, select: { status: true } });
  if (period?.status === 'CLOSED') throw new Error(`O período ${String(month).padStart(2, '0')}/${year} está fechado para alterações financeiras.`);
}

export async function assertFinancialPeriodsOpen(companyId: string, dates: Date[]) {
  const periods = Array.from(new Set(dates.map((date) => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`))).map((value) => { const [year, month] = value.split('-').map(Number); return { year, month }; });
  if (!periods.length) return;
  const closed = await prisma.financialPeriodClose.findFirst({ where: { company_id: companyId, status: 'CLOSED', OR: periods } });
  if (closed) throw new Error(`O período ${String(closed.month).padStart(2, '0')}/${closed.year} está fechado para alterações financeiras.`);
}
