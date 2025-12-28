import { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
}

export function SectionHeader({ title, subtitle, icon: Icon, action, compact = false }: SectionHeaderProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
              <Icon className="w-3 h-3 text-gray-600" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
