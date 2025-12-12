import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { CATEGORY_EMOJIS } from '../../utils/constants';
import { translateCategory } from '../../utils/i18n';

interface BadgeProps {
  category: string;
  variant?: 'income' | 'expense' | 'savings' | 'neutral';
  size?: 'sm' | 'md';
  children?: ReactNode;
  language?: 'tr' | 'en';
}

const variantStyles = {
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  expense: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  savings: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs font-medium rounded-md',
  md: 'px-3 py-1.5 text-sm font-medium rounded-lg',
};

export function Badge({ category, variant = 'neutral', size = 'md', children, language = 'en' }: BadgeProps) {
  const emoji = CATEGORY_EMOJIS[category];
  const translatedCategory = language ? translateCategory(category, language) : category;

  return (
    <span className={clsx(variantStyles[variant], sizeStyles[size], 'inline-flex items-center gap-1.5')}>
      {emoji && <span>{emoji}</span>}
      {children || translatedCategory}
    </span>
  );
}
