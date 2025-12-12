import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { useFinance } from '../hooks/useFinance';
import { TransactionForm } from '../components/transactions/TransactionForm';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { t, translateCategory } from '../utils/i18n';
import { Pencil, Trash2, Search, Filter, X } from 'lucide-react';
import { convertCurrency } from '../utils/exchange';

interface TransactionsPageProps {
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  selectedMonth: number;
  selectedYear: number;
}

export function TransactionsPage({ language, currency }: TransactionsPageProps) {
  const { transactions, deleteTransaction, updateTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter (title or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRangeStart));
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRangeEnd));
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [transactions, searchQuery, filterType, filterCategory, dateRangeStart, dateRangeEnd]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSavings = 0;

    filteredTransactions.forEach(t => {
      const from = (t as any).originalCurrency || 'TRY';
      const amount = from === currency ? t.amount : convertCurrency(t.amount, from, currency);
      
      if (t.type === 'income') totalIncome += amount;
      else if (t.type === 'expense') totalExpense += amount;
      else if (t.type === 'savings') totalSavings += amount;
      else if (t.type === 'withdrawal') totalSavings -= amount;
    });

    return { totalIncome, totalExpense, totalSavings, count: filteredTransactions.length };
  }, [filteredTransactions, currency]);

  const handleDelete = (id: string) => {
    if (window.confirm(language === 'tr' ? 'Bu işlemi silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleUpdate = (data: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      const ok = updateTransaction(editingTransaction.id, data);
      if (ok !== false) {
        setEditingTransaction(undefined);
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterCategory('all');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterCategory !== 'all' || dateRangeStart || dateRangeEnd;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'tr' ? 'Tüm İşlemler' : 'All Transactions'}
        </h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'tr' ? 'Toplam İşlem' : 'Total Transactions'}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('income', language)}</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome, currency as any)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('expense', language)}</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpense, currency as any)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('savings', language)}</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSavings, currency as any)}</p>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'tr' ? 'İşlem ara...' : 'Search transactions...'}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              {language === 'tr' ? 'Filtrele' : 'Filter'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <X className="w-5 h-5" />
                {language === 'tr' ? 'Temizle' : 'Clear'}
              </button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'tr' ? 'İşlem Tipi' : 'Transaction Type'}
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{language === 'tr' ? 'Tümü' : 'All'}</option>
                  <option value="income">{t('income', language)}</option>
                  <option value="expense">{t('expense', language)}</option>
                  <option value="savings">{t('savings', language)}</option>
                  <option value="withdrawal">{t('withdrawal', language)}</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('category', language)}
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{language === 'tr' ? 'Tümü' : 'All'}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{translateCategory(cat, language)}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'tr' ? 'Başlangıç Tarihi' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'tr' ? 'Bitiş Tarihi' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          {language === 'tr' ? 'İşlem bulunamadı.' : 'No transactions found.'}
        </Card>
      ) : (
        <>
          {/* Desktop/Tablet Table View */}
          <Card className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('date', language)}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('title', language)}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('category', language)}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {language === 'tr' ? 'Tip' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('amount', language)}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {language === 'tr' ? 'İşlemler' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTransactions.map((transaction) => {
                    const from = (transaction as any).originalCurrency || 'TRY';
                    const displayAmount = from === currency 
                      ? transaction.amount 
                      : convertCurrency(transaction.amount, from, currency);

                    const typeColors = {
                      income: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
                      expense: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
                      savings: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
                      withdrawal: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
                    };

                    return (
                      <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {new Date(transaction.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{transaction.title || '-'}</p>
                            {transaction.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{transaction.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {translateCategory(transaction.category, language)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[transaction.type]}`}>
                            {t(transaction.type === 'income' ? 'income' : 
                               transaction.type === 'expense' ? 'expense' : 
                               transaction.type === 'savings' ? 'savings' : 'withdrawal', language)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900 dark:text-white">
                          {formatCurrency(displayAmount, currency as any)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={t('edit', language)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('delete', language)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.map((transaction) => {
              const from = (transaction as any).originalCurrency || 'TRY';
              const displayAmount = from === currency 
                ? transaction.amount 
                : convertCurrency(transaction.amount, from, currency);

              const typeColors = {
                income: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40',
                expense: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40',
                savings: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/40',
                withdrawal: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/40',
              };

              return (
                <Card key={transaction.id} className={`p-4 border-l-4 ${typeColors[transaction.type]}`}>
                  {/* Header: Date & Amount */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {new Date(transaction.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {transaction.title || '-'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' :
                        transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                        transaction.type === 'savings' ? 'text-purple-600 dark:text-purple-400' :
                        'text-orange-600 dark:text-orange-400'
                      }`}>
                        {formatCurrency(displayAmount, currency as any)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {transaction.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {transaction.description}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[transaction.type]}`}>
                        {t(transaction.type === 'income' ? 'income' : 
                           transaction.type === 'expense' ? 'expense' : 
                           transaction.type === 'savings' ? 'savings' : 'withdrawal', language)}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {translateCategory(transaction.category, language)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('edit', language)}
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('delete', language)}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <TransactionForm
          mode="edit"
          transaction={editingTransaction}
          onSubmit={handleUpdate}
          onClose={() => setEditingTransaction(undefined)}
          triggerButton={false}
          language={language}
          currency={currency}
        />
      )}
    </div>
  );
}
