import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, AppSettings, RecurringTransaction, CategoryBudget } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { DEFAULT_APP_SETTINGS } from '../utils/constants';
import { calculateCashBalance } from '../utils/calculations';
import type { StorageAdapter } from '../db/StorageAdapter';
import { getCurrentAdapter, autoMigrate, cleanupBackup } from '../db/migration';
import { IndexedDBAdapter } from '../db/IndexedDBAdapter';
import { NotificationManager, DEFAULT_NOTIFICATION_SETTINGS, type Notification, type NotificationSettings } from '../utils/notifications';
import { syncService, type SyncStatus, type SyncResult } from '../services/syncService';
import { useAuth } from './AuthContext';

export interface FinanceContextType {
  transactions: Transaction[];
  settings: AppSettings;
  recurringTransactions: RecurringTransaction[];
  budgets: CategoryBudget[];
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => boolean;
  addBulkTransactions: (transactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode?: boolean) => boolean;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => boolean;
  
  // Recurring transaction actions (P2 Sprint 1)
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, 'id'>) => string;
  updateRecurringTransaction: (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>) => boolean;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringActive: (id: string) => void;
  generateRecurringTransactions: () => number;
  
  // Budget actions (P2 Sprint 2)
  setBudget: (budget: Omit<CategoryBudget, 'id'>) => string;
  updateBudget: (id: string, updates: Partial<Omit<CategoryBudget, 'id'>>) => boolean;
  deleteBudget: (id: string) => void;
  toggleBudgetActive: (id: string) => void;
  getBudgetProgress: (category: string, month: number, year: number) => { spent: number; limit: number; percentage: number; exceeded: boolean } | null;
  checkBudgetExceeded: (category: string, month: number, year: number) => boolean;
  
  // Notification actions (P2 Sprint 5)
  notifications: Notification[];
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // Data management
  exportData: () => string;
  importData: (data: string) => boolean;
  clearAll: () => void;
  
  // Cloud sync actions (P3 Sprint 2)
  syncStatus: SyncStatus;
  syncNow: () => Promise<SyncResult>;
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

interface FinanceProviderProps {
  children: ReactNode;
  exchangeRates?: Record<string, number>;
}

