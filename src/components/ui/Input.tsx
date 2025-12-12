import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-3 py-2 border rounded-lg',
          'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'transition-all duration-200',
          error && 'border-rose-500 focus:ring-rose-500',
          'disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
