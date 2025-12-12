import { useState, useMemo, useEffect } from 'react';
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
import { convertCurrency, fetchLatestRates, updateExchangeRates } from './utils/exchange';
import './index.css';

function DashboardContent() {
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

  // Helper: Convert transaction amount to current display currency
  const getDisplayAmount = (transaction: Transaction): number => {
    if ((transaction as any).originalCurrency === settings.currency) {
      return transaction.amount;
    }
    const from = (transaction as any).originalCurrency || 'TRY';
    return convertCurrency(transaction.amount, from, settings.currency);
  };

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
  }, [transactions, selectedMonth, selectedYear, settings.currency]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    const converted = filteredTransactions.map((t) => ({ ...t, amount: getDisplayAmount(t) }));
    return generateFinancialSummary(converted, selectedMonth, selectedYear);
  }, [filteredTransactions, selectedMonth, selectedYear, settings.currency]);

  // Fetch latest exchange rates on load and when currency changes; refresh every 6 hours
  useEffect(() => {
    let cancelled = false;
    const loadRates = async () => {
      const base = settings.currency || 'USD';
      const rates = await fetchLatestRates(base);
      if (!cancelled) updateExchangeRates(rates);
    };
    loadRates();
    const interval = setInterval(loadRates, 6 * 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [settings.currency]);

  return (
    <AppShell
      theme={settings.theme}
      language={settings.language}
      currency={settings.currency}
      onThemeToggle={handleThemeToggle}
      onLanguageToggle={handleLanguageToggle}
      onCurrencyToggle={handleCurrencyToggle}
      onSettingsClick={() => setIsSettingsOpen(true)}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {settings.language === 'tr' ? 'Panel' : 'Dashboard'}
          </h1>
           <TransactionForm mode="add" onSubmit={addTransaction} language={settings.language} currency={settings.currency} />
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

        <Charts transactions={transactions} currency={settings.currency} language={settings.language} selectedMonth={selectedMonth} selectedYear={selectedYear} />

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
  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
}

export default App;
