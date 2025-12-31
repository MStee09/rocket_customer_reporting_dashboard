# Phase 5: Visual Consistency Standards

## Overview
Standardize visual elements across the application for a cohesive, polished feel.

## Standards Being Applied
- Border radius: `rounded-xl` (12px) for all cards and modals
- Card padding: `p-6` (24px) standard
- Grid gaps: `gap-4` (16px) standard
- Button heights: `h-8` small, `h-10` regular, `h-12` large
- Icon sizes: `w-4 h-4` in buttons, `w-5 h-5` in headers
- Primary action: `rocket-600` everywhere

---

## File 1: `src/components/ui/Card.tsx`

**Replace the entire file with:**

```tsx
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
```

---

## File 2: `src/components/ui/Button.tsx`

**Replace the entire file with:**

```tsx
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
```

---

## File 3: `src/components/ui/Modal.tsx`

**Replace the entire file with:**

```tsx
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={modalRef}
        className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col animate-scale-in`}
        role="dialog"
        aria-modal="true"
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl ml-auto transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
```

---

## File 4: `src/index.css`

**Replace the entire file with:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: Inter, system-ui, sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer components {
  .text-display {
    @apply text-3xl font-bold tracking-tight text-slate-900;
  }
  .text-title {
    @apply text-xl font-semibold text-slate-800;
  }
  .text-subtitle {
    @apply text-lg font-medium text-slate-700;
  }
  .text-body {
    @apply text-sm text-slate-600;
  }
  .text-caption {
    @apply text-xs text-slate-500;
  }
  .text-metric {
    @apply text-4xl font-bold tabular-nums text-slate-900;
  }

  .text-gradient {
    @apply bg-rocket-gradient bg-clip-text text-transparent;
  }
}

@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  .transition-base {
    @apply transition-all duration-150 ease-out;
  }

  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-rocket-500/30 focus:ring-offset-2;
  }
}

/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.15s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.2s ease-out;
}

/* Grid placeholder for drag and drop */
.react-grid-item.react-grid-placeholder {
  background: rgb(249 115 22 / 0.15);
  border: 2px dashed rgb(249 115 22 / 0.5);
  border-radius: 0.75rem;
  opacity: 1;
  transition-duration: 100ms;
  z-index: 2;
}

.react-grid-item > .react-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

.react-grid-item > .react-resizable-handle::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 5px;
  height: 5px;
  border-right: 2px solid rgb(148 163 184);
  border-bottom: 2px solid rgb(148 163 184);
}

.react-grid-item.react-dragging {
  transition: none;
  z-index: 100;
  will-change: transform;
  cursor: grabbing !important;
}
```

---

## File 5: `tailwind.config.js`

**Replace border radius section with standardized values:**

Find the `borderRadius` section and replace with:

```js
borderRadius: {
  'none': '0',
  'sm': '0.25rem',    // 4px
  'DEFAULT': '0.5rem', // 8px
  'md': '0.5rem',      // 8px
  'lg': '0.75rem',     // 12px
  'xl': '0.75rem',     // 12px - our standard
  '2xl': '1rem',       // 16px
  '3xl': '1.5rem',     // 24px
  'full': '9999px',
},
```

---

## Testing Checklist

After applying these changes:

1. [ ] All cards use consistent rounded-xl corners
2. [ ] Buttons have consistent heights (h-8, h-10, h-12)
3. [ ] All modals have rounded-xl corners
4. [ ] Primary buttons are rocket-600 color
5. [ ] Card padding is consistent (p-6 standard)
6. [ ] Animations are smooth and consistent
7. [ ] No visual regressions in existing components

---

## Notes

- Removed the `gradient-border` variant from Card (unused)
- Simplified color references from `charcoal-*` to `slate-*` for consistency
- All rounded corners now use `rounded-xl` as the standard
- Removed redundant animation keyframes
