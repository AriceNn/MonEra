import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';

/**
 * Storage Adapter Interface
 * 
 * This interface defines a common contract for different storage backends.
 * Implementations: IndexedDBAdapter, LocalStorageAdapter
 * 
 * Benefits:
 * - Easy to switch between storage backends
 * - Testable with mock adapters
 * - Backward compatible with localStorage
 */
export interface StorageAdapter {
  // ============================================
  // TRANSACTIONS
  // ============================================
  
  /**
   * Add a new transaction
   */
  addTransaction(transaction: Transaction): Promise<void>;
  
  /**
   * Update an existing transaction
   */
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<void>;
  
  /**
   * Delete a transaction by ID
   */
  deleteTransaction(id: string): Promise<void>;
  
  /**
   * Get a single transaction by ID
   */
  getTransaction(id: string): Promise<Transaction | undefined>;
  
  /**
   * Get all transactions
   */
  getAllTransactions(): Promise<Transaction[]>;
  
  /**
   * Get transactions by date range (inclusive)
   */
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;
  
  /**
   * Get transactions by category
   */
  getTransactionsByCategory(category: string): Promise<Transaction[]>;
  
  /**
   * Get transactions by type
   */
  getTransactionsByType(type: 'income' | 'expense' | 'savings' | 'withdrawal'): Promise<Transaction[]>;
  
  /**
   * Get transactions by category and type
   */
  getTransactionsByCategoryAndType(
    category: string, 
    type: 'income' | 'expense' | 'savings' | 'withdrawal'
  ): Promise<Transaction[]>;
  
  /**
   * Get transactions for a specific month and year
   */
  getTransactionsByMonth(month: number, year: number): Promise<Transaction[]>;

  // ============================================
  // BUDGETS
  // ============================================
  
  /**
   * Add a new budget
   */
  addBudget(budget: CategoryBudget): Promise<void>;
  
  /**
   * Update an existing budget
   */
  updateBudget(id: string, updates: Partial<CategoryBudget>): Promise<void>;
  
  /**
   * Delete a budget by ID
   */
  deleteBudget(id: string): Promise<void>;
  
  /**
   * Get a single budget by ID
   */
  getBudget(id: string): Promise<CategoryBudget | undefined>;
  
  /**
   * Get all budgets
   */
  getAllBudgets(): Promise<CategoryBudget[]>;
  
  /**
   * Get all active budgets
   */
  getActiveBudgets(): Promise<CategoryBudget[]>;
  
  /**
   * Get budget by category
   */
  getBudgetByCategory(category: string): Promise<CategoryBudget | undefined>;

  // ============================================
  // RECURRING TRANSACTIONS
  // ============================================
  
  /**
   * Add a new recurring transaction
   */
  addRecurring(recurring: RecurringTransaction): Promise<void>;
  
  /**
   * Update an existing recurring transaction
   */
  updateRecurring(id: string, updates: Partial<RecurringTransaction>): Promise<void>;
  
  /**
   * Delete a recurring transaction by ID
   */
  deleteRecurring(id: string): Promise<void>;
  
  /**
   * Get a single recurring transaction by ID
   */
  getRecurring(id: string): Promise<RecurringTransaction | undefined>;
  
  /**
   * Get all recurring transactions
   */
  getAllRecurring(): Promise<RecurringTransaction[]>;
  
  /**
   * Get all active recurring transactions
   */
  getActiveRecurring(): Promise<RecurringTransaction[]>;
  
  /**
   * Get recurring transactions that need generation (nextDate <= today)
   */
  getPendingRecurring(): Promise<RecurringTransaction[]>;

  // ============================================
  // SETTINGS
  // ============================================
  
  /**
   * Get application settings
   */
  getSettings(): Promise<AppSettings>;
  
  /**
   * Update application settings
   */
  updateSettings(updates: Partial<AppSettings>): Promise<void>;
  
  /**
   * Reset settings to defaults
   */
  resetSettings(): Promise<void>;

  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  /**
   * Export all data from storage
   */
  exportAll(): Promise<{
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTransaction[];
    settings: AppSettings;
  }>;
  
  /**
   * Import all data into storage (replaces existing data)
   */
  importAll(data: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTransaction[];
    settings: AppSettings;
  }): Promise<void>;
  
  /**
   * Clear all data from storage
   */
  clearAll(): Promise<void>;
  
  /**
   * Get storage statistics
   */
  getStats(): Promise<{
    transactions: number;
    budgets: number;
    recurring: number;
    hasSettings: boolean;
  }>;
}

/**
 * Storage Adapter Factory
 * Helper to create the appropriate storage adapter
 */
export type StorageAdapterType = 'indexeddb' | 'localstorage';

export interface StorageAdapterFactory {
  create(type: StorageAdapterType): StorageAdapter;
}
