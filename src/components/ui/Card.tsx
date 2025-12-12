import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4',
        'transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
