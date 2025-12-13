/**
 * Simple exchange rate converter
 * Uses fixed rates (can be extended to use real API)
 * Base: USD = 1.0
 */

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  TRY: 32.5, // Approximate; should be updated via API
};

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code (USD, TRY, EUR, GBP)
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency || amount === 0) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Unknown currency: ${!fromRate ? fromCurrency : toCurrency}`);
    return amount;
  }

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Exchange rate
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];

  if (!fromRate || !toRate) {
    return 1;
  }

  return toRate / fromRate;
}

/**
 * Update exchange rates (for future API integration)
 * @param rates - New exchange rates object
 */
export function updateExchangeRates(rates: Record<string, number>): void {
  Object.assign(EXCHANGE_RATES, rates);
  try {
    const payload = { rates: EXCHANGE_RATES, updatedAt: new Date().toISOString() };
    window.localStorage.setItem('monera_exchange_rates', JSON.stringify(payload));
  } catch (e) {
    console.warn('[exchange] Failed to persist rates', e);
  }
}

/**
 * Get current rates
 */
export function getExchangeRates(): Record<string, number> {
  return { ...EXCHANGE_RATES };
}

/**
 * Fetch latest exchange rates from exchangerate-api.com (free tier, no API key for basic usage)
 * @param base - Base currency for rates (default: USD)
 */
export async function fetchLatestRates(base: string = 'USD'): Promise<Record<string, number>> {
  try {
    // Using exchangerate-api.com which is more reliable and doesn't require API key for basic usage
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.rates) throw new Error('Invalid response');
    
    // Extract rates for currencies we support
    const rates: Record<string, number> = {
      USD: data.rates.USD || 1,
      EUR: data.rates.EUR || 0.92,
      GBP: data.rates.GBP || 0.79,
      TRY: data.rates.TRY || 32.5,
    };
    rates[base] = 1.0; // ensure base is normalized
    // Update local cache
    updateExchangeRates(rates);
    return rates;
  } catch (error) {
    console.error('[exchange] Failed to fetch latest rates:', error);
    // Return current cached/static rates
    return getExchangeRates();
  }
}

/**
 * Load exchange rates from localStorage (if present)
 */
export function loadPersistedRates(): { rates: Record<string, number>; updatedAt?: string } | null {
  try {
    const raw = window.localStorage.getItem('monera_exchange_rates');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rates) return null;
    updateExchangeRates(parsed.rates);
    return parsed;
  } catch {
    return null;
  }
}
