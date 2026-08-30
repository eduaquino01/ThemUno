export function applyProjectionAdjustment(actual: number, projected: number, percentage: number) {
  return actual + projected * (1 + percentage / 100);
}

export function distributeAmount(amount: number, percentages: number[]) {
  let distributed = 0;
  return percentages.map((percentage, index) => {
    const value = index === percentages.length - 1 ? Math.round((amount - distributed) * 100) / 100 : Math.round(amount * percentage) / 100;
    distributed += value;
    return value;
  });
}

export function percentageVariance(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous) * 100;
}
