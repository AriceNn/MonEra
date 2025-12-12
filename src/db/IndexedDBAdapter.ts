import type { StorageAdapter } from './StorageAdapter';
import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';
import { db } from './schema';
import { DEFAULT_SETTINGS } from '../types';

/**
 * IndexedDB Storage Adapter
 * 
 * Uses Dexie.js for IndexedDB operations
 * Benefits:
 * - 50MB+ storage capacity
 * - Fast indexed queries
 * - Complex filtering support
 * - Transaction support
 * - Offline-first
 */
export class IndexedDBAdapter implements StorageAdapter {
  // ============================================
  // TRANSACTIONS
  // ============================================

  async addTransaction(transaction: Transaction): Promise<void> {
    await db.transactions.add(transaction);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, updates);
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.transactions.toArray();
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    // Uses indexed 'date' field for fast range queries
    return await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    // Uses indexed 'category' field
    return await db.transactions
      .where('category')
      .equals(category)
      .toArray();
  }

  async getTransactionsByType(type: 'income' | 'expense' | 'savings' | 'withdrawal'): Promise<Transaction[]> {
    // Uses indexed 'type' field
    return await db.transactions
      .where('type')
      .equals(type)
      .toArray();
  }

  async getTransactionsByCategoryAndType(
    category: string,
    type: 'income' | 'expense' | 'savings' | 'withdrawal'
  ): Promise<Transaction[]> {
    // Uses compound index [category+type] for ultra-fast queries
    return await db.transactions
      .where('[category+type]')
      .equals([category, type])
      .toArray();
  }

  async getTransactionsByMonth(month: number, year: number): Promise<Transaction[]> {
    // Calculate date range for the month
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    
    return await this.getTransactionsByDateRange(startDate, endDate);
  }

  // ============================================
  // BUDGETS
  // ============================================

  async addBudget(budget: CategoryBudget): Promise<void> {
    await db.budgets.add(budget);
  }

  async updateBudget(id: string, updates: Partial<CategoryBudget>): Promise<void> {
    await db.budgets.update(id, updates);
  }

  async deleteBudget(id: string): Promise<void> {
    await db.budgets.delete(id);
  }

  async getBudget(id: string): Promise<CategoryBudget | undefined> {
    return await db.budgets.get(id);
  }

  async getAllBudgets(): Promise<CategoryBudget[]> {
    return await db.budgets.toArray();
  }

  async getActiveBudgets(): Promise<CategoryBudget[]> {
    // Uses indexed 'isActive' field
    return await db.budgets
      .where('isActive')
      .equals(1)
      .toArray();
  }

  async getBudgetByCategory(category: string): Promise<CategoryBudget | undefined> {
    // Uses indexed 'category' field
    return await db.budgets
      .where('category')
      .equals(category)
      .first();
  }

  // ============================================
  // RECURRING TRANSACTIONS
  // ============================================

  async addRecurring(recurring: RecurringTransaction): Promise<void> {
    await db.recurring.add(recurring);
  }

  async updateRecurring(id: string, updates: Partial<RecurringTransaction>): Promise<void> {
    await db.recurring.update(id, updates);
  }

  async deleteRecurring(id: string): Promise<void> {
    await db.recurring.delete(id);
  }

  async getRecurring(id: string): Promise<RecurringTransaction | undefined> {
    return await db.recurring.get(id);
  }

  async getAllRecurring(): Promise<RecurringTransaction[]> {
    return await db.recurring.toArray();
  }

  async getActiveRecurring(): Promise<RecurringTransaction[]> {
    // Uses indexed 'isActive' field
    return await db.recurring
      .where('isActive')
      .equals(1)
      .toArray();
  }

  async getPendingRecurring(): Promise<RecurringTransaction[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // Uses compound index [isActive+nextDate] for efficient filtering
    return await db.recurring
      .where('[isActive+nextDate]')
      .between([1, ''], [1, today], false, true)
      .toArray();
  }

  // ============================================
  // SETTINGS
  // ============================================

  async getSettings(): Promise<AppSettings> {
    const settings = await db.settings.get('default');
    
    if (!settings) {
      // Initialize with defaults if not exists
      const defaultSettings = { ...DEFAULT_SETTINGS, id: 'default' };
      await db.settings.add(defaultSettings);
      return DEFAULT_SETTINGS;
    }
    
    // Remove 'id' field before returning
    const { id, ...settingsWithoutId } = settings;
    return settingsWithoutId;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates, id: 'default' };
    await db.settings.put(updated);
  }

  async resetSettings(): Promise<void> {
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'default' });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async exportAll(): Promise<{
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTransaction[];
    settings: AppSettings;
  }> {
    const [transactions, budgets, recurring, settings] = await Promise.all([
      this.getAllTransactions(),
      this.getAllBudgets(),
      this.getAllRecurring(),
      this.getSettings()
    ]);

    return {
      transactions,
      budgets,
      recurring,
      settings
    };
  }

  async importAll(data: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTransaction[];
    settings: AppSettings;
  }): Promise<void> {
    // Clear existing data
    await this.clearAll();
    
    // Bulk insert - much faster than individual adds
    await Promise.all([
      db.transactions.bulkAdd(data.transactions),
      db.budgets.bulkAdd(data.budgets),
      db.recurring.bulkAdd(data.recurring),
      db.settings.add({ ...data.settings, id: 'default' })
    ]);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      db.transactions.clear(),
      db.budgets.clear(),
      db.recurring.clear(),
      db.settings.clear()
    ]);
  }

  async getStats(): Promise<{
    transactions: number;
    budgets: number;
    recurring: number;
    hasSettings: boolean;
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
      hasSettings: settingsCount > 0
    };
  }
}
