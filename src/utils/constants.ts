import type { AppSettings } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';

// Detect system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// Default application settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: 'TRY',
  language: 'tr',
  theme: getSystemTheme(),
  inflationRate: 30.0, // Annual inflation rate estimate for Turkey
  currencyPair: 'TRY-USD',
};

// LocalStorage keys
export const STORAGE_KEYS = {
  TRANSACTIONS: 'fintrack_transactions',
  SETTINGS: 'fintrack_settings',
  RECURRING: 'fintrack_recurring',
  BUDGETS: 'fintrack_budgets',
} as const;

// Colors for transactions
export const TRANSACTION_COLORS = {
  income: 'emerald',
  expense: 'rose',
} as const;

// Category to emoji mapping
export const CATEGORY_EMOJIS: Record<string, string> = {
  // Income
  'Salary': '💼',
  'Investment Return': '📈',
  'Bonus': '🎁',
  'Freelance': '💻',
  'Other Income': '💵',

  // Expense
  'Food': '🍔',
  'Transportation': '🚗',
  'Rent': '🏠',
  'Utilities': '⚡',
  'Healthcare': '🏥',
  'Education': '📚',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Other Expense': '❌',
};

// Months array for charts and selectors
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

// Supported currencies
export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;

// Supported languages
export const LANGUAGES = ['tr', 'en'] as const;

// Supported themes
export const THEMES = ['light', 'dark'] as const;

// All valid categories
export const ALL_CATEGORIES_ORDERED = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;
