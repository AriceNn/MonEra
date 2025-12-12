import { createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, AppSettings, RecurringTransaction } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_APP_SETTINGS } from '../utils/constants';
import { calculateCashBalance } from '../utils/calculations';

export interface FinanceContextType {
  transactions: Transaction[];
  settings: AppSettings;
  recurringTransactions: RecurringTransaction[];
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => boolean;
  addBulkTransactions: (transactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode?: boolean) => boolean;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => boolean;
  
  // Recurring transaction actions (P2)
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, 'id'>) => string;
  updateRecurringTransaction: (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>) => boolean;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringActive: (id: string) => void;
  generateRecurringTransactions: () => number;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // Data management
  exportData: () => string;
  importData: (data: string) => boolean;
  clearAll: () => void;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

interface FinanceProviderProps {
  children: ReactNode;
  exchangeRates?: Record<string, number>;
}

export function FinanceProvider({ children, exchangeRates = {} }: FinanceProviderProps) {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    []
  );

  const [settings, setSettings] = useLocalStorage<AppSettings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_APP_SETTINGS
  );

  const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>(
    'fintrack_recurring',
    []
  );

  // Track deleted transaction IDs to prevent re-import
  const [deletedIds, setDeletedIds] = useLocalStorage<Set<string>>(
    'fintrack_deleted_ids',
    new Set()
  );

  // Summary is calculated in App component for correct month/year context

  // Helper to convert amount to TRY
  const convertToTRY = useCallback((amount: number, currency: string): number => {
    if (currency === 'TRY' || !currency) return amount;
    
    const tryRate = exchangeRates['TRY'] || 1;
    const currencyRate = exchangeRates[currency];
    
    if (!currencyRate) return amount; // Fallback if rate not available
    
    // Convert: amount * (TRY_rate / currency_rate)
    return amount * (tryRate / currencyRate);
  }, [exchangeRates]);

  // Transaction actions
  const addTransaction = useCallback(
    (transaction: Omit<Transaction, 'id'>) => {
      // Pre-check for savings validation
      if (transaction.type === 'savings') {
        const cashBalanceInTRY = transactions.reduce((acc, t) => {
          const amountInTRY = convertToTRY(t.amount, (t as any).originalCurrency || 'TRY');
          if (t.type === 'income') return acc + amountInTRY;
          if (t.type === 'expense') return acc - amountInTRY;
          if (t.type === 'savings') return acc - amountInTRY;
          if (t.type === 'withdrawal') return acc + amountInTRY;
          return acc;
        }, 0);
        
        const savingsInTRY = convertToTRY(transaction.amount, transaction.originalCurrency);
        
        if (savingsInTRY > cashBalanceInTRY) {
          return false; // Insufficient balance
        }
      }

      // If validation passed, add the transaction
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
      };
      
      setTransactions((prev) => [newTransaction, ...prev]);
      return true;
    },
    [transactions, convertToTRY]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      // Track deleted ID to prevent re-import
      setDeletedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    },
    [setTransactions, setDeletedIds]
  );

  const addBulkTransactions = useCallback(
    (newTransactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode: boolean = false) => {
      // If replace mode, clear deletedIds as well since we're starting fresh
      if (replaceMode) {
        setDeletedIds(new Set());
      }
      
      setTransactions((prev) => {
        // If replace mode, clear all existing transactions first
        const baseTransactions = replaceMode ? [] : prev;
        
        // Build a simple dedup key from core fields
        const keyOf = (t: Omit<Transaction, 'id'> | Transaction) =>
          `${(t.title || '').trim().toLowerCase()}|${t.amount}|${(t.category || '').trim().toLowerCase()}|${t.date}|${t.type}|${(t as any).originalCurrency || 'TRY'}`;

        // Track both existing keys (content-based) and IDs from CURRENT state only
        // This ensures we only check against what's actually in the current state
        // If user deleted something, it won't be in 'prev' anymore
        const existingKeys = new Set(baseTransactions.map((p) => keyOf(p)));
        const existingIds = new Set(baseTransactions.map((p) => p.id));

        // Filter out duplicates by ID (existing OR deleted), then by content key
        const dedupedIncoming = newTransactions.filter((t) => {
          // In replace mode, don't check deletedIds since we cleared it
          if (!replaceMode && t.id && deletedIds.has(t.id)) {
            return false;
          }
          // If transaction has an ID and it already exists, skip it
          if (t.id && existingIds.has(t.id)) {
            return false;
          }
          // Otherwise check by content key
          if (existingKeys.has(keyOf(t))) {
            return false;
          }
          return true;
        });

        // Use existing ID if available, otherwise generate new one
        const withIds = dedupedIncoming.map((t) => ({
          ...t,
          id: t.id || uuidv4(),
        }));

        return [...withIds, ...baseTransactions];
      });
      return true;
    },
    [deletedIds, setDeletedIds]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
      let updated = false;
      setTransactions((prev) => {
        const index = prev.findIndex((t) => t.id === id);
        if (index === -1) return prev;

        const updatedTransaction: Transaction = { ...prev[index], ...updates };
        const next = [...prev];
        next[index] = updatedTransaction;

        if (updatedTransaction.type === 'savings') {
          const cashAfterUpdate = calculateCashBalance(next);
          if (cashAfterUpdate < 0) {
            return prev;
          }
        }

        updated = true;
        return next;
      });
      return updated;
    },
    [setTransactions]
  );

  // Settings actions
  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [setSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, [setSettings]);

  // Data management
  const exportData = useCallback(() => {
    return JSON.stringify(
      { transactions, settings },
      null,
      2
    );
  }, [transactions, settings]);

  const importData = useCallback(
    (data: string): boolean => {
      try {
        const parsed = JSON.parse(data);
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
          return false;
        }
        setTransactions(parsed.transactions);
        if (parsed.settings) {
          setSettings(parsed.settings);
        }
        return true;
      } catch {
        return false;
      }
    },
    [setTransactions, setSettings]
  );

  const clearAll = useCallback(() => {
    setTransactions([]);
    setSettings(DEFAULT_APP_SETTINGS);
    setRecurringTransactions([]);
  }, [setTransactions, setSettings, setRecurringTransactions]);

  // Recurring Transaction actions (P2)
  const addRecurringTransaction = useCallback(
    (recurring: Omit<RecurringTransaction, 'id'>): string => {
      const newRecurring: RecurringTransaction = {
        ...recurring,
        id: uuidv4(),
        isActive: true,
      };
      setRecurringTransactions((prev) => [newRecurring, ...prev]);
      return newRecurring.id;
    },
    [setRecurringTransactions]
  );

  const updateRecurringTransaction = useCallback(
    (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>): boolean => {
      let updated = false;
      setRecurringTransactions((prev) => {
        const index = prev.findIndex((r) => r.id === id);
        if (index === -1) return prev;

        const updatedRecurring: RecurringTransaction = { ...prev[index], ...updates };
        const next = [...prev];
        next[index] = updatedRecurring;
        updated = true;
        return next;
      });
      return updated;
    },
    [setRecurringTransactions]
  );

  const deleteRecurringTransaction = useCallback(
    (id: string) => {
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
    },
    [setRecurringTransactions]
  );

  const toggleRecurringActive = useCallback(
    (id: string) => {
      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isActive: !r.isActive } : r
        )
      );
    },
    [setRecurringTransactions]
  );

  const generateRecurringTransactions = useCallback((): number => {
    let totalGeneratedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    recurringTransactions.forEach((recurring) => {
      if (!recurring.isActive) return;

      const startDate = new Date(recurring.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
      if (endDate) {
        endDate.setHours(0, 0, 0, 0);
      }

      // Start from the day after lastGenerated, or from startDate if never generated
      let currentDate = recurring.lastGenerated
        ? new Date(recurring.lastGenerated)
        : new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      // If we have lastGenerated, move to the next occurrence
      if (recurring.lastGenerated) {
        switch (recurring.frequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
      }

      // Generate all transactions from currentDate up to endDate (or indefinitely if no endDate)
      const transactionsToAdd: Transaction[] = [];
      
      while (endDate ? currentDate <= endDate : true) {
        // Create a snapshot of the current date
        const transactionDate = new Date(currentDate);
        const dateString = transactionDate.toISOString().split('T')[0];

        // Generate transaction
        const newTransaction: Transaction = {
          id: uuidv4(),
          title: recurring.title,
          amount: recurring.amount,
          category: recurring.category,
          type: recurring.type,
          date: dateString,
          originalCurrency: recurring.originalCurrency,
          isRecurring: true,
          recurringId: recurring.id,
          description: recurring.description,
        };

        transactionsToAdd.push(newTransaction);

        // Move to next occurrence
        switch (recurring.frequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }

        // Safety check: if no endDate, stop after generating reasonable amount
        if (!endDate && transactionsToAdd.length >= 120) {
          break; // Max 120 transactions (10 years for monthly)
        }
      }

      // Add all transactions at once, checking for duplicates
      if (transactionsToAdd.length > 0) {
        setTransactions((prev) => {
          const newTransactions = transactionsToAdd.filter(
            (newTx) => !prev.some(
              (t) => t.recurringId === newTx.recurringId && t.date === newTx.date
            )
          );
          totalGeneratedCount += newTransactions.length;
          if (newTransactions.length === 0) return prev;
          return [...newTransactions, ...prev];
        });

        // Update lastGenerated to the last transaction date generated
        if (transactionsToAdd.length > 0) {
          const lastTransaction = transactionsToAdd[transactionsToAdd.length - 1];
          updateRecurringTransaction(recurring.id, {
            lastGenerated: lastTransaction.date,
          });
        }
      }
    });

    return totalGeneratedCount;
  }, [recurringTransactions, setTransactions, updateRecurringTransaction]);

  const value: FinanceContextType = {
    transactions,
    settings,
    recurringTransactions,
    addTransaction,
    addBulkTransactions,
    deleteTransaction,
    updateTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringActive,
    generateRecurringTransactions,
    updateSettings,
    resetSettings,
    exportData,
    importData,
    clearAll,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}
