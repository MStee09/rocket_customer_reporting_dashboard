import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-sm rounded-xl',
    elevated: 'bg-white border border-slate-100 shadow-md rounded-xl',
    outlined: 'bg-white border-2 border-slate-200 rounded-xl',
    subtle: 'bg-slate-50 border border-slate-100 rounded-xl',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover
    ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200'
    : '';

  const clickableProps = onClick
    ? { onClick, role: 'button', tabIndex: 0 }
    : {};

  return (
    <div
      className={`${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
      {...clickableProps}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  action,
}: {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between pb-4 border-b border-slate-100 ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string
}) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string
}) {
  return (
    <p className={`text-sm text-slate-500 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardBody({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string
}) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string
}) {
  return (
    <div className={`pt-4 mt-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}
