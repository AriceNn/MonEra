import type { RecurringFrequency } from '../types';

/**
 * Calculate the next occurrence date for a recurring transaction
 * @param startDate - The start date (YYYY-MM-DD)
 * @param frequency - How often the transaction repeats
 * @param lastGenerated - Optional last generated date
 * @returns Next occurrence date (YYYY-MM-DD)
 */
export function calculateNextOccurrence(
  startDate: string,
  frequency: RecurringFrequency,
  lastGenerated?: string
): string {
  // Use last generated date if available, otherwise use start date
  const baseDate = new Date(lastGenerated || startDate);
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  // Format as YYYY-MM-DD
  return nextDate.toISOString().split('T')[0];
}

/**
 * Check if a recurring transaction is due (should generate a transaction)
 * @param nextOccurrence - The next scheduled date
 * @param endDate - Optional end date
 * @param isActive - Is the recurring transaction active
 * @returns true if a transaction should be generated
 */
export function isRecurringDue(
  nextOccurrence: string,
  endDate?: string,
  isActive: boolean = true
): boolean {
  if (!isActive) return false;

  const today = new Date().toISOString().split('T')[0];
  const next = nextOccurrence;

  // Check if next occurrence is today or earlier
  if (next > today) return false;

  // Check if end date has passed
  if (endDate && endDate < today) return false;

  return true;
}

/**
 * Get all pending dates between lastGenerated and today
 * Useful for catching up missed recurring transactions
 * @param startDate - Start date
 * @param frequency - Frequency
 * @param lastGenerated - Last generated date
 * @param endDate - Optional end date
 * @returns Array of dates that should have been generated
 */
export function getPendingOccurrences(
  startDate: string,
  frequency: RecurringFrequency,
  lastGenerated?: string,
  endDate?: string
): string[] {
  const dates: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  let currentDate = lastGenerated || startDate;

  while (true) {
    const nextDate = calculateNextOccurrence(startDate, frequency, currentDate);
    
    // Stop if next date is in the future
    if (nextDate > today) break;
    
    // Stop if end date has passed
    if (endDate && nextDate > endDate) break;

    dates.push(nextDate);
    currentDate = nextDate;

    // Safety: max 1000 occurrences
    if (dates.length >= 1000) break;
  }

  return dates;
}
