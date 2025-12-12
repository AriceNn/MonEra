import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Award, Download, FileText, BarChart2 } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { translateCategory } from '../utils/i18n';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../components/ui/Card';
import { DateRangeSelector, type DateRange } from '../components/analytics/DateRangeSelector';
import { Button } from '../components/ui/Button';
import { exportTransactionsCSV, exportMonthlyBreakdownCSV, exportCategoryBreakdownCSV, exportAnalyticsSummaryCSV } from '../utils/export';

interface AnalyticsPageProps {
  transactions: Transaction[];
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  getDisplayAmount: (transaction: Transaction) => number;
}

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  savings: '#3b82f6',
  categories: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316']
};

export function AnalyticsPage({ transactions, language, currency, getDisplayAmount }: AnalyticsPageProps) {
  // Date range state (default: last 6 months)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    return { start, end, preset: '6m' };
  });

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= dateRange.start && tDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Calculate spending trends over the selected date range
  const spendingTrends = useMemo(() => {
    const end = new Date(dateRange.end);
    const months: { month: string; income: number; expense: number; savings: number; net: number }[] = [];
    
    // Calculate number of months to display (max 12)
    const start = new Date(dateRange.start);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const monthsToShow = Math.min(monthsDiff + 1, 12);
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', year: '2-digit' });
      
      const monthTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + getDisplayAmount(t), 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + getDisplayAmount(t), 0);
      
      const savings = monthTransactions
        .filter(t => t.type === 'savings')
        .reduce((sum, t) => sum + getDisplayAmount(t), 0);
      
      months.push({
        month: monthKey,
        income,
        expense,
        savings,
        net: income - expense
      });
    }
    
    return months;
  }, [filteredTransactions, language, getDisplayAmount, dateRange]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const amount = getDisplayAmount(t);
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + amount);
      });
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category: translateCategory(category, language),
        amount,
        percentage: 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((item, _, arr) => {
        const total = arr.reduce((sum, i) => sum + i.amount, 0);
        return {
          ...item,
          percentage: total > 0 ? (item.amount / total) * 100 : 0
        };
      });
  }, [filteredTransactions, language, getDisplayAmount]);

  // Financial insights (based on filtered transactions)
  const insights = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + getDisplayAmount(t), 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + getDisplayAmount(t), 0);

    const totalSavings = filteredTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + getDisplayAmount(t), 0);

    const biggestExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => getDisplayAmount(b) - getDisplayAmount(a))[0];

    // Calculate days in range
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailySpending = daysDiff > 0 ? totalExpense / daysDiff : 0;

    const topCategory = categoryBreakdown[0];

    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      totalSavings,
      netIncome: totalIncome - totalExpense,
      biggestExpense,
      avgDailySpending,
      topCategory,
      savingsRate,
      dayCount: daysDiff
    };
  }, [filteredTransactions, categoryBreakdown, getDisplayAmount, dateRange]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {language === 'tr' ? 'Finansal Analiz' : 'Financial Analytics'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {language === 'tr' 
              ? 'Gelir, gider ve tasarruf trendlerinizi analiz edin' 
              : 'Analyze your income, expense, and savings trends'}
          </p>
        </div>
        <div className="relative">
          <Button
            variant="secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {language === 'tr' ? 'Dışa Aktar' : 'Export'}
          </Button>
          
          {/* Export Dropdown Menu */}
          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      exportTransactionsCSV({
                        transactions: filteredTransactions,
                        language,
                        currency,
                        getDisplayAmount,
                        dateRange
                      });
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div className="text-left">
                      <div className="font-medium">
                        {language === 'tr' ? 'İşlem Listesi (CSV)' : 'Transaction List (CSV)'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {filteredTransactions.length} {language === 'tr' ? 'işlem' : 'transactions'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportMonthlyBreakdownCSV(spendingTrends, language, currency);
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div className="text-left">
                      <div className="font-medium">
                        {language === 'tr' ? 'Aylık Özet (CSV)' : 'Monthly Summary (CSV)'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {spendingTrends.length} {language === 'tr' ? 'ay' : 'months'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      const categoryDataWithCount = categoryBreakdown.map(c => ({
                        ...c,
                        count: filteredTransactions.filter(t => translateCategory(t.category, language) === c.category).length
                      }));
                      exportCategoryBreakdownCSV(categoryDataWithCount, language, currency);
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <BarChart2 className="w-4 h-4 text-slate-500" />
                    <div className="text-left">
                      <div className="font-medium">
                        {language === 'tr' ? 'Kategori Dağılımı (CSV)' : 'Category Breakdown (CSV)'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {categoryBreakdown.length} {language === 'tr' ? 'kategori' : 'categories'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportAnalyticsSummaryCSV(
                        {
                          transactions: filteredTransactions,
                          language,
                          currency,
                          getDisplayAmount,
                          dateRange
                        },
                        insights
                      );
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <div className="text-left">
                      <div className="font-medium">
                        {language === 'tr' ? 'Analiz Özeti (CSV)' : 'Analytics Summary (CSV)'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {language === 'tr' ? 'Tüm metrikler' : 'All metrics'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4">
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          language={language}
        />
      </Card>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {language === 'tr' ? 'Toplam Gelir' : 'Total Income'}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(insights.totalIncome, currency, language)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'tr' ? `${insights.dayCount} gün` : `${insights.dayCount} days`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        {/* Total Expense */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {language === 'tr' ? 'Toplam Gider' : 'Total Expense'}
              </p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(insights.totalExpense, currency, language)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'tr' ? `${insights.dayCount} gün` : `${insights.dayCount} days`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        {/* Average Daily Spending */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {language === 'tr' ? 'Günlük Ortalama' : 'Daily Average'}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(insights.avgDailySpending, currency, language)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'tr' ? 'Harcama' : 'Spending'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Savings Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {language === 'tr' ? 'Tasarruf Oranı' : 'Savings Rate'}
              </p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {insights.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'tr' ? 'Gelirden' : 'Of Income'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {language === 'tr' ? 'Gelir & Gider Trendi' : 'Income & Expense Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={spendingTrends}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.income} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                fontSize={12}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tick={{ fill: '#64748b' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => formatCurrency(value, currency, language)}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => {
                  if (value === 'income') return language === 'tr' ? 'Gelir' : 'Income';
                  if (value === 'expense') return language === 'tr' ? 'Gider' : 'Expense';
                  return value;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke={COLORS.income} 
                fillOpacity={1}
                fill="url(#colorIncome)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                stroke={COLORS.expense} 
                fillOpacity={1}
                fill="url(#colorExpense)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {language === 'tr' ? 'Kategori Dağılımı' : 'Category Breakdown'}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryBreakdown} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
              <XAxis 
                type="number" 
                stroke="#64748b" 
                fontSize={12}
                tick={{ fill: '#64748b' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <YAxis 
                type="category" 
                dataKey="category" 
                stroke="#64748b" 
                fontSize={11}
                tick={{ fill: '#64748b' }}
                width={100}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => formatCurrency(value, currency, language)}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {categoryBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.categories[index % COLORS.categories.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biggest Expense */}
        {insights.biggestExpense && (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {language === 'tr' ? 'En Büyük Harcama' : 'Biggest Expense'}
                </h3>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {insights.biggestExpense.title}
                </p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1">
                  {formatCurrency(getDisplayAmount(insights.biggestExpense), currency, language)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {translateCategory(insights.biggestExpense.category, language)} • {new Date(insights.biggestExpense.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Top Category */}
        {insights.topCategory && (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {language === 'tr' ? 'En Çok Harcanan Kategori' : 'Top Spending Category'}
                </h3>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {insights.topCategory.category}
                </p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(insights.topCategory.amount, currency, language)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {language === 'tr' ? 'Toplam harcamanın' : 'Of total spending'} %{insights.topCategory.percentage.toFixed(1)}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
