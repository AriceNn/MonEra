import { Settings, Moon, Sun, Globe, DollarSign, LayoutDashboard, Repeat, Target, List, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { NotificationCenter } from '../notifications/NotificationCenter';
import type { Notification } from '../../utils/notifications';

interface AppShellProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  currencyPair?: string;
  exchangeRates?: Record<string, number>;
  isFetchingRates?: boolean;
  onRefreshRates?: () => void;
  currentPage?: 'dashboard' | 'transactions' | 'recurring' | 'budget' | 'analytics' | 'settings';
  onNavigate?: (page: 'dashboard' | 'transactions' | 'recurring' | 'budget' | 'analytics' | 'settings') => void;
  onThemeToggle: () => void;
  onLanguageToggle: () => void;
  onCurrencyToggle?: () => void;
  onSettingsClick?: () => void;
  // Notifications
  notifications?: Notification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onOpenNotificationSettings?: () => void;
}

export function AppShell({
  children,
  theme,
  language,
  currency,
  currencyPair,
  exchangeRates = {},
  isFetchingRates = false,
  onRefreshRates,
  currentPage = 'dashboard',
  onNavigate,
  onThemeToggle,
  onLanguageToggle,
  onCurrencyToggle,
  onSettingsClick,
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onOpenNotificationSettings,
}: AppShellProps) {
  const isDark = theme === 'dark';

  // Detect screen sizes (desktop breakpoint = 1025px for currency pair display)
  const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1025;

  // Get rate for currency pair (e.g., "1 USD = 32.50 TRY")
  const getFormattedRate = () => {
    if (!currencyPair || !exchangeRates) return null;
    const [from, to] = currencyPair.split('-');
    
    // Get base currency rate (1 unit of from = ? units of to)
    const fromRate = exchangeRates[from];
    const toRate = exchangeRates[to];
    
    if (!fromRate || !toRate) return null;
    
    const rate = toRate / fromRate;
    return `1 ${from} = ${rate.toFixed(2)} ${to}`;
  };

  // Get the next currency to toggle to based on currency pair
  const getNextCurrency = () => {
    if (!currencyPair) return currency === 'TRY' ? 'USD' : 'TRY';
    const [curr1, curr2] = currencyPair.split('-');
    return currency === curr1 ? curr2 : curr1;
  };

  const navItems = [
    { id: 'dashboard' as const, label: language === 'tr' ? 'Panel' : 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as const, label: language === 'tr' ? 'İşlemler' : 'Transactions', icon: List },
    { id: 'recurring' as const, label: language === 'tr' ? 'Tekrarlayan' : 'Recurring', icon: Repeat },
    { id: 'budget' as const, label: language === 'tr' ? 'Bütçe' : 'Budget', icon: Target },
    { id: 'analytics' as const, label: language === 'tr' ? 'Analiz' : 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        {/* Main Content - Full Width (No Sidebar) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ===== DESKTOP HEADER (Tablet+) ===== */}
          <header className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {/* Top Row: Logo + Navigation + Controls */}
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 gap-3 lg:gap-4">
              {/* Left: Logo + Navigation */}
              <div className="flex items-center gap-3 lg:gap-6 min-w-0">
                <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white flex-shrink-0">MonEra</h1>
                
                {/* Navigation Menu - Visible on tablet and desktop (md and up) */}
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate?.(item.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-xs lg:text-sm ${
                          isActive
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden md:inline">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                {/* Notification Center */}
                {onMarkNotificationAsRead && onMarkAllNotificationsAsRead && onDeleteNotification && onClearAllNotifications && onOpenNotificationSettings && (
                  <NotificationCenter
                    notifications={notifications}
                    language={language}
                    onMarkAsRead={onMarkNotificationAsRead}
                    onMarkAllAsRead={onMarkAllNotificationsAsRead}
                    onDelete={onDeleteNotification}
                    onClearAll={onClearAllNotifications}
                    onOpenSettings={onOpenNotificationSettings}
                  />
                )}

                {/* Separator - Desktop Only */}
                {isLargeScreen && <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>}

                {/* Currency Pair Display (Desktop Only - 1024px+) */}
                {isLargeScreen && getFormattedRate() && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-nowrap">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-medium">{getFormattedRate()}</span>
                  </div>
                )}

                {/* Currency Toggle - Icon only on tablet */}
                <button
                  onClick={() => onCurrencyToggle?.()}
                  className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium text-sm"
                  title={`Switch to ${getNextCurrency()}`}
                  aria-label={`Currency: ${currency}`}
                >
                  <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="hidden lg:inline">{currency}</span>
                </button>

                {/* Language Toggle - Icon only on tablet */}
                <button
                  onClick={() => onLanguageToggle?.()}
                  className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium text-sm"
                  title="Change Language"
                  aria-label={`Language: ${language}`}
                >
                  <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="hidden lg:inline">{language === 'tr' ? 'TR' : 'EN'}</span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => onThemeToggle?.()}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                  title={isDark ? 'Light Mode' : 'Dark Mode'}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Settings */}
                <button
                  onClick={() => onSettingsClick?.()}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                  title="Settings"
                  aria-label="Open settings"
                >
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          </header>

          {/* ===== MOBILE HEADER ===== */}
          <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {/* Top Row: Logo + Quick Controls */}
            <div className="flex items-center justify-between px-4 py-3">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">MonEra</h1>
              
              <div className="flex items-center gap-1">
                {/* Currency Toggle */}
                <button
                  onClick={() => onCurrencyToggle?.()}
                  className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title={`Switch to ${getNextCurrency()}`}
                  aria-label={`Currency: ${currency}`}
                >
                  <DollarSign className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Language Toggle */}
                <button
                  onClick={() => onLanguageToggle?.()}
                  className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Change Language"
                  aria-label={`Language: ${language}`}
                >
                  <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => onThemeToggle?.()}
                  className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title={isDark ? 'Light Mode' : 'Dark Mode'}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                {/* Settings */}
                <button
                  onClick={() => onSettingsClick?.()}
                  className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300"
                  title="Settings"
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Navigation (Horizontal Scroll) */}
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <nav className="flex items-center gap-2 px-3 py-2 min-w-min">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate?.(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 font-medium text-sm ${
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">{children}</main>
        </div>
      </div>
    </div>
  );
}
