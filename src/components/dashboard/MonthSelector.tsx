import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

interface MonthSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  language?: 'tr' | 'en';
}

export function MonthSelector({
  selectedMonth,
  selectedYear,
  onMonthChange,
  language = 'tr',
}: MonthSelectorProps) {
  const months = language === 'tr' ? MONTHS_TR : MONTHS;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange(11, selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onMonthChange(0, selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1, selectedYear);
    }
  };

  // Calculate previous month
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  // Calculate next month
  const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;

  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;

  return (
    <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div className="text-left">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {months[prevMonth]}
          </div>
          <div className="text-xs text-slate-300 dark:text-slate-600">
            {prevYear}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {months[selectedMonth]} {selectedYear}
        </h2>
        {isCurrentMonth && (
          <span className="hidden md:inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-md">
            {language === 'tr' ? 'Şimdi' : 'Now'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {months[nextMonth]}
          </div>
          <div className="text-xs text-slate-300 dark:text-slate-600">
            {nextYear}
          </div>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
}
