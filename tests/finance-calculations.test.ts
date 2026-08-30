import { describe, expect, it } from 'vitest';
import { applyProjectionAdjustment, distributeAmount, percentageVariance } from '../src/lib/finance-calculations';

describe('financial calculations', () => {
  it('adjusts only the projected portion of a scenario', () => {
    expect(applyProjectionAdjustment(1_000, 500, 20)).toBe(1_600);
    expect(applyProjectionAdjustment(1_000, 500, -100)).toBe(1_000);
  });

  it('distributes values without losing cents', () => {
    const result = distributeAmount(100.01, [33.33, 33.33, 33.34]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100.01, 2);
    expect(result).toEqual([33.33, 33.33, 33.35]);
  });

  it('calculates variance and handles a zero baseline', () => {
    expect(percentageVariance(120, 100)).toBe(20);
    expect(percentageVariance(10, 0)).toBeNull();
    expect(percentageVariance(0, 0)).toBe(0);
  });
});
