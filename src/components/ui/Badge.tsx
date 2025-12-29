import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'rocket' | 'coral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
}: BadgeProps) {
  const variants = {
    default: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200',
    success: 'bg-success-light text-success-dark border-success/20',
    warning: 'bg-warning-light text-warning-dark border-warning/20',
    danger: 'bg-danger-light text-danger-dark border-danger/20',
    info: 'bg-info-light text-info-dark border-info/20',
    rocket: 'bg-rocket-100 text-rocket-700 border-rocket-200',
    coral: 'bg-coral-100 text-coral-600 border-coral-200',
  };

  const dotColors = {
    default: 'bg-charcoal-400',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    rocket: 'bg-rocket-500',
    coral: 'bg-coral-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5
      font-medium rounded-full border
      ${variants[variant]} ${sizes[size]}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'delivered' | 'in_transit' | 'pending' | 'exception' | 'cancelled' | 'booked';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const statusConfig = {
    delivered: { variant: 'success' as const, label: 'Delivered', dot: true },
    in_transit: { variant: 'info' as const, label: 'In Transit', dot: true },
    pending: { variant: 'warning' as const, label: 'Pending', dot: true },
    exception: { variant: 'danger' as const, label: 'Exception', dot: true },
    cancelled: { variant: 'default' as const, label: 'Cancelled', dot: false },
    booked: { variant: 'rocket' as const, label: 'Booked', dot: true },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
