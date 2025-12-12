import type { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  options,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full px-3 py-2 border rounded-lg',
          'border-slate-300 dark:border-slate-700',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'hover:border-indigo-300 dark:hover:border-slate-600',
          'hover:bg-slate-50 dark:hover:bg-slate-800/70',
          'transition-all duration-200',
          error && 'border-rose-500 focus:ring-rose-500',
          'disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50',
          'appearance-none cursor-pointer',
          'bg-[url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23475569%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%3e%3c/polyline%3e%3c/svg%3e")]',
          'dark:bg-[url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23cbd5e1%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%3e%3c/polyline%3e%3c/svg%3e")]',
          'bg-no-repeat bg-right',
          'pr-10',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
