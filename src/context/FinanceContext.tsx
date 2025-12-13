import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, AppSettings, RecurringTransaction, CategoryBudget } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { DEFAULT_APP_SETTINGS } from '../utils/constants';
import { calculateCashBalance } from '../utils/calculations';
import { NotificationManager, DEFAULT_NOTIFICATION_SETTINGS, type Notification, type NotificationSettings } from '../utils/notifications';
import { syncService, type SyncStatus, type SyncResult } from '../services/syncService';
import { useAuth } from './AuthContext';
import { supabase, getCurrentUser } from '../lib/supabase';
import { runCleanup } from '../lib/cleanupDuplicates';

export interface FinanceContextType {
  transactions: Transaction[];
  settings: AppSettings;
  recurringTransactions: RecurringTransaction[];
  budgets: CategoryBudget[];
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<boolean>;
  addBulkTransactions: (transactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode?: boolean) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<boolean>;
  
  // Recurring transaction actions (P2 Sprint 1)
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, 'id'>) => Promise<string>;
  updateRecurringTransaction: (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>, applyToExisting?: boolean) => Promise<boolean>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  toggleRecurringActive: (id: string) => Promise<void>;
  generateRecurringTransactions: () => Promise<number>;
  
  // Budget actions (P2 Sprint 2)
  setBudget: (budget: Omit<CategoryBudget, 'id'>) => Promise<string>;
  updateBudget: (id: string, updates: Partial<Omit<CategoryBudget, 'id'>>) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<void>;
  toggleBudgetActive: (id: string) => Promise<void>;
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
  updateSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  
  // Data management
  exportData: () => string;
  importData: (data: string) => Promise<boolean>;
  clearAll: () => Promise<void>;
  
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
  
  const [isLoading, setIsLoading] = useState(true);

  // State management using React state (synced with Supabase)
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

  // Initialize - Load data from Supabase only
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const user = await getCurrentUser();
        
        if (!mounted) return;
        
        if (!user || !isAuthenticated) {
          // Not authenticated - empty state
          setTransactions([]);
          setBudgets([]);
          setRecurringTransactions([]);
          setIsLoading(false);
          return;
        }

        console.log('[FinanceContext] Loading from Supabase for user:', user.email);

        // Load ALL data from Supabase (no local cache)
        const [txsResult, bdgsResult, recurResult, settResult] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('budgets').select('*').eq('user_id', user.id),
          supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
          supabase.from('settings').select('*').eq('user_id', user.id).single()
        ]);

        if (!mounted) return;

        // Map Supabase data to local types
        const txs: Transaction[] = (txsResult.data || []).map(tx => ({
          id: tx.id,
          title: tx.title,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          type: tx.type,
          description: tx.description,
          isRecurring: tx.is_recurring,
          recurringId: tx.recurring_id,
          originalCurrency: tx.original_currency
        }));

        const bdgs: CategoryBudget[] = (bdgsResult.data || []).map(b => ({
          id: b.id,
          category: b.category,
          monthlyLimit: b.monthly_limit,
          alertThreshold: b.alert_threshold,
          isActive: b.is_active,
          currency: b.currency
        }));

        const recur: RecurringTransaction[] = (recurResult.data || []).map(r => ({
          id: r.id,
          title: r.title,
          amount: r.amount,
          category: r.category,
          type: r.type,
          frequency: r.frequency,
          startDate: r.start_date,
          endDate: r.end_date,
          lastGenerated: r.last_generated,
          nextOccurrence: r.next_occurrence,
          isActive: r.is_active,
          description: r.description,
          originalCurrency: r.original_currency
        }));

        let sett = DEFAULT_APP_SETTINGS;
        if (settResult.data) {
          sett = {
            currency: settResult.data.currency,
            language: settResult.data.language,
            theme: settResult.data.theme,
            inflationRate: settResult.data.inflation_rate
          };
        }

        setTransactions(txs);
        setBudgets(bdgs);
        setRecurringTransactions(recur);
        setSettings(sett);
        
        setIsLoading(false);

        // Run cleanup after loading - removes duplicate transactions/budgets
        console.log('[FinanceContext] Starting cleanup of duplicates...');
        const cleanupResult = await runCleanup();
        if (cleanupResult.transactions > 0 || cleanupResult.budgets > 0) {
          console.log('[FinanceContext] Cleanup removed:', cleanupResult);
          // Reload data after cleanup
          const cleanTxsResult = await supabase.from('transactions').select('*').eq('user_id', user.id);
          if (cleanTxsResult.data) {
            const cleanTxs: Transaction[] = cleanTxsResult.data.map(tx => ({
              id: tx.id,
              title: tx.title,
              amount: tx.amount,
              category: tx.category,
              date: tx.date,
              type: tx.type,
              description: tx.description,
              isRecurring: tx.is_recurring,
              recurringId: tx.recurring_id,
              originalCurrency: tx.original_currency
            }));
            if (mounted) {
              setTransactions(cleanTxs);
            }
          }
        }
      } catch (error) {
        console.error('[FinanceContext] Initialization error:', error);
        if (!mounted) return;
        setIsLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

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
    async (transaction: Omit<Transaction, 'id'>) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

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

      // Create transaction with ID
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
      };
      
      // Insert to Supabase
      const { error } = await supabase.from('transactions').insert({
        id: newTransaction.id,
        user_id: user.id,
        title: newTransaction.title,
        amount: newTransaction.amount,
        category: newTransaction.category,
        type: newTransaction.type,
        date: newTransaction.date,
        description: newTransaction.description,
        is_recurring: newTransaction.isRecurring || false,
        recurring_id: newTransaction.recurringId,
        original_currency: newTransaction.originalCurrency,
      });

      if (error) {
        console.error('[FinanceContext] Error adding transaction to Supabase:', error);
        return false;
      }
      
      // Update local state
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
      
      return true;
    },
    [transactions, convertToTRY, budgets, notificationManager, isAuthenticated]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return;
      }

      // Delete from Supabase
      const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      
      if (error) {
        console.error('[FinanceContext] Error deleting transaction from Supabase:', error);
        return;
      }

      // Update state
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      
      // Track deleted ID to prevent re-import
      setDeletedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    },
    [isAuthenticated]
  );

  const addBulkTransactions = useCallback(
    async (newTransactions: (Omit<Transaction, 'id'> & { id?: string })[], replaceMode: boolean = false) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

      // If replace mode, clear deletedIds as well since we're starting fresh
      if (replaceMode) {
        setDeletedIds(new Set());
        // Delete all existing transactions from Supabase
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('[FinanceContext] Error clearing transactions:', deleteError);
          return false;
        }
      }
      
      // Build transactions with IDs
      const keyOf = (t: Omit<Transaction, 'id'> | Transaction) =>
        `${(t.title || '').trim().toLowerCase()}|${t.amount}|${(t.category || '').trim().toLowerCase()}|${t.date}|${t.type}|${(t as any).originalCurrency || 'TRY'}`;

      const existingKeys = new Set(transactions.map((p) => keyOf(p)));
      const existingIds = new Set(transactions.map((p) => p.id));

      // Filter out duplicates
      const dedupedIncoming = newTransactions.filter((t) => {
        if (!replaceMode && t.id && deletedIds.has(t.id)) {
          return false;
        }
        if (t.id && existingIds.has(t.id)) {
          return false;
        }
        if (existingKeys.has(keyOf(t))) {
          return false;
        }
        return true;
      });

      // Add IDs if missing
      const withIds = dedupedIncoming.map((t) => ({
        ...t,
        id: t.id || uuidv4(),
      }));

      // Insert to Supabase
      if (withIds.length > 0) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(withIds.map(tx => ({
            id: tx.id,
            user_id: user.id,
            title: tx.title,
            amount: tx.amount,
            category: tx.category,
            type: tx.type,
            date: tx.date,
            description: tx.description,
            is_recurring: tx.isRecurring || false,
            recurring_id: tx.recurringId,
            original_currency: tx.originalCurrency,
          })));

        if (insertError) {
          console.error('[FinanceContext] Error inserting bulk transactions:', insertError);
          return false;
        }
      }

      // Update local state
      setTransactions((prev) => {
        const baseTransactions = replaceMode ? [] : prev;
        return [...withIds, ...baseTransactions];
      });

      return true;
    },
    [transactions, deletedIds, isAuthenticated]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

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

      if (updated) {
        // Update in Supabase
        const { error } = await supabase.from('transactions').update({
          title: updates.title,
          amount: updates.amount,
          category: updates.category,
          type: updates.type,
          date: updates.date,
          description: updates.description,
          is_recurring: updates.isRecurring,
          recurring_id: updates.recurringId,
          original_currency: updates.originalCurrency,
        }).eq('id', id).eq('user_id', user.id);

        if (error) {
          console.error('[FinanceContext] Error updating transaction in Supabase:', error);
          return false;
        }
      }

      return updated;
    },
    [isAuthenticated]
  );

  // Settings actions
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>): Promise<boolean> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

      // First try upsert
      const { error: upsertError } = await supabase.from('app_settings').upsert({
        user_id: user.id,
        language: newSettings.language,
        currency: newSettings.currency,
        theme: newSettings.theme,
        notifications_enabled: newSettings.notificationsEnabled,
        notification_sound: newSettings.notificationSound,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      if (upsertError) {
        console.error('[FinanceContext] Upsert failed, trying insert:', upsertError);
        
        // If upsert fails (table might not exist), try insert
        const { error: insertError } = await supabase.from('app_settings').insert({
          user_id: user.id,
          language: newSettings.language,
          currency: newSettings.currency,
          theme: newSettings.theme,
          notifications_enabled: newSettings.notificationsEnabled,
          notification_sound: newSettings.notificationSound,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('[FinanceContext] Both upsert and insert failed:', insertError);
          // Table doesn't exist, just update local state
          console.warn('[FinanceContext] Settings table not available, using local state only');
        }
      }

      // Update state regardless (local-first approach)
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        
        // Update notification manager language if language changed
        if (newSettings.language && newSettings.language !== prev.language) {
          notificationManager.setLanguage(newSettings.language);
        }
        
        // Update DOM for theme changes
        if (newSettings.theme) {
          if (newSettings.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        
        console.log('[FinanceContext] Settings updated in state:', updated);
        return updated;
      });
      
      return true;
    },
    [isAuthenticated, notificationManager]
  );

  const resetSettings = useCallback(async (): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user || !isAuthenticated) {
      console.error('[FinanceContext] Not authenticated');
      return false;
    }

    // Update in Supabase
    const { error } = await supabase.from('app_settings').update({
      language: DEFAULT_SETTINGS.language,
      currency: DEFAULT_SETTINGS.currency,
      theme: DEFAULT_SETTINGS.theme,
      notifications_enabled: DEFAULT_SETTINGS.notificationsEnabled,
      notification_sound: DEFAULT_SETTINGS.notificationSound,
    }).eq('user_id', user.id);

    if (error) {
      console.error('[FinanceContext] Error resetting settings:', error);
      return false;
    }

    // Update state
    setSettings(DEFAULT_SETTINGS);
    return true;
  }, [isAuthenticated]);

  // Data management
  const exportData = useCallback(() => {
    return JSON.stringify(
      { transactions, budgets, recurringTransactions, settings },
      null,
      2
    );
  }, [transactions, budgets, recurringTransactions, settings]);

  const importData = useCallback(
    async (data: string): Promise<boolean> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

      try {
        const parsed = JSON.parse(data);
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
          return false;
        }

        // Import transactions to Supabase
        const { error: txError } = await supabase.from('transactions').insert(
          parsed.transactions.map((tx: Transaction) => ({
            id: tx.id,
            user_id: user.id,
            title: tx.title,
            amount: tx.amount,
            category: tx.category,
            type: tx.type,
            date: tx.date,
            original_currency: tx.originalCurrency,
            is_recurring: tx.isRecurring,
            recurring_id: tx.recurringId || null,
            description: tx.description || null,
          }))
        );

        if (txError) {
          console.error('[FinanceContext] Error importing transactions:', txError);
          return false;
        }

        // Import budgets if available
        if (parsed.budgets && Array.isArray(parsed.budgets)) {
          const { error: budgetError } = await supabase.from('budgets').insert(
            parsed.budgets.map((b: CategoryBudget) => ({
              id: b.id,
              user_id: user.id,
              category: b.category,
              monthly_limit: b.monthlyLimit,
              alert_threshold: b.alertThreshold,
              is_active: b.isActive,
              currency: b.currency,
            }))
          );

          if (budgetError) {
            console.error('[FinanceContext] Error importing budgets:', budgetError);
          }
        }

        // Import recurring transactions if available
        if (parsed.recurringTransactions && Array.isArray(parsed.recurringTransactions)) {
          const { error: recurringError } = await supabase.from('recurring_transactions').insert(
            parsed.recurringTransactions.map((r: RecurringTransaction) => ({
              id: r.id,
              user_id: user.id,
              title: r.title,
              amount: r.amount,
              category: r.category,
              type: r.type,
              frequency: r.frequency,
              start_date: r.startDate,
              end_date: r.endDate || null,
              last_generated: r.lastGenerated || null,
              next_occurrence: r.nextOccurrence,
              is_active: r.isActive,
              description: r.description || null,
              original_currency: r.originalCurrency,
            }))
          );

          if (recurringError) {
            console.error('[FinanceContext] Error importing recurring:', recurringError);
          }
        }

        // Update state
        setTransactions(parsed.transactions);
        if (parsed.budgets) setBudgets(parsed.budgets);
        if (parsed.recurringTransactions) setRecurringTransactions(parsed.recurringTransactions);
        if (parsed.settings) setSettings(parsed.settings);
        
        return true;
      } catch {
        return false;
      }
    },
    [isAuthenticated]
  );

  const clearAll = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user || !isAuthenticated) {
      console.error('[FinanceContext] Not authenticated');
      return;
    }

    // Delete all data from Supabase
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('budgets').delete().eq('user_id', user.id);
    await supabase.from('recurring_transactions').delete().eq('user_id', user.id);

    // Clear state
    setTransactions([]);
    setBudgets([]);
    setRecurringTransactions([]);
    setSettings(DEFAULT_APP_SETTINGS);
    setDeletedIds(new Set());
  }, [isAuthenticated]);

  // Recurring Transaction actions (P2)
  const addRecurringTransaction = useCallback(
    async (recurring: Omit<RecurringTransaction, 'id'>): Promise<string> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return '';
      }

      const newRecurring: RecurringTransaction = {
        ...recurring,
        id: uuidv4(),
        isActive: true,
      };

      // Insert to Supabase
      const { error } = await supabase.from('recurring_transactions').insert({
        id: newRecurring.id,
        user_id: user.id,
        title: newRecurring.title,
        amount: newRecurring.amount,
        category: newRecurring.category,
        type: newRecurring.type,
        frequency: newRecurring.frequency,
        start_date: newRecurring.startDate,
        end_date: newRecurring.endDate || null,
        last_generated: newRecurring.lastGenerated || null,
        next_occurrence: newRecurring.nextOccurrence,
        is_active: newRecurring.isActive,
        description: newRecurring.description || null,
        original_currency: newRecurring.originalCurrency,
      });

      if (error) {
        console.error('[FinanceContext] Error adding recurring:', error);
        return '';
      }

      // Update state with new recurring transaction
      setRecurringTransactions((prev) => [newRecurring, ...prev]);

      // Generate transactions asynchronously (don't await, fire-and-forget)
      // This is done separately to avoid circular dependency issues
      (async () => {
        try {
          const user = await getCurrentUser();
          if (!user || !isAuthenticated) return;

          // Generate first transaction(s) for this recurring
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const startDate = new Date(newRecurring.startDate);
          startDate.setHours(0, 0, 0, 0);

          const endDate = newRecurring.endDate ? new Date(newRecurring.endDate) : null;
          if (endDate) {
            endDate.setHours(0, 0, 0, 0);
          }

          let currentDate = new Date(newRecurring.nextOccurrence);
          currentDate.setHours(0, 0, 0, 0);

          const maxDate = endDate ? endDate : new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
          const transactionsToAdd: Transaction[] = [];

          while (currentDate <= maxDate && transactionsToAdd.length < 5) {
            const dateString = currentDate.toISOString().split('T')[0];
            transactionsToAdd.push({
              id: uuidv4(),
              title: newRecurring.title,
              amount: newRecurring.amount,
              category: newRecurring.category,
              type: newRecurring.type,
              date: dateString,
              originalCurrency: newRecurring.originalCurrency,
              isRecurring: true,
              recurringId: newRecurring.id,
              description: newRecurring.description,
            });

            switch (newRecurring.frequency) {
              case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
              case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
              case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
              case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
              case 'quarterly':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
              case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            }
          }

          if (transactionsToAdd.length > 0) {
            const { data: existingTxs } = await supabase
              .from('transactions')
              .select('date')
              .eq('user_id', user.id)
              .eq('recurring_id', newRecurring.id);

            const existingDates = new Set((existingTxs || []).map(t => t.date));
            const newTransactions = transactionsToAdd.filter(
              (tx) => !existingDates.has(tx.date)
            );

            if (newTransactions.length > 0) {
              await supabase.from('transactions').insert(
                newTransactions.map(tx => ({
                  id: tx.id,
                  user_id: user.id,
                  title: tx.title,
                  amount: tx.amount,
                  category: tx.category,
                  type: tx.type,
                  date: tx.date,
                  original_currency: tx.originalCurrency,
                  is_recurring: tx.isRecurring,
                  recurring_id: tx.recurringId || null,
                  description: tx.description || null,
                }))
              );

              setTransactions((prev) => [...newTransactions, ...prev]);

              // Update nextOccurrence
              const lastTx = newTransactions[newTransactions.length - 1];
              const nextDate = new Date(lastTx.date);
              switch (newRecurring.frequency) {
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

              await supabase.from('recurring_transactions').update({
                last_generated: lastTx.date,
                next_occurrence: nextDate.toISOString().split('T')[0],
              }).eq('id', newRecurring.id).eq('user_id', user.id);

              setRecurringTransactions((prev) =>
                prev.map((r) =>
                  r.id === newRecurring.id
                    ? {
                        ...r,
                        lastGenerated: lastTx.date,
                        nextOccurrence: nextDate.toISOString().split('T')[0],
                      }
                    : r
                )
              );
            }
          }
        } catch (err) {
          console.error('[FinanceContext] Error generating transactions for new recurring:', err);
        }
      })();
      
      return newRecurring.id;
    },
    [isAuthenticated]
  );

  const updateRecurringTransaction = useCallback(
    async (id: string, updates: Partial<Omit<RecurringTransaction, 'id'>>, applyToExisting = false): Promise<boolean> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

      // Update in Supabase
      const { error } = await supabase.from('recurring_transactions').update({
        title: updates.title,
        amount: updates.amount,
        category: updates.category,
        type: updates.type,
        frequency: updates.frequency,
        start_date: updates.startDate,
        end_date: updates.endDate || null,
        last_generated: updates.lastGenerated || null,
        next_occurrence: updates.nextOccurrence,
        is_active: updates.isActive,
        description: updates.description || null,
        original_currency: updates.originalCurrency,
      }).eq('id', id).eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error updating recurring:', error);
        return false;
      }

      // If applyToExisting is true, update generated transactions too
      if (applyToExisting) {
        // Update existing transactions that were generated from this recurring transaction
        const updatePayload: any = {};
        if (updates.title !== undefined) updatePayload.title = updates.title;
        if (updates.category !== undefined) updatePayload.category = updates.category;
        if (updates.description !== undefined) updatePayload.description = updates.description;

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update(updatePayload)
            .eq('recurring_id', id)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('[FinanceContext] Error updating generated transactions:', updateError);
            // Don't fail the entire operation, just log the error
          }
        }
      }

      // Update state
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

      // If applyToExisting, also update local transaction state
      if (applyToExisting && updated) {
        setTransactions((prev) => {
          return prev.map((t) => {
            if (t.recurringId === id) {
              const updated: Transaction = { ...t };
              if (updates.title !== undefined) updated.title = updates.title;
              if (updates.category !== undefined) updated.category = updates.category;
              if (updates.description !== undefined) updated.description = updates.description;
              return updated;
            }
            return t;
          });
        });
      }

      return updated;
    },
    [isAuthenticated]
  );

  const deleteRecurringTransaction = useCallback(
    async (id: string) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return;
      }

      // First, delete all generated transactions with this recurring_id
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('recurring_id', id)
        .eq('user_id', user.id);

      if (transactionsError) {
        console.error('[FinanceContext] Error deleting related transactions:', transactionsError);
        return;
      }

      // Then, delete the recurring transaction template
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error deleting recurring:', error);
        return;
      }

      // Update state - remove from both transactions and recurring transactions
      setTransactions((prev) => prev.filter((t) => t.recurringId !== id));
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
    },
    [isAuthenticated]
  );

  const toggleRecurringActive = useCallback(
    async (id: string) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return;
      }

      const recurring = recurringTransactions.find(r => r.id === id);
      if (!recurring) return;

      const newIsActive = !recurring.isActive;

      // Update in Supabase
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: newIsActive })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error toggling recurring:', error);
        return;
      }

      // Update state
      setRecurringTransactions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: newIsActive } : r))
      );
    },
    [recurringTransactions, isAuthenticated]
  );

  const generateRecurringTransactions = useCallback(async (): Promise<number> => {
    const user = await getCurrentUser();
    if (!user || !isAuthenticated) {
      console.error('[FinanceContext] Not authenticated');
      return 0;
    }

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

    for (const recurring of recurringTransactions) {
      if (!recurring.isActive) continue;

      const startDate = new Date(recurring.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
      if (endDate) {
        endDate.setHours(0, 0, 0, 0);
      }

      // Start from nextOccurrence
      let currentDate = new Date(recurring.nextOccurrence);
      currentDate.setHours(0, 0, 0, 0);

      // Generate all transactions from currentDate up to endDate (or today + 60 days)
      const transactionsToAdd: Transaction[] = [];
      
      // Safety limit: generate up to 60 days from now if no endDate
      const maxDate = endDate ? endDate : new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      while (currentDate <= maxDate) {
        const transactionDate = new Date(currentDate);
        const dateString = transactionDate.toISOString().split('T')[0];

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
          case 'biweekly':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
      }

      // Add all transactions at once
      if (transactionsToAdd.length > 0) {
        // Check Supabase for existing transactions with same recurring_id and date
        const { data: existingTxs, error: checkError } = await supabase
          .from('transactions')
          .select('date')
          .eq('user_id', user.id)
          .eq('recurring_id', recurring.id);

        if (!checkError && existingTxs) {
          // Filter out duplicates from Supabase
          const existingDates = new Set(existingTxs.map(t => t.date));
          const newTransactions = transactionsToAdd.filter(
            (tx) => !existingDates.has(tx.date)
          );
          
          if (newTransactions.length > 0) {
            // Insert to Supabase
            const { error } = await supabase.from('transactions').insert(
              newTransactions.map(tx => ({
                id: tx.id,
                user_id: user.id,
                title: tx.title,
                amount: tx.amount,
                category: tx.category,
                type: tx.type,
                date: tx.date,
                original_currency: tx.originalCurrency,
                is_recurring: tx.isRecurring,
                recurring_id: tx.recurringId || null,
                description: tx.description || null,
              }))
            );

            if (error) {
              console.error('[FinanceContext] Error adding generated transactions:', error);
              continue;
            }

            totalGeneratedCount += newTransactions.length;

            // Update state
            setTransactions((prev) => [...newTransactions, ...prev]);
          }
        }

        // Update lastGenerated and nextOccurrence
        const lastTransaction = transactionsToAdd[transactionsToAdd.length - 1];
        const lastDate = new Date(lastTransaction.date);
        
        let nextDate = new Date(lastDate);
        switch (recurring.frequency) {
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
        
        await updateRecurringTransaction(recurring.id, {
          lastGenerated: lastTransaction.date,
          nextOccurrence: nextDate.toISOString().split('T')[0],
        });
      }
    }

    return totalGeneratedCount;
  }, [recurringTransactions, isAuthenticated, updateRecurringTransaction, notificationManager]);

  // Budget Management (P2 Sprint 2)
  const setBudget = useCallback(
    async (budget: Omit<CategoryBudget, 'id'>): Promise<string> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return '';
      }

      const newBudget: CategoryBudget = {
        id: uuidv4(),
        ...budget,
      };

      // Insert to Supabase
      const { error } = await supabase.from('budgets').insert({
        id: newBudget.id,
        user_id: user.id,
        category: newBudget.category,
        monthly_limit: newBudget.monthlyLimit,
        alert_threshold: newBudget.alertThreshold,
        is_active: newBudget.isActive,
        currency: newBudget.currency,
      });

      if (error) {
        console.error('[FinanceContext] Error adding budget:', error);
        return '';
      }

      // Update state immediately
      setBudgets((prev) => [...prev, newBudget]);
      return newBudget.id;
    },
    [isAuthenticated]
  );

  const updateBudget = useCallback(
    async (id: string, updates: Partial<Omit<CategoryBudget, 'id'>>): Promise<boolean> => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return false;
      }

      // Update in Supabase
      const { error } = await supabase.from('budgets').update({
        monthly_limit: updates.monthlyLimit,
        alert_threshold: updates.alertThreshold,
        is_active: updates.isActive,
        currency: updates.currency,
      }).eq('id', id).eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error updating budget:', error);
        return false;
      }

      // Update state
      setBudgets((prev) =>
        prev.map((budget) =>
          budget.id === id ? { ...budget, ...updates } : budget
        )
      );
      return true;
    },
    [isAuthenticated]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return;
      }

      // Delete from Supabase
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error deleting budget:', error);
        return;
      }

      // Update state
      setBudgets((prev) => prev.filter((budget) => budget.id !== id));
    },
    [isAuthenticated]
  );

  const toggleBudgetActive = useCallback(
    async (id: string) => {
      const user = await getCurrentUser();
      if (!user || !isAuthenticated) {
        console.error('[FinanceContext] Not authenticated');
        return;
      }

      const budget = budgets.find(b => b.id === id);
      if (!budget) return;

      const newIsActive = !budget.isActive;

      // Update in Supabase
      const { error } = await supabase.from('budgets').update({ is_active: newIsActive }).eq('id', id).eq('user_id', user.id);

      if (error) {
        console.error('[FinanceContext] Error toggling budget:', error);
        return;
      }

      // Update state
      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: newIsActive } : b))
      );
    },
    [budgets, isAuthenticated]
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
    const user = await getCurrentUser();
    console.log('🔄 [FinanceContext] syncNow called:', { isAuthenticated, isCloudEnabled, userId: user?.id });
    
    if (!user || !isAuthenticated || !isCloudEnabled) {
      console.warn('⚠️ [FinanceContext] Sync skipped - not authenticated or cloud disabled');
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['User not authenticated or cloud not enabled'],
      };
    }

    // Since we're using Supabase directly now, reload data from Supabase
    try {
      const [{ data: txs }, { data: budgets }, { data: recurring }] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
      ]);

      if (txs) {
        const mapped = txs.map(tx => ({
          id: tx.id,
          title: tx.title,
          amount: tx.amount,
          category: tx.category,
          type: tx.type,
          date: tx.date,
          originalCurrency: tx.original_currency,
          isRecurring: tx.is_recurring,
          recurringId: tx.recurring_id,
          description: tx.description,
        }));
        setTransactions(mapped);
        console.log(`📊 [FinanceContext] Loaded ${mapped.length} transactions from Supabase`);
      }

      if (budgets) {
        const mapped = budgets.map(b => ({
          id: b.id,
          category: b.category,
          monthlyLimit: b.monthly_limit,
          alertThreshold: b.alert_threshold,
          isActive: b.is_active,
          currency: b.currency,
        }));
        setBudgets(mapped);
      }

      if (recurring) {
        const mapped = recurring.map(r => ({
          id: r.id,
          title: r.title,
          amount: r.amount,
          category: r.category,
          type: r.type,
          frequency: r.frequency,
          startDate: r.start_date,
          endDate: r.end_date,
          lastGenerated: r.last_generated,
          nextOccurrence: r.next_occurrence,
          isActive: r.is_active,
          description: r.description,
          originalCurrency: r.original_currency,
        }));
        setRecurringTransactions(mapped);
      }

      console.log('✅ [FinanceContext] Sync completed successfully');
      return {
        success: true,
        synced: (txs?.length || 0) + (budgets?.length || 0) + (recurring?.length || 0),
        conflicts: 0,
        errors: [],
      };
    } catch (error) {
      console.error('❌ [FinanceContext] Sync failed:', error);
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
      };
    }
  }, [isAuthenticated, isCloudEnabled]);

  const handleAutoSyncChange = useCallback((enabled: boolean) => {
    setAutoSync(enabled);
    localStorage.setItem('monera-auto-sync', JSON.stringify(enabled));
  }, []);

  // Subscribe to sync status changes
  useEffect(() => {
    // Since we're using Supabase directly now, we don't need to subscribe to syncService
    // Just mark sync status as idle
    setSyncStatus({
      isSyncing: false,
      lastSyncTime: null,
      error: null,
    });
    return;
  }, []);

  // Auto-sync on mount if authenticated
  useEffect(() => {
    console.log('🔍 [FinanceContext] Auto-sync check:', { 
      isAuthenticated, 
      isCloudEnabled, 
      autoSync, 
      isLoading,
    });
    
    if (isAuthenticated && isCloudEnabled && autoSync && !isLoading) {
      console.log('🚀 [FinanceContext] Triggering auto-sync in 500ms...');
      // Short delay to ensure UI is ready
      const timer = setTimeout(async () => {
        console.log('⏱️ [FinanceContext] Executing auto-sync now...');
        try {
          const result = await syncNow();
          console.log('✅ [FinanceContext] Sync completed:', result);
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
  }, [isAuthenticated, isCloudEnabled, autoSync, isLoading, syncNow]);

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
