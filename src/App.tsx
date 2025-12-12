import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction } from './types';
import { FinanceProvider } from './context/FinanceContext';
import { useFinance } from './hooks/useFinance';
import { AppShell } from './components/layout/AppShell';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { MonthSelector } from './components/dashboard/MonthSelector';
import { Charts } from './components/dashboard/Charts';
import { TransactionForm } from './components/transactions/TransactionForm';
import { SettingsPage } from './pages/SettingsPage';
import { RecurringTransactionsPage } from './pages/RecurringTransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationSettingsPanel } from './components/notifications/NotificationSettingsPanel';
import { SkeletonDashboard } from './components/ui/Skeleton';
import { NoTransactionsEmpty } from './components/ui/EmptyState';
import { generateFinancialSummary } from './utils/calculations';
import { convertCurrency, fetchLatestRates, updateExchangeRates, loadPersistedRates } from './utils/exchange';
import './index.css';

// Load test utilities in development
if (import.meta.env.DEV) {
  import('./db/testMigration').then(module => {
    (window as any).FinTrackTest = {
      generateMockData: module.generateMockData,
      testMigration: module.testMigration,
      benchmarkPerformance: module.benchmarkPerformance,
      testRollback: module.testRollback,
      runAllTests: module.runAllTests
    };
    console.log('🧪 FinTrack Test Suite Loaded');
    console.log('Available commands:');
    console.log('  FinTrackTest.generateMockData(1000) - Generate 1000 mock transactions');
    console.log('  FinTrackTest.testMigration() - Test localStorage → IndexedDB migration');
    console.log('  FinTrackTest.benchmarkPerformance() - Compare query performance');
    console.log('  FinTrackTest.testRollback() - Test IndexedDB → localStorage rollback');
    console.log('  FinTrackTest.runAllTests() - Run complete test suite');
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

  // Auto-generate recurring transactions on mount
  useEffect(() => {
    const count = generateRecurringTransactions();
    if (count > 0) {
      console.log(`[Auto-Generated] ${count} recurring transactions created`);
    }
  }, [generateRecurringTransactions]);

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleLanguageToggle = () => {
    updateSettings({ language: settings.language === 'tr' ? 'en' : 'tr' });
  };

  const handleCurrencyToggle = () => {
    const newCurrency = settings.currency === 'TRY' ? 'USD' : 'TRY';
    // Just update the display currency - no transaction conversion needed
    updateSettings({ currency: newCurrency });
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Wrap addTransaction to automatically switch to the transaction's month
  const handleAddTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const result = addTransaction(transaction);
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
      loadPersistedRates();
      
      // Then fetch fresh rates from API
      const base = settings.currency || 'USD';
      console.log('[App] Fetching fresh rates on mount/currency change');
      const rates = await fetchLatestRates(base);
      if (!cancelled) {
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
              onSubmit={(data) => {
                const ok = updateTransaction(editingTransaction.id, data);
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
        <TransactionsPage
          language={settings.language}
          currency={settings.currency}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}

      {/* Recurring Transactions Page */}
      {currentPage === 'recurring' && (
        <RecurringTransactionsPage
          language={settings.language}
          currency={settings.currency}
        />
      )}

      {/* Budget Page */}
      {currentPage === 'budget' && (
        <BudgetPage
          language={settings.language}
          currency={settings.currency}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}

      {/* Analytics Page */}
      {currentPage === 'analytics' && (
        <AnalyticsPage
          transactions={transactions}
          language={settings.language}
          currency={settings.currency}
          getDisplayAmount={getDisplayAmount}
        />
      )}

      {/* Settings Modal */}
      <SettingsPage isOpen={isSettingsOpen || currentPage === 'settings'} onClose={() => { setIsSettingsOpen(false); setCurrentPage('dashboard'); }} />

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

  return (
    <FinanceProvider exchangeRates={exchangeRates}>
      <DashboardContent onRatesUpdate={handleRatesUpdate} />
    </FinanceProvider>
  );
}

export default App;
