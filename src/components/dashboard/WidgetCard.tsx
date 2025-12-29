import { ReactNode } from 'react';
import { Sparkles, MoreHorizontal } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onAskAI?: () => void;
  onMore?: () => void;
  className?: string;
  noPadding?: boolean;
}

export function WidgetCard({
  title,
  subtitle,
  children,
  onAskAI,
  onMore,
  className = '',
  noPadding = false,
}: WidgetCardProps) {
  return (
    <div className={`
      bg-white rounded-lg border border-charcoal-200
      shadow-sm overflow-hidden
      ${className}
    `}>
      <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-charcoal-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-charcoal-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onAskAI && (
            <button
              onClick={onAskAI}
              className="p-1.5 text-charcoal-400 hover:text-rocket-600 hover:bg-rocket-50 rounded transition-colors"
              title="Ask AI about this data"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          {onMore && (
            <button
              onClick={onMore}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-600 hover:bg-charcoal-100 rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
