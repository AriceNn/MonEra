import { Card } from '../ui/Card';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { t } from '../../utils/i18n';
import { type FinancialSummary } from '../../types';
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';

interface SummaryCardsProps {
  summary: FinancialSummary;
  currency: string;
  language: 'tr' | 'en';
  cumulativeWealth?: number;
}

export function SummaryCards({ summary, currency, language, cumulativeWealth = summary?.netWorth ?? 0 }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-5 gap-4 mb-6\">
      {/* Total Income Card */}
      <Card className="p-4 md:col-span-2 lg:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{t('income', language)}</p>
            <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatCurrency(summary?.totalIncome ?? 0, currency as any)}
            </p>
          </div>
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex-shrink-0">
            <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={16} />
          </div>
        </div>
      </Card>

      {/* Total Expense Card */}
      <Card className="p-4 md:col-span-2 lg:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{t('expense', language)}</p>
            <p className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 truncate">
              {formatCurrency(summary?.totalExpense ?? 0, currency as any)}
            </p>
          </div>
          <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-md flex-shrink-0">
            <TrendingDown className="text-rose-600 dark:text-rose-400" size={16} />
          </div>
        </div>
      </Card>

      {/* Cash Balance Card */}
      <Card className="p-4 md:col-span-2 lg:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{t('cashBalance', language)}</p>
            <p className={`text-base md:text-lg font-bold mt-1 truncate ${
              (summary?.cashBalance ?? 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(summary?.cashBalance ?? 0, currency as any)}
            </p>
          </div>
          <div className={`p-1.5 rounded-md flex-shrink-0 ${
            (summary?.cashBalance ?? 0) >= 0 
              ? 'bg-blue-100 dark:bg-blue-900/30' 
              : 'bg-rose-100 dark:bg-rose-900/30'
          }`}>
            <Wallet className={(summary?.cashBalance ?? 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'} size={16} />
          </div>
        </div>
      </Card>

      {/* Savings Rate Card - 50% width on tablet */}
      <Card className="p-4 md:col-span-3 lg:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{t('saveRate', language)}</p>
            <p className={`text-base md:text-lg font-bold mt-1 truncate ${
              (summary?.savingsRate ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
            }`}>
              {formatPercentage(summary?.savingsRate ?? 0)}
            </p>
          </div>
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex-shrink-0">
            <Target className="text-emerald-600 dark:text-emerald-400" size={16} />
          </div>
        </div>
      </Card>

      {/* Net Worth Card - Full width on mobile, 50% on tablet */}
      <Card className="p-4 col-span-2 md:col-span-3 lg:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{t('netWorth', language)}</p>
            <p className={`text-base md:text-lg font-bold mt-1 truncate ${
              (cumulativeWealth ?? 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(cumulativeWealth ?? 0, currency as any)}
            </p>
          </div>
          <div className={`p-1.5 rounded-md flex-shrink-0 ${
            (cumulativeWealth ?? 0) >= 0 
              ? 'bg-indigo-100 dark:bg-indigo-900/30' 
              : 'bg-rose-100 dark:bg-rose-900/30'
          }`}>
            <Wallet className={(cumulativeWealth ?? 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'} size={16} />
          </div>
        </div>
      </Card>
    </div>
  );
}
