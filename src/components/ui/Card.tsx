import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle' | 'gradient-border';
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
    default: `
      bg-white
      border border-charcoal-200
      shadow-sm
      rounded-lg
    `,

    elevated: `
      bg-white
      border border-charcoal-100
      shadow-md
      rounded-lg
    `,

    outlined: `
      bg-white
      border-2 border-charcoal-200
      rounded-lg
    `,

    subtle: `
      bg-charcoal-50
      border border-charcoal-100
      rounded-lg
    `,

    'gradient-border': `
      bg-white
      rounded-lg
      shadow-sm
      relative
      before:absolute before:inset-0 before:rounded-lg before:p-[2px]
      before:bg-rocket-gradient before:-z-10
      after:absolute after:inset-[2px] after:rounded-[10px] after:bg-white after:-z-10
    `,
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const hoverStyles = hover
    ? 'cursor-pointer hover:border-charcoal-300 hover:shadow-md transition-all duration-200'
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
    <div className={`flex items-center justify-between pb-4 border-b border-charcoal-100 ${className}`}>
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
    <h3 className={`text-lg font-semibold text-charcoal-900 ${className}`}>
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
    <p className={`text-sm text-charcoal-500 mt-1 ${className}`}>
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
    <div className={`pt-4 mt-4 border-t border-charcoal-100 ${className}`}>
      {children}
    </div>
  );
}
