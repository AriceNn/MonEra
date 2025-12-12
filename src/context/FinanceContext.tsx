import { createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_APP_SETTINGS } from '../utils/constants';
import { calculateCashBalance } from '../utils/calculations';

export interface FinanceContextType {
  transactions: Transaction[];
  settings: AppSettings;
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => boolean;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => boolean;
  
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
}

export function FinanceProvider({ children }: FinanceProviderProps) {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    []
  );

  const [settings, setSettings] = useLocalStorage<AppSettings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_APP_SETTINGS
  );

  // Summary is calculated in App component for correct month/year context

  // Transaction actions
  const addTransaction = useCallback(
    (transaction: Omit<Transaction, 'id'>) => {
      let added = false;
      setTransactions((prev) => {
        if (transaction.type === 'savings') {
          const cashBalance = calculateCashBalance(prev);
          if (transaction.amount > cashBalance) {
            return prev;
          }
        }

        const newTransaction: Transaction = {
          ...transaction,
          id: uuidv4(),
        };
        added = true;
        return [newTransaction, ...prev];
      });
      return added;
    },
    [setTransactions, settings.language]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [setTransactions]
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
  }, [setTransactions, setSettings]);

  const value: FinanceContextType = {
    transactions,
    settings,
    addTransaction,
    deleteTransaction,
    updateTransaction,
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
