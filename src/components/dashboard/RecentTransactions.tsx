import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Trash2, Edit2 } from 'lucide-react';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { t } from '../../utils/i18n';
import type { Transaction } from '../../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency: string;
  language: string;
  onDelete: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  limit?: number;
}

export function RecentTransactions({
  transactions,
  currency,
  language,
  onDelete,
  onEdit,
  limit = 5,
}: RecentTransactionsProps) {
  const recent = transactions.slice(0, limit);

  if (recent.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">{t('noTransactions', language as 'tr' | 'en')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{language === 'tr' ? 'Son İşlemler' : 'Recent Transactions'}</h3>
      <div className="space-y-3">
        {recent.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <Badge
                    category={transaction.category}
                    variant={transaction.type === 'income' ? 'income' : transaction.type === 'savings' ? 'savings' : 'expense'}
                    size="sm"
                    language={language as 'tr' | 'en'}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{transaction.title}</p>
                  {transaction.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{transaction.description}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateShort(transaction.date, language as any)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 
                  transaction.type === 'savings' ? 'text-purple-600 dark:text-purple-400' :
                  transaction.type === 'withdrawal' ? 'text-orange-600 dark:text-orange-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount, currency as any)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {transaction.type === 'income' ? (language === 'tr' ? 'Gelir' : 'Income') :
                   transaction.type === 'savings' ? (language === 'tr' ? 'Tasarruf' : 'Savings') :
                   transaction.type === 'withdrawal' ? (language === 'tr' ? 'Tasarruftan Çıkış' : 'Withdrawal') :
                   (language === 'tr' ? 'Gider' : 'Expense')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                {onEdit && (
                  <button
                    onClick={() => onEdit(transaction)}
                    className="p-1.5 rounded"
                    aria-label={language === 'tr' ? 'Düzenle' : 'Edit'}
                  >
                    <Edit2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(transaction.id)}
                  className="p-1.5 rounded"
                  aria-label={language === 'tr' ? 'Sil' : 'Delete'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
