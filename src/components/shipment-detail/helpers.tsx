import { LucideIcon } from 'lucide-react';

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

interface DateRowProps {
  label: string;
  value: string | null | undefined;
}

export function DateRow({ label, value }: DateRowProps) {
  const formatted = value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  return <InfoRow label={label} value={formatted} />;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="p-12 text-center text-slate-500">
      <Icon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
      <p>{message}</p>
    </div>
  );
}

interface FlagProps {
  label: string;
  color: 'yellow' | 'green' | 'blue';
}

export function Flag({ label, color }: FlagProps) {
  const colors = {
    yellow: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}
