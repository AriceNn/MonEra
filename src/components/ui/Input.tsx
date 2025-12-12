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
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full h-12 px-4 py-3 border rounded-xl',
          'border-slate-700 dark:border-slate-700',
          'bg-slate-800/50 dark:bg-slate-800/50',
          'text-white dark:text-white text-base',
          'placeholder-slate-500 dark:placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-slate-800',
          'transition-all duration-300 ease-out',
          'shadow-inner hover:shadow-lg hover:border-slate-600 dark:hover:border-slate-600',
          'hover:bg-slate-800/70',
          error && 'border-rose-500/70 focus:ring-rose-500/50 focus:border-rose-500 bg-rose-500/5',
          'disabled:bg-slate-900/50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed disabled:opacity-40',
          'backdrop-blur-sm',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-2 text-xs text-rose-400 font-medium flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-rose-400 rounded-full"></span>
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
