import Dexie, { type Table } from 'dexie';
import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';

/**
 * FinTrack IndexedDB Schema
 * 
 * Database: FinTrackDB
 * Version: 1
 * 
 * Tables:
 * - transactions: All financial transactions
 * - budgets: Category budget limits
 * - recurring: Recurring transaction templates
 * - settings: Application settings
 */
export class MonEraDB extends Dexie {
  // Table declarations
  transactions!: Table<Transaction, string>;
  budgets!: Table<CategoryBudget, string>;
  recurring!: Table<RecurringTransaction, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('MonEraDB');
    
    /**
     * Version 1: Initial schema
     * 
     * Index Strategy:
     * - Primary indexes: id (unique identifier for each table)
     * - Compound indexes for common query patterns:
     *   - [date+type]: Fast filtering by date range and transaction type
     *   - [category+type]: Category-based reports grouped by type
     *   - [date+category]: Date range reports per category
     *   - [category+isActive]: Active budgets per category
     *   - [isActive+nextDate]: Upcoming recurring transactions
     */
    this.version(1).stores({
      // Transactions table
      // Primary key: id
      // Indexes: date, type, category, amount, and compound indexes
      transactions: 'id, date, type, category, amount, [date+type], [category+type], [date+category]',
      
      // Budgets table
      // Primary key: id
      // Indexes: category, isActive, and compound index for active budgets per category
      budgets: 'id, category, isActive, [category+isActive]',
      
      // Recurring transactions table
      // Primary key: id
      // Indexes: frequency, isActive, nextOccurrence, lastGenerated, and compound indexes for queries
      recurring: 'id, frequency, isActive, nextOccurrence, lastGenerated, startDate, [isActive+nextOccurrence]',
      
      // Settings table
      // Primary key: id (always 'default')
      settings: 'id'
    });
  }
}

/**
 * Global database instance
 * Use this instance throughout the app
 */
export const db = new MonEraDB();

/**
 * Database utility functions
 */

/**
 * Clear all data from the database (for testing or reset)
 */
export async function clearDatabase(): Promise<void> {
  await db.transactions.clear();
  await db.budgets.clear();
  await db.recurring.clear();
  await db.settings.clear();
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  transactions: number;
  budgets: number;
  recurring: number;
  hasSettings: boolean;
  databaseSize?: number;
}> {
  const [transactionCount, budgetCount, recurringCount, settingsCount] = await Promise.all([
    db.transactions.count(),
    db.budgets.count(),
    db.recurring.count(),
    db.settings.count()
  ]);

  return {
    transactions: transactionCount,
    budgets: budgetCount,
    recurring: recurringCount,
    hasSettings: settingsCount > 0,
  };
}

/**
 * Check if database is initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const stats = await getDatabaseStats();
    return stats.transactions > 0 || stats.budgets > 0 || stats.recurring > 0 || stats.hasSettings;
  } catch (error) {
    console.error('[DB] Error checking initialization:', error);
    return false;
  }
}

/**
 * Export all data from database (for backup)
 */
export async function exportDatabaseData(): Promise<{
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurring: RecurringTransaction[];
  settings: AppSettings | null;
  exportedAt: string;
  version: string;
}> {
  const [transactions, budgets, recurring, settingsArray] = await Promise.all([
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurring.toArray(),
    db.settings.toArray()
  ]);

  return {
    transactions,
    budgets,
    recurring,
    settings: settingsArray[0] || null,
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };
}

/**
 * Import data into database (bulk operation)
 */
export async function importDatabaseData(data: {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurring: RecurringTransaction[];
  settings: AppSettings;
}): Promise<void> {
  // Clear existing data
  await clearDatabase();
  
  // Bulk insert
  await Promise.all([
    db.transactions.bulkAdd(data.transactions),
    db.budgets.bulkAdd(data.budgets),
    db.recurring.bulkAdd(data.recurring),
    db.settings.add({ ...data.settings, id: 'default' })
  ]);
}
