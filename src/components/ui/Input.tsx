import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const inputStyles = `
    w-full h-10
    bg-white
    border rounded-md
    text-sm text-charcoal-800
    placeholder:text-charcoal-400
    transition-all duration-150
    ${icon && iconPosition === 'left' ? 'pl-10' : 'pl-3'}
    ${icon && iconPosition === 'right' ? 'pr-10' : 'pr-3'}
    ${error
      ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
      : 'border-charcoal-200 hover:border-charcoal-300 focus:border-rocket-500 focus:ring-2 focus:ring-rocket-500/20'
    }
    focus:outline-none
    disabled:bg-charcoal-50 disabled:text-charcoal-400 disabled:cursor-not-allowed
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          className={`${inputStyles} ${className}`}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400">
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-charcoal-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
    hint?: string;
  }
>(({ label, error, hint, className = '', ...props }, ref) => {
  const textareaStyles = `
    w-full min-h-[100px]
    px-3 py-2.5
    bg-white
    border rounded-md
    text-sm text-charcoal-800
    placeholder:text-charcoal-400
    transition-all duration-150
    resize-y
    ${error
      ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
      : 'border-charcoal-200 hover:border-charcoal-300 focus:border-rocket-500 focus:ring-2 focus:ring-rocket-500/20'
    }
    focus:outline-none
    disabled:bg-charcoal-50 disabled:text-charcoal-400 disabled:cursor-not-allowed
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`${textareaStyles} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-charcoal-500">{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    error?: string;
  }
>(({ label, error, className = '', children, ...props }, ref) => {
  const selectStyles = `
    w-full h-10
    px-3 pr-10
    bg-white
    border rounded-md
    text-sm text-charcoal-800
    transition-all duration-150
    appearance-none
    bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]
    bg-[position:right_0.5rem_center]
    bg-[size:1.5em_1.5em]
    bg-no-repeat
    ${error
      ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
      : 'border-charcoal-200 hover:border-charcoal-300 focus:border-rocket-500 focus:ring-2 focus:ring-rocket-500/20'
    }
    focus:outline-none
    disabled:bg-charcoal-50 disabled:text-charcoal-400 disabled:cursor-not-allowed
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {label}
        </label>
      )}
      <select ref={ref} className={`${selectStyles} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
