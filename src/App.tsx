import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { Transaction } from './types';
import { FinanceProvider } from './context/FinanceContext';
import { useFinance } from './hooks/useFinance';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { MonthSelector } from './components/dashboard/MonthSelector';
import { Charts } from './components/dashboard/Charts';
import { TransactionForm } from './components/transactions/TransactionForm';
import { NotificationSettingsPanel } from './components/notifications/NotificationSettingsPanel';
import { SkeletonDashboard } from './components/ui/Skeleton';
import { NoTransactionsEmpty } from './components/ui/EmptyState';
import { AuthForm } from './components/auth/AuthForm';
import { generateFinancialSummary } from './utils/calculations';
import { convertCurrency, fetchLatestRates, updateExchangeRates, loadPersistedRates } from './utils/exchange';
import './index.css';

// Lazy load heavy pages
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const RecurringTransactionsPage = lazy(() => import('./pages/RecurringTransactionsPage').then(m => ({ default: m.RecurringTransactionsPage })));
const BudgetPage = lazy(() => import('./pages/BudgetPage').then(m => ({ default: m.BudgetPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
}

// Load test utilities in development
if (import.meta.env.DEV) {
  import('./db/testMigration').then(module => {
    (window as any).MonEraTest = {
      generateMockData: module.generateMockData,
      testMigration: module.testMigration,
      benchmarkPerformance: module.benchmarkPerformance,
      testRollback: module.testRollback,
      runAllTests: module.runAllTests
    };
    console.log('🧪 MonEra Test Suite Loaded');
    console.log('Available commands:');
    console.log('  MonEraTest.generateMockData(1000) - Generate 1000 mock transactions');
    console.log('  MonEraTest.testMigration() - Test localStorage → IndexedDB migration');
    console.log('  MonEraTest.benchmarkPerformance() - Compare query performance');
    console.log('  MonEraTest.testRollback() - Test IndexedDB → localStorage rollback');
    console.log('  MonEraTest.runAllTests() - Run complete test suite');
  });
}

interface DashboardContentProps {
  onRatesUpdate: (rates: Record<string, number>) => void;
}

function DashboardContent({ onRatesUpdate }: DashboardContentProps) {
  const { 
    transactions, 
    settings, 
    addTransaction, 
    deleteTransaction, 
    updateTransaction, 
    updateSettings, 
    generateRecurringTransactions,
    notifications,
    notificationSettings,
    updateNotificationSettings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
  } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'transactions' | 'recurring' | 'budget' | 'analytics' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Simulate initial loading (remove in production or use real async operations)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms loading simulation
    return () => clearTimeout(timer);
  }, []);

  // Auto-generate recurring transactions on mount only (not on dependency changes)
  useEffect(() => {
    const generate = async () => {
      const count = await generateRecurringTransactions();
      if (count > 0) {
        console.log(`[Auto-Generated] ${count} recurring transactions created`);
      }
    };
    
    generate().catch(error => {
      console.error('Error generating recurring transactions:', error);
    });
  }, []); // Empty dependency array - only run on mount

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    console.log(`[handleThemeToggle] Toggling theme to: ${newTheme}`);
    
    // Optimistic update - change immediately
    updateSettings({ theme: newTheme }).then((success) => {
      if (success) {
        console.log(`[handleThemeToggle] Theme persisted: ${newTheme}`);
      } else {
        console.warn('[handleThemeToggle] Failed to persist theme');
      }
    }).catch(error => {
      console.error('[handleThemeToggle] Error:', error);
    });
  };

  const handleLanguageToggle = () => {
    const newLang = settings.language === 'tr' ? 'en' : 'tr';
    console.log(`[handleLanguageToggle] Toggling language to: ${newLang}`);
    
    // Optimistic update - change immediately
    updateSettings({ language: newLang }).then((success) => {
      if (success) {
        console.log(`[handleLanguageToggle] Language persisted: ${newLang}`);
      } else {
        console.warn('[handleLanguageToggle] Failed to persist language');
      }
    }).catch(error => {
      console.error('[handleLanguageToggle] Error:', error);
    });
  };

  const handleCurrencyToggle = () => {
    // Get currencies from the selected currency pair
    // e.g., "TRY-USD" → [TRY, USD]
    const currencyPair = settings.currencyPair || 'TRY-USD';
    const [curr1, curr2] = currencyPair.split('-') as ['TRY' | 'USD' | 'EUR' | 'GBP', 'TRY' | 'USD' | 'EUR' | 'GBP'];
    
    // Toggle between the two currencies in the pair
    const newCurrency = settings.currency === curr1 ? curr2 : curr1;
    console.log(`[handleCurrencyToggle] Toggling currency from ${settings.currency} to ${newCurrency} (pair: ${currencyPair})`);
    
    // Optimistic update - change immediately
    updateSettings({ currency: newCurrency }).then((success) => {
      if (success) {
        console.log(`[handleCurrencyToggle] Currency persisted: ${newCurrency}`);
      } else {
        console.warn('[handleCurrencyToggle] Failed to persist currency');
      }
    }).catch(error => {
      console.error('[handleCurrencyToggle] Error:', error);
    });
  };

  const handleRefreshRates = useCallback(async () => {
    setIsFetchingRates(true);
    try {
      const base = settings.currency || 'USD';
      console.log('[App] Manually refreshing rates');
      const rates = await fetchLatestRates(base);
      setExchangeRates(rates);
      updateExchangeRates(rates);
      onRatesUpdate(rates);
    } catch (error) {
      console.error('[App] Error refreshing rates:', error);
    } finally {
      setIsFetchingRates(false);
    }
  }, [settings.currency]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Wrap addTransaction to automatically switch to the transaction's month
  const handleAddTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const result = await addTransaction(transaction);
    if (result) {
      // If transaction added successfully, switch to that transaction's month
      const txDate = new Date(transaction.date);
      setSelectedMonth(txDate.getMonth());
      setSelectedYear(txDate.getFullYear());
    }
    return result;
  }, [addTransaction]);

  // Helper: Convert transaction amount to current display currency
  const getDisplayAmount = useCallback((transaction: Transaction): number => {
    if ((transaction as any).originalCurrency === settings.currency) {
      return transaction.amount;
    }
    const from = (transaction as any).originalCurrency || 'TRY';
    return convertCurrency(transaction.amount, from, settings.currency);
  }, [settings.currency]);

  // Filter transactions by selected month/year
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Calculate cumulative wealth up to selected month (Net Worth)
  const cumulativeWealth = useMemo(() => {
    let cumulative = 0;
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const tMonth = date.getMonth();
      const tYear = date.getFullYear();
      
      // Include if before selected month/year, or same month/year
      const isBeforeOrSame = 
        tYear < selectedYear || 
        (tYear === selectedYear && tMonth <= selectedMonth);
      
      if (isBeforeOrSame && (t.type === 'savings' || t.type === 'withdrawal')) {
        if (t.type === 'savings') {
          cumulative += getDisplayAmount(t);
        } else {
          cumulative -= getDisplayAmount(t);
        }
      }
    });
    return cumulative;
  }, [transactions, selectedMonth, selectedYear, getDisplayAmount]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    // For monthly summary: use filtered transactions (only selected month)
    const convertedFiltered = filteredTransactions.map((t) => ({ ...t, amount: getDisplayAmount(t) }));
    
    const monthlySummary = generateFinancialSummary(convertedFiltered, selectedMonth, selectedYear);
    // Override netWorth with cumulative calculation (already converted)
    monthlySummary.netWorth = cumulativeWealth;
    // Cash balance stays monthly (from filtered transactions)
    
    return monthlySummary;
  }, [filteredTransactions, selectedMonth, selectedYear, getDisplayAmount, cumulativeWealth]);

  // Fetch latest rates on initial mount and when currency changes
  useEffect(() => {
    let cancelled = false;
    
    const fetchRates = async () => {
      // First, load any cached rates immediately for instant display
      const cached = loadPersistedRates();
      if (cached?.rates) {
        setExchangeRates(cached.rates);
      }
      
      // Then fetch fresh rates from API
      const base = settings.currency || 'USD';
      console.log('[App] Fetching fresh rates');
      const rates = await fetchLatestRates(base);
      if (!cancelled) {
        setExchangeRates(rates);
        updateExchangeRates(rates);
        onRatesUpdate(rates); // Update parent state
      }
    };
    
    fetchRates();
    return () => { cancelled = true; };
  }, [settings.currency]);

  return (
    <AppShell
      theme={settings.theme}
      language={settings.language}
      currency={settings.currency}
      currencyPair={settings.currencyPair}
      exchangeRates={exchangeRates}
      isFetchingRates={isFetchingRates}
      onRefreshRates={handleRefreshRates}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onThemeToggle={handleThemeToggle}
      onLanguageToggle={handleLanguageToggle}
      onCurrencyToggle={handleCurrencyToggle}
      onSettingsClick={() => setIsSettingsOpen(true)}
      notifications={notifications}
      onMarkNotificationAsRead={markNotificationAsRead}
      onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
      onDeleteNotification={deleteNotification}
      onClearAllNotifications={clearAllNotifications}
      onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
    >
      {/* Dashboard Page */}
      {currentPage === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {settings.language === 'tr' ? 'Panel' : 'Dashboard'}
            </h1>
            {/* Hide add button when there are no transactions (empty state has its own button) */}
            {!isLoading && transactions.length > 0 && (
              <TransactionForm mode="add" onSubmit={handleAddTransaction} language={settings.language} currency={settings.currency} />
            )}
          </div>

          {isLoading ? (
            <SkeletonDashboard />
          ) : transactions.length === 0 ? (
            <>
              {/* Hidden TransactionForm to be triggered by empty state button */}
              <TransactionForm 
                mode="add" 
                onSubmit={handleAddTransaction} 
                language={settings.language} 
                currency={settings.currency}
                triggerButton={false}
              />
              <NoTransactionsEmpty
                onAdd={() => {
                  // Trigger the hidden transaction form modal
                  const button = document.querySelector<HTMLButtonElement>('[data-transaction-form-trigger]');
                  if (button) button.click();
                }}
                language={settings.language}
              />
            </>
          ) : (
            <>
              <MonthSelector
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={handleMonthChange}
                language={settings.language}
              />

              <SummaryCards
                summary={summary}
                currency={settings.currency}
                language={settings.language}
                cumulativeWealth={cumulativeWealth}
              />

              <Charts transactions={transactions} currency={settings.currency} language={settings.language} theme={settings.theme} selectedMonth={selectedMonth} selectedYear={selectedYear} />

              <RecentTransactions
                transactions={filteredTransactions}
                currency={settings.currency}
                language={settings.language}
                onDelete={deleteTransaction}
                onEdit={(transaction) => setEditingTransaction(transaction)}
              />
            </>
          )}

          {/* Edit Transaction Modal */}
          {editingTransaction && (
            <TransactionForm
              mode="edit"
              transaction={editingTransaction}
              onSubmit={async (data) => {
                const ok = await updateTransaction(editingTransaction.id, data);
                if (ok !== false) {
                  setEditingTransaction(undefined);
                }
                return ok;
              }}
              onClose={() => setEditingTransaction(undefined)}
              triggerButton={false}
              language={settings.language}
              currency={settings.currency}
            />
          )}
        </div>
      )}

      {/* Transactions Page */}
      {currentPage === 'transactions' && (
        <Suspense fallback={<PageLoader />}>
          <TransactionsPage
          language={settings.language}
          currency={settings.currency}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        </Suspense>
      )}

      {/* Recurring Transactions Page */}
      {currentPage === 'recurring' && (
        <Suspense fallback={<PageLoader />}>
          <RecurringTransactionsPage
            language={settings.language}
            currency={settings.currency}
          />
        </Suspense>
      )}

      {/* Budget Page */}
      {currentPage === 'budget' && (
        <Suspense fallback={<PageLoader />}>
          <BudgetPage
            language={settings.language}
            currency={settings.currency}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </Suspense>
      )}

      {/* Analytics Page */}
      {currentPage === 'analytics' && (
        <Suspense fallback={<PageLoader />}>
          <AnalyticsPage
            transactions={transactions}
            language={settings.language}
            currency={settings.currency}
            getDisplayAmount={getDisplayAmount}
          />
        </Suspense>
      )}

      {/* Settings Modal */}
      <Suspense fallback={null}>
        <SettingsPage isOpen={isSettingsOpen || currentPage === 'settings'} onClose={() => { setIsSettingsOpen(false); setCurrentPage('dashboard'); }} onRefreshRates={handleRefreshRates} isFetchingRates={isFetchingRates} />
      </Suspense>

      {/* Notification Settings Modal */}
      {isNotificationSettingsOpen && (
        <NotificationSettingsPanel
          settings={notificationSettings}
          language={settings.language}
          onUpdate={updateNotificationSettings}
          onClose={() => setIsNotificationSettingsOpen(false)}
        />
      )}
    </AppShell>
  );
}

function App() {
  const { isAuthenticated, isLoading: authLoading, isCloudEnabled } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // Load exchange rates on mount
  useEffect(() => {
    const rates = loadPersistedRates();
    if (rates) {
      setExchangeRates(rates.rates || {});
    }
  }, []);

  // Update local state when rates change
  useEffect(() => {
    const handleStorageChange = () => {
      const rates = loadPersistedRates();
      if (rates) {
        setExchangeRates(rates.rates || {});
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRatesUpdate = useCallback((rates: Record<string, number>) => {
    setExchangeRates(rates);
  }, []);

  // Log auth state changes for debugging
  useEffect(() => {
    console.log('🔍 [App] Auth state:', { isAuthenticated, authLoading, isCloudEnabled });
  }, [isAuthenticated, authLoading, isCloudEnabled]);

  // Show loading skeleton while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <SkeletonDashboard />
      </div>
    );
  }

  // Show login form if cloud is enabled but user not authenticated
  if (isCloudEnabled && !isAuthenticated) {
    return <AuthForm />;
  }

  // Show main app
  return (
    <FinanceProvider exchangeRates={exchangeRates}>
      <DashboardContent onRatesUpdate={handleRatesUpdate} />
    </FinanceProvider>
  );
}

export default App;
