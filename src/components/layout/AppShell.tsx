import { Settings, Moon, Sun, Globe, DollarSign } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  onThemeToggle: () => void;
  onLanguageToggle: () => void;
  onCurrencyToggle?: () => void;
  onSettingsClick?: () => void;
  ratesUpdatedAt?: string;
  currentRate?: { rate: number; base: string; quote: string };
}

export function AppShell({
  children,
  theme,
  language,
  currency,
  onThemeToggle,
  onLanguageToggle,
  onCurrencyToggle,
  onSettingsClick,
  ratesUpdatedAt,
  currentRate,
}: AppShellProps) {
  const isDark = theme === 'dark';
  
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        {/* Main Content - Full Width (No Sidebar) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">FinTrack</h2>
            </div>

            {/* Right-side Controls */}
            <div className="flex items-center gap-1">
              {/* Currency Toggle */}
              <button
                onClick={onCurrencyToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                title={`Switch to ${currency === 'TRY' ? 'USD' : 'TRY'}`}
              >
                <DollarSign className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">{currency}</span>
              </button>

              {/* Language Toggle */}
              <button
                onClick={onLanguageToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                title="Change Language"
              >
                <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">{language.toUpperCase()}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={onThemeToggle}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {/* Settings */}
              <button
                onClick={onSettingsClick}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>

              {/* Rates Info Chip - Hidden on mobile */}
              {ratesUpdatedAt && (
                <span className="hidden md:inline-block ml-2 px-3 py-1.5 text-xs rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium">
                  {language === 'tr' ? 'Güncelleme: ' : 'Updated: '}{formatTime(ratesUpdatedAt)}
                  {currentRate && (
                    <span className="ml-2 opacity-90">
                      (1 {currentRate.base} = {currentRate.rate.toFixed(2)} {currentRate.quote})
                    </span>
                  )}
                </span>
              )}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">{children}</main>
        </div>
      </div>
    </div>
  );
}
