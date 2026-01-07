interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray';
  label?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-12 w-12 border-[3px]',
};

const colorClasses = {
  blue: 'border-blue-600 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-charcoal-400 border-t-transparent',
};

export function LoadingSpinner({
  size = 'md',
  color = 'blue',
  label,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  if (label) {
    return (
      <div className="flex items-center gap-2">
        {spinner}
        <span className="text-sm text-charcoal-600">{label}</span>
      </div>
    );
  }

  return spinner;
}

interface LoadingOverlayProps {
  label?: string;
}

export function LoadingOverlay({ label = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

interface LoadingPageProps {
  label?: string;
}

export function LoadingPage({ label = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
