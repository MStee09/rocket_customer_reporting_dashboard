import { LucideIcon, Loader2 } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: string;
  isLoading?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  isLoading,
  onClick,
}: MetricCardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-lg border border-slate-200 p-6 transition-shadow text-left';
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-xl' : '';

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-600 mb-1">{label}</h3>
      {isLoading ? (
        <div className="flex items-center py-2">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-slate-800">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subValue && <p className="text-sm text-green-600 mt-1">{subValue}</p>}
        </>
      )}
    </>
  );

  if (onClick) {
    return (
      <button className={`${baseClasses} ${interactiveClasses}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
