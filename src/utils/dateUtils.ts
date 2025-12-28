import { parseISO, format, isValid } from 'date-fns';

export function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function formatWidgetLabel(value: string): string {
  if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const date = parseISO(value);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
    } catch {
      return value;
    }
  }
  return value;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calculateMargin(retail: number | string, cost: number | string): string {
  const r = typeof retail === 'string' ? parseFloat(retail) : retail;
  const c = typeof cost === 'string' ? parseFloat(cost) : cost;
  if (isNaN(r) || isNaN(c) || r === 0) return '-';
  return `$${(r - c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calculateMarginPercent(retail: number | string, cost: number | string): string {
  const r = typeof retail === 'string' ? parseFloat(retail) : retail;
  const c = typeof cost === 'string' ? parseFloat(cost) : cost;
  if (isNaN(r) || isNaN(c) || r === 0) return '-';
  return `${(((r - c) / r) * 100).toFixed(2)}%`;
}
