import { useState, useMemo } from 'react';
import type { Transaction } from './types';
import { FinanceProvider } from './context/FinanceContext';
import { useFinance } from './hooks/useFinance';
import { AppShell } from './components/layout/AppShell';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { MonthSelector } from './components/dashboard/MonthSelector';
import { Charts } from './components/dashboard/Charts';
import { TransactionForm } from './components/transactions/TransactionForm';
import { generateFinancialSummary } from './utils/calculations';
import './index.css';

function DashboardContent() {
  const { transactions, settings, addTransaction, deleteTransaction, updateTransaction, updateSettings } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleLanguageToggle = () => {
    updateSettings({ language: settings.language === 'tr' ? 'en' : 'tr' });
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
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
          cumulative += t.amount;
        } else {
          cumulative -= t.amount;
        }
      }
    });
    return cumulative;
  }, [transactions, selectedMonth, selectedYear]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    return generateFinancialSummary(filteredTransactions, selectedMonth, selectedYear);
  }, [filteredTransactions, selectedMonth, selectedYear]);

  return (
    <AppShell
      theme={settings.theme}
      language={settings.language}
      onThemeToggle={handleThemeToggle}
      onLanguageToggle={handleLanguageToggle}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {settings.language === 'tr' ? 'Panel' : 'Dashboard'}
          </h1>
          <TransactionForm mode="add" onSubmit={addTransaction} language={settings.language} />
        </div>

        <MonthSelector
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={handleMonthChange}
          language={settings.language}
        />

        <SummaryCards summary={summary} currency={settings.currency} language={settings.language} cumulativeWealth={cumulativeWealth} />

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
          />
        )}
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
