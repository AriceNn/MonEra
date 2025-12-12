import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { translateCategory } from '../../utils/i18n';

interface BudgetProgressBarProps {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  exceeded: boolean;
  alertThreshold: number;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  language: 'tr' | 'en';
}

export function BudgetProgressBar({
  category,
  spent,
  limit,
  percentage,
  exceeded,
  alertThreshold,
  currency,
  language,
}: BudgetProgressBarProps) {
  // Determine color based on percentage
  const getColor = () => {
    if (exceeded || percentage >= 100) {
      return 'bg-rose-500 dark:bg-rose-600';
    }
    if (percentage >= alertThreshold) {
      return 'bg-amber-500 dark:bg-amber-600';
    }
    return 'bg-emerald-500 dark:bg-emerald-600';
  };

  const getTextColor = () => {
    if (exceeded || percentage >= 100) {
      return 'text-rose-700 dark:text-rose-400';
    }
    if (percentage >= alertThreshold) {
      return 'text-amber-700 dark:text-amber-400';
    }
    return 'text-emerald-700 dark:text-emerald-400';
  };

  const getBgColor = () => {
    if (exceeded || percentage >= 100) {
      return 'bg-rose-50 dark:bg-rose-900/20';
    }
    if (percentage >= alertThreshold) {
      return 'bg-amber-50 dark:bg-amber-900/20';
    }
    return 'bg-emerald-50 dark:bg-emerald-900/20';
  };

  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()} border-slate-200 dark:border-slate-700`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {translateCategory(category, language)}
          </h3>
          {percentage >= alertThreshold && (
            <AlertTriangle
              size={16}
              className={exceeded ? 'text-rose-500' : 'text-amber-500'}
            />
          )}
        </div>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Spent vs Limit */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          {language === 'tr' ? 'Harcanan' : 'Spent'}: <span className="font-semibold">{formatCurrency(spent, currency, language)}</span>
        </span>
        <span className="text-slate-600 dark:text-slate-400">
          {language === 'tr' ? 'Limit' : 'Limit'}: <span className="font-semibold">{formatCurrency(limit, currency, language)}</span>
        </span>
      </div>

      {/* Warning Message */}
      {percentage >= alertThreshold && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className={`text-xs ${getTextColor()}`}>
            {exceeded
              ? (language === 'tr' ? 'Bütçe limiti aşıldı!' : 'Budget limit exceeded!')
              : (language === 'tr' ? `Bütçenizin %${alertThreshold}'ine ulaştınız` : `You've reached ${alertThreshold}% of your budget`)}
          </p>
        </div>
      )}
    </div>
  );
}
