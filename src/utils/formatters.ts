import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';
type Language = 'tr' | 'en';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Format currency amount
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param language - Language for formatting
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'TRY',
  language: Language = 'tr'
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Format date to readable string
 * @param date - Date string (ISO format)
 * @param language - Language for formatting
 */
export function formatDate(date: string, language: Language = 'tr'): string {
  try {
    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
    const locale = language === 'tr' ? tr : undefined;
    return format(dateObj, 'dd MMMM yyyy', { locale });
  } catch {
    return date;
  }
}

/**
 * Format date to short format (DD/MM/YYYY or MM/DD/YYYY)
 */
export function formatDateShort(date: string, language: Language = 'tr'): string {
  try {
    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
    const formatStr = language === 'tr' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    return format(dateObj, formatStr);
  } catch {
    return date;
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffix
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }

  return value.toFixed(decimals);
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

/**
 * Convert Date object to ISO string (YYYY-MM-DD)
 */
export function dateToISOString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
