import type { StorageAdapter } from './StorageAdapter';
import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * LocalStorage Storage Adapter
 * 
 * Fallback adapter using localStorage
 * Benefits:
 * - Simple synchronous API
 * - Works in all browsers
 * - Backward compatible
 * 
 * Limitations:
 * - 5-10MB storage limit
 * - No indexed queries (must filter in memory)
 * - Slower with large datasets
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly KEYS = {
    TRANSACTIONS: 'fintrack_transactions',
    BUDGETS: 'fintrack_budgets',
    RECURRING: 'fintrack_recurring',
    SETTINGS: 'fintrack_settings'
  };

  // ============================================
  // HELPER METHODS
  // ============================================

  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`[LocalStorage] Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[LocalStorage] Error saving ${key}:`, error);
      throw new Error(`Failed to save data to localStorage: ${error}`);
    }
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async addTransaction(transaction: Transaction): Promise<void> {
    const transactions = await this.getAllTransactions();
    transactions.push(transaction);
    this.saveToStorage(this.KEYS.TRANSACTIONS, transactions);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const transactions = await this.getAllTransactions();
    const index = transactions.findIndex(t => t.id === id);
    
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      this.saveToStorage(this.KEYS.TRANSACTIONS, transactions);
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    const transactions = await this.getAllTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    this.saveToStorage(this.KEYS.TRANSACTIONS, filtered);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const transactions = await this.getAllTransactions();
    return transactions.find(t => t.id === id);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return this.getFromStorage(this.KEYS.TRANSACTIONS, []);
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }

  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.category === category);
  }

  async getTransactionsByType(type: 'income' | 'expense' | 'savings' | 'withdrawal'): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.type === type);
  }

  async getTransactionsByCategoryAndType(
    category: string,
    type: 'income' | 'expense' | 'savings' | 'withdrawal'
  ): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => t.category === category && t.type === type);
  }

  async getTransactionsByMonth(month: number, year: number): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  // ============================================
  // BUDGETS
  // ============================================

  async addBudget(budget: CategoryBudget): Promise<void> {
    const budgets = await this.getAllBudgets();
    budgets.push(budget);
    this.saveToStorage(this.KEYS.BUDGETS, budgets);
  }

  async updateBudget(id: string, updates: Partial<CategoryBudget>): Promise<void> {
    const budgets = await this.getAllBudgets();
    const index = budgets.findIndex(b => b.id === id);
    
    if (index !== -1) {
      budgets[index] = { ...budgets[index], ...updates };
      this.saveToStorage(this.KEYS.BUDGETS, budgets);
    }
  }

  async deleteBudget(id: string): Promise<void> {
    const budgets = await this.getAllBudgets();
    const filtered = budgets.filter(b => b.id !== id);
    this.saveToStorage(this.KEYS.BUDGETS, filtered);
  }

  async getBudget(id: string): Promise<CategoryBudget | undefined> {
    const budgets = await this.getAllBudgets();
    return budgets.find(b => b.id === id);
  }

  async getAllBudgets(): Promise<CategoryBudget[]> {
    return this.getFromStorage(this.KEYS.BUDGETS, []);
  }

  async getActiveBudgets(): Promise<CategoryBudget[]> {
    const budgets = await this.getAllBudgets();
    return budgets.filter(b => b.isActive);
  }

  async getBudgetByCategory(category: string): Promise<CategoryBudget | undefined> {
    const budgets = await this.getAllBudgets();
    return budgets.find(b => b.category === category);
  }

  // ============================================
  // RECURRING TRANSACTIONS
  // ============================================

  async addRecurring(recurring: RecurringTransaction): Promise<void> {
    const recurrings = await this.getAllRecurring();
    recurrings.push(recurring);
    this.saveToStorage(this.KEYS.RECURRING, recurrings);
  }

  async updateRecurring(id: string, updates: Partial<RecurringTransaction>): Promise<void> {
    const recurrings = await this.getAllRecurring();
    const index = recurrings.findIndex(r => r.id === id);
    
    if (index !== -1) {
      recurrings[index] = { ...recurrings[index], ...updates };
      this.saveToStorage(this.KEYS.RECURRING, recurrings);
    }
  }

  async deleteRecurring(id: string): Promise<void> {
    const recurrings = await this.getAllRecurring();
    const filtered = recurrings.filter(r => r.id !== id);
    this.saveToStorage(this.KEYS.RECURRING, filtered);
  }

  async getRecurring(id: string): Promise<RecurringTransaction | undefined> {
    const recurrings = await this.getAllRecurring();
    return recurrings.find(r => r.id === id);
  }

  async getAllRecurring(): Promise<RecurringTransaction[]> {
    return this.getFromStorage(this.KEYS.RECURRING, []);
  }

  async getActiveRecurring(): Promise<RecurringTransaction[]> {
    const recurrings = await this.getAllRecurring();
    return recurrings.filter(r => r.isActive);
  }

  async getPendingRecurring(): Promise<RecurringTransaction[]> {
    const today = new Date().toISOString().split('T')[0];
    const recurrings = await this.getAllRecurring();
    
    return recurrings.filter(r => {
      if (!r.isActive) return false;
      
      // Use lastGenerated to determine if transaction is due
      const lastDate = r.lastGenerated || r.startDate;
      
      // Check if enough time has passed based on frequency
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      
      switch (r.frequency) {
        case 'daily':
          return lastDateObj < todayObj;
        case 'weekly':
          const weekInMs = 7 * 24 * 60 * 60 * 1000;
          return todayObj.getTime() - lastDateObj.getTime() >= weekInMs;
        case 'monthly':
          return lastDateObj.getMonth() !== todayObj.getMonth() || 
                 lastDateObj.getFullYear() !== todayObj.getFullYear();
        case 'yearly':
          return lastDateObj.getFullYear() !== todayObj.getFullYear();
        default:
          return false;
      }
    });
  }

  // ============================================
  // SETTINGS
  // ============================================

  async getSettings(): Promise<AppSettings> {
    return this.getFromStorage(this.KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    this.saveToStorage(this.KEYS.SETTINGS, updated);
  }

  async resetSettings(): Promise<void> {
    this.saveToStorage(this.KEYS.SETTINGS, DEFAULT_SETTINGS);
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
    this.saveToStorage(this.KEYS.TRANSACTIONS, data.transactions);
    this.saveToStorage(this.KEYS.BUDGETS, data.budgets);
    this.saveToStorage(this.KEYS.RECURRING, data.recurring);
    this.saveToStorage(this.KEYS.SETTINGS, data.settings);
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(this.KEYS.TRANSACTIONS);
    localStorage.removeItem(this.KEYS.BUDGETS);
    localStorage.removeItem(this.KEYS.RECURRING);
    localStorage.removeItem(this.KEYS.SETTINGS);
  }

  async getStats(): Promise<{
    transactions: number;
    budgets: number;
    recurring: number;
    hasSettings: boolean;
  }> {
    const [transactions, budgets, recurring] = await Promise.all([
      this.getAllTransactions(),
      this.getAllBudgets(),
      this.getAllRecurring()
    ]);

    const hasSettings = localStorage.getItem(this.KEYS.SETTINGS) !== null;

    return {
      transactions: transactions.length,
      budgets: budgets.length,
      recurring: recurring.length,
      hasSettings
    };
  }
}
