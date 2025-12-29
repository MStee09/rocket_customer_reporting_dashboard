import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface AskAIButtonProps {
  context: {
    type: 'widget' | 'shipments' | 'report';
    title?: string;
    data?: any;
    filters?: any;
    dateRange?: { start: string; end: string };
    customerId: number;
  };
  suggestedPrompt?: string;
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md';
  className?: string;
}

export function AskAIButton({
  context,
  suggestedPrompt,
  variant = 'button',
  size = 'md',
  className = '',
}: AskAIButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    const contextData = {
      ...context,
      suggestedPrompt,
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem('ai_studio_context', JSON.stringify(contextData));
    navigate('/ai-studio', { state: { hasContext: true } });
  };

  if (variant === 'icon') {
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <button
        onClick={handleClick}
        className={`p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer ${className}`}
        title="Ask AI about this"
      >
        <Sparkles className={`${iconSize} text-amber-500`} />
      </button>
    );
  }

  if (variant === 'text') {
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    return (
      <button
        onClick={handleClick}
        className={`${textSize} text-rocket-600 hover:text-rocket-700 hover:underline transition-colors ${className}`}
      >
        Ask AI about this
      </button>
    );
  }

  const buttonSize = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 ${buttonSize} bg-gradient-to-r from-rocket-600 to-rocket-700 hover:from-rocket-700 hover:to-rocket-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow ${className}`}
    >
      <Sparkles className={iconSize} />
      Ask AI
    </button>
  );
}
