import Papa from 'papaparse';
import type { Transaction } from '../types';
import { translateCategory } from './i18n';

interface ExportOptions {
  transactions: Transaction[];
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  getDisplayAmount: (transaction: Transaction) => number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  savings: number;
  net: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export function exportTransactionsCSV(options: ExportOptions): void {
  const { transactions, language, currency, getDisplayAmount } = options;
  
  const csvData = transactions.map(t => ({
    [language === 'tr' ? 'Tarih' : 'Date']: new Date(t.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US'),
    [language === 'tr' ? 'Başlık' : 'Title']: t.title,
    [language === 'tr' ? 'Kategori' : 'Category']: translateCategory(t.category, language),
    [language === 'tr' ? 'Tip' : 'Type']: language === 'tr' 
      ? (t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : 'Tasarruf')
      : (t.type === 'income' ? 'Income' : t.type === 'expense' ? 'Expense' : 'Savings'),
    [language === 'tr' ? 'Tutar' : 'Amount']: getDisplayAmount(t).toFixed(2),
    [language === 'tr' ? 'Para Birimi' : 'Currency']: currency,
    [language === 'tr' ? 'Açıklama' : 'Description']: t.description || ''
  }));

  const csv = Papa.unparse(csvData);
  downloadFile(csv, `fintrack-transactions-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportMonthlyBreakdownCSV(monthlyData: MonthlyData[], language: 'tr' | 'en', currency: string): void {
  const csvData = monthlyData.map(m => ({
    [language === 'tr' ? 'Ay' : 'Month']: m.month,
    [language === 'tr' ? 'Gelir' : 'Income']: m.income.toFixed(2),
    [language === 'tr' ? 'Gider' : 'Expense']: m.expense.toFixed(2),
    [language === 'tr' ? 'Tasarruf' : 'Savings']: m.savings.toFixed(2),
    [language === 'tr' ? 'Net' : 'Net']: m.net.toFixed(2),
    [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
  }));

  const csv = Papa.unparse(csvData);
  downloadFile(csv, `fintrack-monthly-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportCategoryBreakdownCSV(categoryData: CategoryData[], language: 'tr' | 'en', currency: string): void {
  const csvData = categoryData.map(c => ({
    [language === 'tr' ? 'Kategori' : 'Category']: c.category,
    [language === 'tr' ? 'Tutar' : 'Amount']: c.amount.toFixed(2),
    [language === 'tr' ? 'Yüzde' : 'Percentage']: c.percentage.toFixed(2) + '%',
    [language === 'tr' ? 'İşlem Sayısı' : 'Transaction Count']: c.count,
    [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
  }));

  const csv = Papa.unparse(csvData);
  downloadFile(csv, `fintrack-categories-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportAnalyticsSummaryCSV(options: ExportOptions, insights: any): void {
  const { language, currency, dateRange } = options;
  
  const summaryData = [
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Toplam Gelir' : 'Total Income',
      [language === 'tr' ? 'Değer' : 'Value']: insights.totalIncome.toFixed(2),
      [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
    },
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Toplam Gider' : 'Total Expense',
      [language === 'tr' ? 'Değer' : 'Value']: insights.totalExpense.toFixed(2),
      [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
    },
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Toplam Tasarruf' : 'Total Savings',
      [language === 'tr' ? 'Değer' : 'Value']: insights.totalSavings.toFixed(2),
      [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
    },
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Net Gelir' : 'Net Income',
      [language === 'tr' ? 'Değer' : 'Value']: insights.netIncome.toFixed(2),
      [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
    },
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Günlük Ortalama Harcama' : 'Average Daily Spending',
      [language === 'tr' ? 'Değer' : 'Value']: insights.avgDailySpending.toFixed(2),
      [language === 'tr' ? 'Para Birimi' : 'Currency']: currency
    },
    {
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Tasarruf Oranı' : 'Savings Rate',
      [language === 'tr' ? 'Değer' : 'Value']: insights.savingsRate.toFixed(2) + '%',
      [language === 'tr' ? 'Para Birimi' : 'Currency']: 'N/A'
    }
  ];

  if (dateRange) {
    summaryData.unshift({
      [language === 'tr' ? 'Metrik' : 'Metric']: language === 'tr' ? 'Tarih Aralığı' : 'Date Range',
      [language === 'tr' ? 'Değer' : 'Value']: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
      [language === 'tr' ? 'Para Birimi' : 'Currency']: 'N/A'
    });
  }

  const csv = Papa.unparse(summaryData);
  downloadFile(csv, `fintrack-summary-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
