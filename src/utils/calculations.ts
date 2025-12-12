import type { Transaction, FinancialSummary } from '../types';

/**
 * Calculate total income from transactions
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total expenses from transactions
 */
export function calculateTotalExpense(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total savings (only savings transactions)
 */
export function calculateTotalSavings(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total withdrawals (only withdrawal transactions)
 */
export function calculateTotalWithdrawals(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate net savings (savings - withdrawals)
 */
export function calculateNetSavings(transactions: Transaction[]): number {
  return calculateTotalSavings(transactions) - calculateTotalWithdrawals(transactions);
}

/**
 * Calculate cumulative net savings up to given month/year (for wealth card)
 */
export function calculateCumulativeSavings(transactions: Transaction[], upToMonth: number, upToYear: number): number {
  const relevantTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    const transYear = date.getFullYear();
    const transMonth = date.getMonth();
    
    // Include if before this month, or same year/month
    if (transYear < upToYear) return true;
    if (transYear === upToYear && transMonth <= upToMonth) return true;
    return false;
  });
  
  return calculateNetSavings(relevantTransactions);
}

/**
 * Calculate monthly cash balance (income - expense - savings + withdrawals)
 */
export function calculateCashBalance(transactions: Transaction[]): number {
  // Cash balance = income - expense - savings + withdrawals
  // When you save money, it leaves your cash balance
  // When you withdraw from savings, it returns to cash balance
  const income = calculateTotalIncome(transactions);
  const expense = calculateTotalExpense(transactions);
  const savings = calculateTotalSavings(transactions);
  const withdrawals = calculateTotalWithdrawals(transactions);
  
  return income - expense - savings + withdrawals;
}

/**
 * Calculate net worth - CUMULATIVE wealth from all savings
 * Only considers savings/withdrawals, not income-expense
 */
export function calculateNetWorth(transactions: Transaction[], upToMonth: number, upToYear: number): number {
  return calculateCumulativeSavings(transactions, upToMonth, upToYear);
}

/**
 * Calculate savings rate as percentage
 * Formula: Monthly Savings / Monthly Income * 100
 */
export function calculateSavingsRate(transactions: Transaction[]): number {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpense = calculateTotalExpense(transactions);
  if (totalIncome === 0) return 0;
  // Savings rate defined as (Income - Expense) / Income * 100
  const savingsPortion = totalIncome - totalExpense;
  return (savingsPortion / totalIncome) * 100;
}

/**
 * Calculate real wealth considering inflation
 * Real Value = Nominal Value / (1 + inflation_rate)^years
 */
export function calculateRealWealth(
  nominalValue: number,
  inflationRate: number,
  years: number = 1
): number {
  const realRate = Math.pow(1 + inflationRate / 100, years);
  return nominalValue / realRate;
}

/**
 * Generate financial summary for monthly dashboard
 */
export function generateFinancialSummary(transactions: Transaction[], month: number, year: number): FinancialSummary {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpense = calculateTotalExpense(transactions);
  const totalSavings = calculateNetSavings(transactions); // Net savings (savings - withdrawals)
  const cashBalance = calculateCashBalance(transactions);
  const netWorth = calculateNetWorth(transactions, month, year); // Cumulative
  
  return {
    totalIncome,
    totalExpense,
    totalSavings,
    cashBalance,
    netWorth,
    savingsRate: calculateSavingsRate(transactions),
  };
}

/**
 * Filter transactions by date range
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter(
    (t) => t.date >= startDate && t.date <= endDate
  );
}

/**
 * Group transactions by category
 */
export function groupTransactionsByCategory(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  return transactions.reduce(
    (acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = [];
      }
      acc[transaction.category].push(transaction);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );
}

/**
 * P1: Calculate real wealth by month (inflation-adjusted)
 * Real Value = Nominal Value / (1 + inflation_rate)^years_since_month
 */
export function calculateRealWealthByMonth(
  transactions: Transaction[],
  month: number,
  year: number,
  inflationRate: number,
  currentYear: number,
  currentMonth: number
): number {
  const nominalWealth = calculateNetWorth(transactions, month, year);
  const yearsPassed = currentYear - year + (currentMonth - month) / 12;
  if (yearsPassed <= 0) return nominalWealth;
  return calculateRealWealth(nominalWealth, inflationRate, yearsPassed);
}

/**
 * P1: Calculate expenses by category
 */
export interface CategoryExpenseData { category: string; amount: number; percentage: number; }
export function calculateExpensesByCategory(transactions: Transaction[]): CategoryExpenseData[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  if (totalExpenses === 0) return [];

  const grouped = groupTransactionsByCategory(expenses);
  return Object.entries(grouped)
    .map(([category, items]) => {
      const amount = items.reduce((sum, t) => sum + t.amount, 0);
      return { category, amount, percentage: (amount / totalExpenses) * 100 };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * P1: Filter transactions by criteria
 */
export interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: Transaction['type'];
}
export function filterTransactionsByCriteria(transactions: Transaction[], criteria: FilterCriteria): Transaction[] {
  return transactions.filter((t) => {
    if (criteria.startDate && t.date < criteria.startDate) return false;
    if (criteria.endDate && t.date > criteria.endDate) return false;
    if (criteria.category && t.category !== criteria.category) return false;
    if (criteria.type && t.type !== criteria.type) return false;
    return true;
  });
}

/**
 * P1: Format transactions as CSV string
 */
export function transactionsToCSV(transactions: Transaction[], language: 'tr' | 'en'): string {
  const headers = language === 'tr'
    ? ['Başlık', 'Tutar', 'Kategori', 'Tarih', 'Tür', 'Açıklama']
    : ['Title', 'Amount', 'Category', 'Date', 'Type', 'Description'];

  const rows = transactions.map((t) => [
    `"${t.title.replace(/"/g, '""')}"`,
    t.amount,
    t.category,
    t.date,
    t.type,
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