export function FinanceProvider({ children, exchangeRates = {} }: FinanceProviderProps) {
  const { isAuthenticated, isCloudEnabled } = useAuth();
  
  // Storage adapter - will be IndexedDB after migration, localStorage as fallback
  const [adapter, setAdapter] = useState<StorageAdapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State management using React state (synced with storage adapter)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Notification system (P2 Sprint 5)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationManager] = useState(() => new NotificationManager(DEFAULT_NOTIFICATION_SETTINGS, settings.language));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Cloud sync state (P3 Sprint 2)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const stored = localStorage.getItem('monera-auto-sync');
    return stored ? JSON.parse(stored) : true;
  });

  // Load notification settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('monera_notification_settings');
      if (stored) {
        const loadedSettings = JSON.parse(stored);
        setNotificationSettings(loadedSettings);
        notificationManager.updateSettings(loadedSettings);
      }
    } catch (error) {
      console.error('[FinanceContext] Error loading notification settings:', error);
    }

    // Load existing notifications
    setNotifications(notificationManager.getNotifications());

    // Set up new notification callback
    notificationManager.setOnNewNotification(() => {
      setNotifications(notificationManager.getNotifications());
    });
  }, [notificationManager]);

  // Initialize storage adapter and auto-migrate
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        let storageAdapter: StorageAdapter;
        
        // If cloud sync is enabled, ALWAYS use IndexedDB
        if (isCloudEnabled) {
          console.log('[FinanceContext] Cloud sync enabled - using IndexedDB adapter');
          storageAdapter = new IndexedDBAdapter();
        } else {
          // Auto-migrate if needed
          const migrationResult = await autoMigrate();
          if (migrationResult) {
            // Migration successful
          }

          // Get current adapter (IndexedDB or localStorage)
          storageAdapter = await getCurrentAdapter();
        }
        
        if (!mounted) return;

        // Load all data from storage
        const [txs, bdgs, recur, sett] = await Promise.all([
          storageAdapter.getAllTransactions(),
          storageAdapter.getAllBudgets(),
          storageAdapter.getAllRecurring(),
          storageAdapter.getSettings()
        ]);

        if (!mounted) return;

        setTransactions(txs);
        setBudgets(bdgs);
        setRecurringTransactions(recur);
        
        // Detect system theme preference and use it if no theme was explicitly saved
        const systemTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        // Check if this is first load (no transactions, no budgets, default theme)
        const isFirstLoad = txs.length === 0 && bdgs.length === 0 && sett.theme === DEFAULT_APP_SETTINGS.theme;
        
        if (isFirstLoad) {
          // First time user - use system theme
          const settingsWithSystemTheme: AppSettings = { ...sett, theme: systemTheme };
          setSettings(settingsWithSystemTheme);
        } else {
          setSettings(sett);
        }
        
        setAdapter(storageAdapter);
        setIsLoading(false);

        // Cleanup old backups (30+ days)
        cleanupBackup();
      } catch (error) {
        console.error('[FinanceContext] Initialization error:', error);
        // Fallback to empty state if initialization fails
        if (!mounted) return;
        setIsLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

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
      if (!adapter) return false;

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
      
      // Update storage asynchronously
      adapter.addTransaction(newTransaction).catch(error => {
        console.error('[FinanceContext] Error adding transaction:', error);
      });
      
      // Update state immediately for UI responsiveness
      setTransactions((prev) => {
        const updated = [newTransaction, ...prev];
        
        // Check notifications (expense spike)
        if (newTransaction.type === 'expense') {
          notificationManager.checkExpenseSpike(prev, newTransaction);
        }
        
        // Check budget alerts if expense
        if (newTransaction.type === 'expense') {
          const today = new Date();
          const month = today.getMonth();
          const year = today.getFullYear();
          
          const categoryBudget = budgets.find(b => 
            b.category === newTransaction.category && b.isActive
          );
          
          if (categoryBudget) {
            const spent = updated
              .filter(t => {
                const date = new Date(t.date);
                return t.type === 'expense' && 
                       t.category === newTransaction.category &&
                       date.getMonth() === month &&
                       date.getFullYear() === year;
              })
              .reduce((sum, t) => sum + t.amount, 0);
            
            notificationManager.checkBudgetAlerts(categoryBudget, spent, month, year);
          }
        }
        
        // Check savings milestone
        if (newTransaction.type === 'savings') {
          const totalSavings = updated
            .filter(t => t.type === 'savings')
            .reduce((sum, t) => sum + t.amount, 0);
          notificationManager.checkSavingsMilestone(totalSavings);
        }
        
        return updated;
      });
      
      // Push to cloud if authenticated and auto-sync enabled
      if (isAuthenticated && isCloudEnabled && autoSync) {
        console.log('📤 [FinanceContext] Auto-sync enabled, pushing transaction to cloud...', {
          isAuthenticated,
          isCloudEnabled,
          autoSync,
          transactionId: newTransaction.id
        });
        syncService.pushTransaction(newTransaction).catch(error => {
          console.error('❌ [FinanceContext] Error syncing transaction:', error);
        });
      } else {
        console.log('⚠️ [FinanceContext] Auto-sync skipped:', { isAuthenticated, isCloudEnabled, autoSync });
      }
      
      return true;
    },
    [adapter, transactions, convertToTRY, budgets, notificationManager, isAuthenticated, isCloudEnabled, autoSync]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!adapter) return;

      // Update storage asynchronously
      adapter.deleteTransaction(id).catch(error => {
        console.error('[FinanceContext] Error deleting transaction:', error);
      });

      // Update state immediately
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      
      // Track deleted ID to prevent re-import
      setDeletedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      
      // Delete from cloud if authenticated
      if (isAuthenticated && isCloudEnabled && autoSync) {
        console.log('🗑️ [FinanceContext] Auto-sync enabled, deleting from cloud...', {
          isAuthenticated,
          isCloudEnabled,
          autoSync,
          transactionId: id
        });
        syncService.deleteTransaction(id).catch(error => {
          console.error('❌ [FinanceContext] Error syncing deletion:', error);
        });
      } else {
        console.log('⚠️ [FinanceContext] Delete sync skipped:', { isAuthenticated, isCloudEnabled, autoSync });
      }
    },
    [adapter, isAuthenticated, isCloudEnabled, autoSync]
  );

  const addBulkTransactions = useCallback(
    (newTransactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode: boolean = false) => {
      if (!adapter) return false;

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

        // Update storage asynchronously
        if (replaceMode) {
          adapter.clearAll().then(() => {
            return Promise.all(withIds.map(tx => adapter.addTransaction(tx)));
          }).catch(error => {
            console.error('[FinanceContext] Error in bulk replace:', error);
          });
        } else {
          Promise.all(withIds.map(tx => adapter.addTransaction(tx))).catch(error => {
            console.error('[FinanceContext] Error in bulk add:', error);
          });
        }

        return [...withIds, ...baseTransactions];
      });
      return true;
    },
    [adapter, deletedIds]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
      if (!adapter) return false;

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

        // Update storage asynchronously
        adapter.updateTransaction(id, updates).catch(error => {
          console.error('[FinanceContext] Error updating transaction:', error);
        });

        updated = true;
        return next;
      });
      return updated;
    },
    [adapter]
  );

  // Settings actions
  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      if (!adapter) return;

      // Update storage asynchronously
      adapter.updateSettings(newSettings).catch(error => {
        console.error('[FinanceContext] Error updating settings:', error);
      });

      // Update state immediately
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        
        // Update notification manager language if language changed
        if (newSettings.language && newSettings.language !== prev.language) {
          notificationManager.setLanguage(newSettings.language);
        }
        
        return updated;
      });
    },
    [adapter, notificationManager]
  );

  const resetSettings = useCallback(() => {
    if (!adapter) return;

    // Update storage asynchronously
    adapter.resetSettings().catch(error => {
      console.error('[FinanceContext] Error resetting settings:', error);
    });

    // Update state immediately
    setSettings(DEFAULT_SETTINGS);
  }, [adapter]);

  // Data management
  const exportData = useCallback(() => {
    return JSON.stringify(
      { transactions, budgets, recurringTransactions, settings },
      null,
      2
    );
  }, [transactions, budgets, recurringTransactions, settings]);

  const importData = useCallback(
    (data: string): boolean => {
      if (!adapter) return false;

      try {
        const parsed = JSON.parse(data);
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
          return false;
        }

        // Import to storage adapter
        adapter.importAll({
          transactions: parsed.transactions || [],
          budgets: parsed.budgets || [],
          recurring: parsed.recurringTransactions || [],
          settings: parsed.settings || DEFAULT_APP_SETTINGS
        }).catch(error => {
          console.error('[FinanceContext] Error importing data:', error);
        });

        // Update state immediately
        setTransactions(parsed.transactions);
        if (parsed.budgets) setBudgets(parsed.budgets);
        if (parsed.recurringTransactions) setRecurringTransactions(parsed.recurringTransactions);
        if (parsed.settings) setSettings(parsed.settings);
        
        return true;
      } catch {
        return false;
      }
    },
    [adapter]
  );

  const clearAll = useCallback(() => {
    if (!adapter) return;

    // Clear storage asynchronously
    adapter.clearAll().catch(error => {
      console.error('[FinanceContext] Error clearing data:', error);
    });

    // Clear state immediately
    setTransactions([]);
    setBudgets([]);
    setRecurringTransactions([]);
    setSettings(DEFAULT_APP_SETTINGS);
    setDeletedIds(new Set());
  }, [adapter]);

  // Recurring Transaction actions (P2)
  const addRecurringTransaction = useCallback(
    (recurring: Omit<RecurringTransaction, 'id'>): string => {
      if (!adapter) return '';

      const newRecurring: RecurringTransaction = {
        ...recurring,
        id: uuidv4(),
        isActive: true,
      };

      // Update storage asynchronously
      adapter.addRecurring(newRecurring).catch(error => {
        console.error('[FinanceContext] Error adding recurring:', error);
      });

      // Update state immediately
      setRecurringTransactions((prev) => [newRecurring, ...prev]);
      return newRecurring.id;
    },
    [adapter]
  );

  const updateRecurringTransaction = useCallback(
    (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>): boolean => {
      if (!adapter) return false;

      let updated = false;
      setRecurringTransactions((prev) => {
        const index = prev.findIndex((r) => r.id === id);
        if (index === -1) return prev;

        const updatedRecurring: RecurringTransaction = { ...prev[index], ...updates };
        const next = [...prev];
        next[index] = updatedRecurring;

        // Update storage asynchronously
        adapter.updateRecurring(id, updates).catch(error => {
          console.error('[FinanceContext] Error updating recurring:', error);
        });

        updated = true;
        return next;
      });
      return updated;
    },
    [adapter]
  );

  const deleteRecurringTransaction = useCallback(
    (id: string) => {
      if (!adapter) return;

      // Update storage asynchronously
      adapter.deleteRecurring(id).catch(error => {
        console.error('[FinanceContext] Error deleting recurring:', error);
      });

      // Update state immediately
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
    },
    [adapter]
  );

  const toggleRecurringActive = useCallback(
    (id: string) => {
      if (!adapter) return;

      setRecurringTransactions((prev) => {
        const updated = prev.map((r) => {
          if (r.id === id) {
            const toggled = { ...r, isActive: !r.isActive };
            
            // Update storage asynchronously
            adapter.updateRecurring(id, { isActive: toggled.isActive }).catch(error => {
              console.error('[FinanceContext] Error toggling recurring:', error);
            });
            
            return toggled;
          }
          return r;
        });
        return updated;
      });
    },
    [adapter]
  );

  const generateRecurringTransactions = useCallback((): number => {
    let totalGeneratedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for pending recurring transactions (notification)
    const pendingRecurring = recurringTransactions.filter(r => {
      if (!r.isActive) return false;
      const lastDate = r.lastGenerated || r.startDate;
      const lastDateObj = new Date(lastDate);
      
      switch (r.frequency) {
        case 'daily':
          return lastDateObj < today;
        case 'weekly':
          const weekInMs = 7 * 24 * 60 * 60 * 1000;
          return today.getTime() - lastDateObj.getTime() >= weekInMs;
        case 'monthly':
          return lastDateObj.getMonth() !== today.getMonth() || 
                 lastDateObj.getFullYear() !== today.getFullYear();
        case 'yearly':
          return lastDateObj.getFullYear() !== today.getFullYear();
        default:
          return false;
      }
    });

    // Send notifications for pending recurring
    if (pendingRecurring.length > 0) {
      notificationManager.checkRecurringReminders(pendingRecurring);
    }

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
  }, [recurringTransactions, setTransactions, updateRecurringTransaction, notificationManager]);

  // Budget Management (P2 Sprint 2)
  const setBudget = useCallback(
    (budget: Omit<CategoryBudget, 'id'>): string => {
      if (!adapter) return '';

      const newBudget: CategoryBudget = {
        id: uuidv4(),
        ...budget,
      };

      // Update storage asynchronously
      adapter.addBudget(newBudget).catch(error => {
        console.error('[FinanceContext] Error adding budget:', error);
      });

      // Update state immediately
      setBudgets((prev) => [...prev, newBudget]);
      return newBudget.id;
    },
    [adapter]
  );

  const updateBudget = useCallback(
    (id: string, updates: Partial<Omit<CategoryBudget, 'id'>>): boolean => {
      if (!adapter) return false;

      // Update storage asynchronously
      adapter.updateBudget(id, updates).catch(error => {
        console.error('[FinanceContext] Error updating budget:', error);
      });

      // Update state immediately
      setBudgets((prev) =>
        prev.map((budget) =>
          budget.id === id ? { ...budget, ...updates } : budget
        )
      );
      return true;
    },
    [adapter]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      if (!adapter) return;

      // Update storage asynchronously
      adapter.deleteBudget(id).catch(error => {
        console.error('[FinanceContext] Error deleting budget:', error);
      });

      // Update state immediately
      setBudgets((prev) => prev.filter((budget) => budget.id !== id));
    },
    [adapter]
  );

  const toggleBudgetActive = useCallback(
    (id: string) => {
      if (!adapter) return;

      setBudgets((prev) => {
        const updated = prev.map((budget) => {
          if (budget.id === id) {
            const toggled = { ...budget, isActive: !budget.isActive };
            
            // Update storage asynchronously
            adapter.updateBudget(id, { isActive: toggled.isActive }).catch(error => {
              console.error('[FinanceContext] Error toggling budget:', error);
            });
            
            return toggled;
          }
          return budget;
        });
        return updated;
      });
    },
    [adapter]
  );

  const getBudgetProgress = useCallback(
    (category: string, month: number, year: number) => {
      // Find active budget for this category
      const budget = budgets.find(
        (b) => b.category === category && b.isActive
      );
      if (!budget) return null;

      // Calculate total spent in this category for this month
      const spent = transactions
        .filter((t) => {
          const date = new Date(t.date);
          return (
            t.type === 'expense' &&
            t.category === category &&
            date.getMonth() === month &&
            date.getFullYear() === year
          );
        })
        .reduce((sum, t) => {
          // Convert to budget currency if needed
          const from = (t as any).originalCurrency || settings.currency;
          if (from === budget.currency) {
            return sum + t.amount;
          }
          // Basic conversion (would use exchange rates in production)
          const rate = exchangeRates[`${from}-${budget.currency}`] || 1;
          return sum + t.amount * rate;
        }, 0);

      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
      const exceeded = spent > budget.monthlyLimit;

      return {
        spent,
        limit: budget.monthlyLimit,
        percentage,
        exceeded,
      };
    },
    [budgets, transactions, settings.currency, exchangeRates]
  );

  const checkBudgetExceeded = useCallback(
    (category: string, month: number, year: number): boolean => {
      const progress = getBudgetProgress(category, month, year);
      return progress ? progress.exceeded : false;
    },
    [getBudgetProgress]
  );

  // Notification management actions (P2 Sprint 5)
  const updateNotificationSettings = useCallback(
    (newSettings: Partial<NotificationSettings>) => {
      const updated = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updated);
      notificationManager.updateSettings(updated);
      
      // Persist to localStorage
      try {
        localStorage.setItem('monera_notification_settings', JSON.stringify(updated));
      } catch (error) {
        console.error('[FinanceContext] Error saving notification settings:', error);
      }
    },
    [notificationSettings, notificationManager]
  );

  const markNotificationAsRead = useCallback(
    (id: string) => {
      notificationManager.markAsRead(id);
      setNotifications(notificationManager.getNotifications());
    },
    [notificationManager]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
    setNotifications(notificationManager.getNotifications());
  }, [notificationManager]);

  const deleteNotification = useCallback(
    (id: string) => {
      notificationManager.deleteNotification(id);
      setNotifications(notificationManager.getNotifications());
    },
    [notificationManager]
  );

  const clearAllNotifications = useCallback(() => {
    notificationManager.clearAll();
    setNotifications(notificationManager.getNotifications());
  }, [notificationManager]);

  // Cloud sync actions (P3 Sprint 2)
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    console.log('🔄 [FinanceContext] syncNow called:', { isAuthenticated, isCloudEnabled, hasAdapter: !!adapter });
    
    if (!isAuthenticated || !isCloudEnabled) {
      console.warn('⚠️ [FinanceContext] Sync skipped - not authenticated or cloud disabled');
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['User not authenticated or cloud not enabled'],
      };
    }

    const result = await syncService.syncAll();
    console.log('✅ [FinanceContext] Sync completed, reloading transactions...', result);
    
    // Always reload data from IndexedDB after sync attempt
    if (adapter) {
      try {
        const txs = await adapter.getAllTransactions();
        console.log(`📊 [FinanceContext] Loaded ${txs.length} transactions from IndexedDB`);
        setTransactions(txs);
      } catch (error) {
        console.error('❌ [FinanceContext] Failed to reload transactions:', error);
      }
    }
    
    return result;
  }, [isAuthenticated, isCloudEnabled, adapter]);

  const handleAutoSyncChange = useCallback((enabled: boolean) => {
    setAutoSync(enabled);
    localStorage.setItem('monera-auto-sync', JSON.stringify(enabled));
  }, []);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    return unsubscribe;
  }, []);

  // Auto-sync on mount if authenticated
  useEffect(() => {
    console.log('🔍 [FinanceContext] Auto-sync check:', { 
      isAuthenticated, 
      isCloudEnabled, 
      autoSync, 
      isLoading,
      hasAdapter: !!adapter 
    });
    
    if (isAuthenticated && isCloudEnabled && autoSync && !isLoading && adapter) {
      console.log('🚀 [FinanceContext] Triggering auto-sync in 500ms...');
      // Short delay to ensure UI is ready
      const timer = setTimeout(async () => {
        console.log('⏱️ [FinanceContext] Executing auto-sync now...');
        try {
          const result = await syncService.syncAll();
          console.log('✅ [FinanceContext] Sync completed:', result);
          
          // Wait for IndexedDB writes to complete
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Force reload ALL data from storage
          if (adapter) {
            console.log('🔄 [FinanceContext] Reloading ALL data from IndexedDB...');
            
            try {
              const [txs, bdgs, recur, sett] = await Promise.all([
                adapter.getAllTransactions(),
                adapter.getAllBudgets(),
                adapter.getAllRecurring(),
                adapter.getSettings()
              ]);
              
              console.log(`📊 [FinanceContext] Loaded from IndexedDB:`, {
                transactions: txs.length,
                budgets: bdgs.length,
                recurring: recur.length
              });
              
              // Force state update
              setTransactions(txs);
              setBudgets(bdgs);
              setRecurringTransactions(recur);
              setSettings(sett);
              
              console.log('✅ [FinanceContext] State updated successfully!');
            } catch (error) {
              console.error('❌ [FinanceContext] Failed to reload data:', error);
            }
          }
        } catch (error) {
          console.error('❌ [FinanceContext] Auto-sync error:', error);
        }
      }, 500);
      
      return () => {
        console.log('🧹 [FinanceContext] Cleaning up auto-sync timer');
        clearTimeout(timer);
      };
    } else {
      console.log('⏭️ [FinanceContext] Auto-sync skipped');
    }
  }, [isAuthenticated, isCloudEnabled, autoSync, isLoading, adapter]);

  const value: FinanceContextType = {
    transactions,
    settings,
    recurringTransactions,
    budgets,
    addTransaction,
    addBulkTransactions,
    deleteTransaction,
    updateTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringActive,
    generateRecurringTransactions,
    setBudget,
    updateBudget,
    deleteBudget,
    toggleBudgetActive,
    getBudgetProgress,
    checkBudgetExceeded,
    notifications,
    notificationSettings,
    updateNotificationSettings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    resetSettings,
    exportData,
    importData,
    clearAll,
    syncStatus,
    syncNow,
    autoSync,
    setAutoSync: handleAutoSyncChange,
  };

  // Show loading state while initializing storage
  if (isLoading) {
    return (
      <FinanceContext.Provider value={value}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>MonEra</div>
          <div>Loading...</div>
        </div>
      </FinanceContext.Provider>
    );
  }

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}
