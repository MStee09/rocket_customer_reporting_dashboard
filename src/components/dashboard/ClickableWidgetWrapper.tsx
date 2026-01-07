import { ReactNode, KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ClickableWidgetWrapperProps {
  widgetId: string;
  children: ReactNode;
  className?: string;
}

export function ClickableWidgetWrapper({
  widgetId,
  children,
  className = ''
}: ClickableWidgetWrapperProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleClick = () => {
    const params = new URLSearchParams();

    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (start) params.set('start', start);
    if (end) params.set('end', end);

    const queryString = params.toString();
    navigate(`/widgets/${widgetId}/data${queryString ? `?${queryString}` : ''}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
