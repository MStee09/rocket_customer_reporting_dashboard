export function getStatusBadgeColor(status: { is_completed?: boolean | null; is_cancelled?: boolean | null }): string {
  if (status.is_completed) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (status.is_cancelled) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
}

export function calculateMargin(revenue: number | string | null, cost: number | string | null): number {
  const rev = typeof revenue === 'string' ? parseFloat(revenue) : revenue;
  const cst = typeof cost === 'string' ? parseFloat(cost) : cost;
  if (!rev || !cst) return 0;
  return rev - cst;
}

export function calculateMarginPercent(revenue: number | string | null, cost: number | string | null): number {
  const rev = typeof revenue === 'string' ? parseFloat(revenue) : revenue;
  const cst = typeof cost === 'string' ? parseFloat(cost) : cost;
  if (!rev || !cst || rev === 0) return 0;
  return ((rev - cst) / rev) * 100;
}
