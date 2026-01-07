// src/components/WidgetCard.tsx

import { useNavigate, useSearchParams } from 'react-router-dom';

interface WidgetCardProps {
  widgetId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that makes widgets clickable.
 * Clicking navigates to the raw data view for that widget.
 * Preserves current date range from the dashboard/analytics hub.
 */
export function WidgetCard({ widgetId, children, className = '' }: WidgetCardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleClick = () => {
    // Preserve current date range when navigating to raw data
    const params = new URLSearchParams();
    
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (start) params.set('start', start);
    if (end) params.set('end', end);

    const queryString = params.toString();
    navigate(`/widgets/${widgetId}/data${queryString ? `?${queryString}` : ''}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`cursor-pointer transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}
