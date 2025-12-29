import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
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
    font-semibold
    rounded-md
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
      bg-charcoal-800 text-white
      hover:bg-charcoal-900
      focus:ring-charcoal-500/50
      shadow-sm hover:shadow-md
    `,

    outline: `
      border-2 border-charcoal-200
      text-charcoal-700 bg-white
      hover:border-charcoal-300 hover:bg-charcoal-50
      focus:ring-charcoal-500/30
    `,

    ghost: `
      text-charcoal-600 bg-transparent
      hover:text-charcoal-900 hover:bg-charcoal-100
      focus:ring-charcoal-500/30
    `,

    danger: `
      bg-danger text-white
      hover:bg-danger-dark
      focus:ring-danger/50
      shadow-sm
    `,

    gradient: `
      bg-rocket-gradient text-white font-bold
      hover:shadow-lg hover:shadow-rocket-500/25
      focus:ring-rocket-500/50
      shadow-md
      bg-[length:200%_200%] hover:bg-right
      transition-all duration-300
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
