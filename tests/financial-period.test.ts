import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, findFirst } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    financialPeriodClose: { findUnique, findFirst },
  },
}));

import { assertFinancialPeriodOpen, assertFinancialPeriodsOpen } from '../src/lib/financial-period';

describe('financial period closing', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
  });

  it('allows changes when the period is open', async () => {
    findUnique.mockResolvedValue(null);

    await expect(assertFinancialPeriodOpen('company-1', new Date('2026-08-15T12:00:00Z')))
      .resolves.toBeUndefined();
  });

  it('blocks changes when the period is closed', async () => {
    findUnique.mockResolvedValue({ status: 'CLOSED' });

    await expect(assertFinancialPeriodOpen('company-1', new Date('2026-08-15T12:00:00Z')))
      .rejects.toThrow('08/2026 está fechado');
  });

  it('deduplicates months before checking an imported batch', async () => {
    findFirst.mockResolvedValue(null);

    await assertFinancialPeriodsOpen('company-1', [
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-08-20T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
    ]);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        company_id: 'company-1',
        status: 'CLOSED',
        OR: [{ year: 2026, month: 8 }, { year: 2026, month: 9 }],
      },
    });
  });
});
