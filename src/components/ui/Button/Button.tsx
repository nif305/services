import React from 'react';
import { cn } from '@/lib/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, type = 'button', loading = false, disabled, ...props }, ref) => {
    const base =
      'inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 font-medium leading-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#016564]/12 active:scale-[0.99]';

    const variants = {
      primary: 'bg-primary text-white shadow-sm hover:bg-primary-600',
      secondary: 'bg-gold text-primary-900 hover:brightness-95',
      ghost: 'border border-gray-200 bg-transparent text-primary hover:bg-surface',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
      sm: 'min-h-[40px] px-3 py-2 text-sm sm:min-h-[42px]',
      md: 'min-h-[44px] px-4 py-2.5 text-sm',
      lg: 'min-h-[48px] px-5 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <span className="min-w-0 truncate">{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
