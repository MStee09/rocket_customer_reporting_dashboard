import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium
    rounded-xl
    transition-all duration-150 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-rocket-600 text-white
      hover:bg-rocket-700
      focus:ring-rocket-500/50
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-slate-700 text-white
      hover:bg-slate-800
      focus:ring-slate-500/50
      shadow-sm hover:shadow-md
    `,
    outline: `
      border-2 border-slate-200
      text-slate-700 bg-white
      hover:border-slate-300 hover:bg-slate-50
      focus:ring-slate-500/30
    `,
    ghost: `
      text-slate-600 bg-transparent
      hover:text-slate-900 hover:bg-slate-100
      focus:ring-slate-500/30
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus:ring-red-500/50
      shadow-sm
    `,
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
});

Button.displayName = 'Button';
