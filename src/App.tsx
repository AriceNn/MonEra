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
import { generateFinancialSummary } from './utils/calculations';
import { convertCurrency, fetchLatestRates, updateExchangeRates, loadPersistedRates } from './utils/exchange';
import './index.css';

interface DashboardContentProps {
  onRatesUpdate: (rates: Record<string, number>) => void;
}

function DashboardContent({ onRatesUpdate }: DashboardContentProps) {
  const { transactions, settings, addTransaction, deleteTransaction, updateTransaction, updateSettings } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

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

  // Calculate cumulative wealth up to selected month
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
    const converted = filteredTransactions.map((t) => ({ ...t, amount: getDisplayAmount(t) }));
    return generateFinancialSummary(converted, selectedMonth, selectedYear);
  }, [filteredTransactions, selectedMonth, selectedYear, getDisplayAmount]);

  // State to trigger re-render when rates are loaded
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Fetch latest rates on initial mount and when currency changes
  useEffect(() => {
    let cancelled = false;
    
    const fetchRates = async () => {
      // First, load any cached rates immediately for instant display
      const cached = loadPersistedRates();
      if (cached) {
        setRatesLoaded(true);
      }
      
      // Then fetch fresh rates from API
      const base = settings.currency || 'USD';
      console.log('[App] Fetching fresh rates on mount/currency change');
      const rates = await fetchLatestRates(base);
      if (!cancelled) {
        updateExchangeRates(rates);
        onRatesUpdate(rates); // Update parent state
        setRatesLoaded(true); // Trigger re-render with fresh data
      }
    };
    
    fetchRates();
    return () => { cancelled = true; };
  }, [settings.currency]);

  // Get current exchange rate for display based on selected currency pair
  const currentRate = useMemo(() => {
    if (!ratesLoaded) return undefined; // Wait for rates to load
    
    try {
      const stored = window.localStorage.getItem('fintrack_exchange_rates');
      if (!stored) return undefined;
      const data = JSON.parse(stored);
      
      const pair = settings.currencyPair || 'TRY-USD';
      const [base, quote] = pair.split('-') as [string, string];
      
      console.log('[currentRate] Currency pair:', pair, 'Base:', base, 'Quote:', quote);
      console.log('[currentRate] Stored rates:', data.rates);
      
      const baseRate = data.rates?.[base] || 1;
      const quoteRate = data.rates?.[quote] || 1;
      
      // Calculate: 1 BASE = ? QUOTE
      const rate = quoteRate / baseRate;
      
      console.log('[currentRate] Rate:', `1 ${base} = ${rate} ${quote}`);
      return { rate, base, quote };
    } catch (err) {
      console.error('[currentRate] Error:', err);
      return undefined;
    }
  }, [settings.currency, settings.currencyPair, ratesLoaded]);

  const ratesUpdatedAt = useMemo(() => {
    if (!ratesLoaded) return undefined; // Wait for rates to load
    
    try {
      const stored = window.localStorage.getItem('fintrack_exchange_rates');
      if (!stored) return undefined;
      return JSON.parse(stored).updatedAt;
    } catch {
      return undefined;
    }
  }, [settings.currency, ratesLoaded]); // Re-calculate when currency changes (rates are fetched)

  return (
    <AppShell
      theme={settings.theme}
      language={settings.language}
      currency={settings.currency}
      onThemeToggle={handleThemeToggle}
      onLanguageToggle={handleLanguageToggle}
      onCurrencyToggle={handleCurrencyToggle}
      onSettingsClick={() => setIsSettingsOpen(true)}
      ratesUpdatedAt={ratesUpdatedAt}
      currentRate={currentRate}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {settings.language === 'tr' ? 'Panel' : 'Dashboard'}
          </h1>
           <TransactionForm mode="add" onSubmit={handleAddTransaction} language={settings.language} currency={settings.currency} />
        </div>

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

        {/* Settings Modal */}
        <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
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
