// Transaction Types
export type TransactionType = 'income' | 'expense' | 'savings' | 'withdrawal';

// Recurring Frequency Types (P2)
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

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
  recurringId?: string; // Links to RecurringTransaction if auto-generated
  originalCurrency: 'TRY' | 'USD' | 'EUR' | 'GBP'; // Currency when transaction was created
}

// Recurring Transaction Model (P2)
export interface RecurringTransaction {
  id: string;               // UUID v4
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  frequency: RecurringFrequency;
  startDate: string;        // ISO String (YYYY-MM-DD) - When to start generating
  endDate?: string;         // ISO String (YYYY-MM-DD) - Optional end date
  lastGenerated?: string;   // ISO String (YYYY-MM-DD) - Last date a transaction was generated from this template
  nextOccurrence: string;   // ISO String (YYYY-MM-DD) - Next scheduled occurrence date
  isActive: boolean;        // Can be paused/resumed
  description?: string;
  originalCurrency: 'TRY' | 'USD' | 'EUR' | 'GBP';
}

// Budget Model (P2 Sprint 2)
export interface CategoryBudget {
  id: string;               // UUID v4
  category: string;         // Category name (must match EXPENSE_CATEGORIES)
  monthlyLimit: number;     // Monthly spending limit for this category
  alertThreshold: number;   // Percentage (0-100) when to show alert (e.g., 80)
  isActive: boolean;        // Enable/disable budget tracking
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP'; // Currency for the limit
}

// Currency Pair Type
export type CurrencyPair = 'TRY-USD' | 'USD-TRY' | 'EUR-USD' | 'USD-EUR' | 'TRY-EUR' | 'EUR-TRY' | 'GBP-USD' | 'USD-GBP';

// Global Application Settings
export interface AppSettings {
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  currencyPair?: CurrencyPair; // Display currency pair for rates
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

// P1: Filter & Export Data Models
export interface FilterCriteria {
  startDate?: string;     // ISO format YYYY-MM-DD
  endDate?: string;       // ISO format YYYY-MM-DD
  category?: string;      // Optional category filter
  type?: TransactionType; // Optional transaction type filter
}

export interface CategoryExpenseData {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExportedData {
  transactions: Transaction[];
  settings: AppSettings;
  exportedAt: string; // ISO timestamp
}

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'TRY',
  currencyPair: 'TRY-USD',
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
