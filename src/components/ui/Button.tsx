import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  outline: 'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm font-medium rounded-lg',
  md: 'px-4 py-2 text-base font-medium rounded-lg',
  lg: 'px-6 py-3 text-lg font-medium rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {isLoading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
