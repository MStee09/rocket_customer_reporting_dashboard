export function formatCurrency(
  amount: number | null | undefined,
  options?: { compact?: boolean; showCents?: boolean }
): string {
  if (amount === null || amount === undefined) return '—';

  const { compact = false, showCents = true } = options || {};

  if (compact) {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

export function formatNumber(
  value: number | null | undefined,
  options?: { decimals?: number; compact?: boolean }
): string {
  if (value === null || value === undefined) return '—';

  const { decimals = 0, compact = false } = options || {};

  if (compact) {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  options?: { decimals?: number; showSign?: boolean }
): string {
  if (value === null || value === undefined) return '—';

  const { decimals = 1, showSign = false } = options || {};
  const formatted = value.toFixed(decimals);

  if (showSign && value > 0) {
    return `+${formatted}%`;
  }

  return `${formatted}%`;
}

export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '—';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    case 'medium':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    case 'relative':
      return formatRelativeTime(d);
    default:
      return d.toLocaleDateString();
  }
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date, 'short');
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
}
