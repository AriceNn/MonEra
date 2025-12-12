// Transaction Types
export type TransactionType = 'income' | 'expense' | 'savings' | 'withdrawal';

// Transaction Model
export interface Transaction {
  id: string;           // UUID v4
  title: string;
  amount: number;       // Always positive number, calculated by type
  category: string;     // e.g., 'Food', 'Rent', 'Salary', 'Investment'
  date: string;         // ISO String (YYYY-MM-DD)
  type: TransactionType;
  description?: string; // Optional description
  isRecurring?: boolean; // Prepared for P2
}

// Global Application Settings
export interface AppSettings {
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  language: 'tr' | 'en';
  theme: 'light' | 'dark';
  inflationRate: number; // Annual % estimate for real return calculation
}

// Dashboard Summary (Calculated Data)
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  cashBalance: number;
  netWorth: number;
  savingsRate: number; // Percentage (e.g., 25.5)
}

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'TRY',
  language: 'tr',
  theme: 'light',
  inflationRate: 30.0,
};

// Transaction Categories
export const INCOME_CATEGORIES = [
  'Salary',
  'Investment Return',
  'Bonus',
  'Freelance',
  'Rental Income',
  'Pension',
  'Dividend',
  'Other Income',
];

export const SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Investment',
  'Retirement',
  'Goal Savings',
  'Other Savings',
];

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Rent',
  'Utilities',
  'Healthcare',
  'Education',
  'Entertainment',
  'Shopping',
  'Insurance',
  'Phone',
  'Internet',
  'Subscriptions',
  'Personal Care',
  'Other Expense',
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
