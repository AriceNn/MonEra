import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';

export interface DateRange {
  start: Date;
  end: Date;
  preset?: 'all' | '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  language: 'tr' | 'en';
}

const PRESETS = [
  { id: '7d' as const, labelTr: '7 Gün', labelEn: '7 Days' },
  { id: '30d' as const, labelTr: '30 Gün', labelEn: '30 Days' },
  { id: '3m' as const, labelTr: '3 Ay', labelEn: '3 Months' },
  { id: '6m' as const, labelTr: '6 Ay', labelEn: '6 Months' },
  { id: '1y' as const, labelTr: '1 Yıl', labelEn: '1 Year' },
  { id: 'all' as const, labelTr: 'Tümü', labelEn: 'All Time' },
];

export function DateRangeSelector({ value, onChange, language }: DateRangeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(value.start.toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(value.end.toISOString().split('T')[0]);

  const handlePresetClick = (presetId: typeof PRESETS[number]['id']) => {
    const now = new Date();
    const end = new Date();
    let start = new Date();

    switch (presetId) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '3m':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        start = new Date(2020, 0, 1); // Default to 2020
        break;
    }

    onChange({ start, end, preset: presetId });
    setShowCustomPicker(false);
  };

  const handleCustomApply = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    
    if (start > end) {
      alert(language === 'tr' ? 'Başlangıç tarihi bitiş tarihinden sonra olamaz!' : 'Start date cannot be after end date!');
      return;
    }

    onChange({ start, end, preset: 'custom' });
    setShowCustomPicker(false);
  };

  const formatDateRange = () => {
    const startStr = value.start.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const endStr = value.end.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-3">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              value.preset === preset.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {language === 'tr' ? preset.labelTr : preset.labelEn}
          </button>
        ))}
        <button
          onClick={() => setShowCustomPicker(!showCustomPicker)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            value.preset === 'custom'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {language === 'tr' ? 'Özel' : 'Custom'}
        </button>
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {language === 'tr' ? 'Başlangıç Tarihi' : 'Start Date'}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {language === 'tr' ? 'Bitiş Tarihi' : 'End Date'}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCustomPicker(false)}
            >
              {language === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCustomApply}
            >
              {language === 'tr' ? 'Uygula' : 'Apply'}
            </Button>
          </div>
        </div>
      )}

      {/* Current Range Display */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Calendar className="w-4 h-4" />
        <span className="font-medium">{formatDateRange()}</span>
      </div>
    </div>
  );
}
