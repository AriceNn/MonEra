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
 * Calculate total savings from transactions (savings - withdrawals)
 */
export function calculateTotalSavings(transactions: Transaction[]): number {
  const savings = transactions
    .filter((t) => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const withdrawals = transactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return savings - withdrawals;
}

/**
 * Calculate cumulative savings up to given month/year (for wealth card)
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
  
  return calculateTotalSavings(relevantTransactions);
}

/**
 * Calculate monthly cash balance (income - expense - savings for that month only)
 */
export function calculateCashBalance(transactions: Transaction[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpense(transactions) - calculateTotalSavings(transactions);
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
  const totalSavings = calculateTotalSavings(transactions);
  if (totalIncome === 0) return 0;
  return (totalSavings / totalIncome) * 100;
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
  const totalSavings = calculateTotalSavings(transactions);
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
