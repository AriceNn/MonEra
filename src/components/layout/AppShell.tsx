import { LayoutDashboard, Receipt, Settings, Moon, Sun, Globe } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  onThemeToggle: () => void;
  onLanguageToggle: () => void;
}

export function AppShell({ children, theme, language, onThemeToggle, onLanguageToggle }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isDark = theme === 'dark';

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-50
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${sidebarOpen ? 'w-64' : 'md:w-20'}
            bg-white dark:bg-slate-900 
            border-r border-slate-200 dark:border-slate-800
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${
              sidebarOpen ? 'justify-between px-4' : 'justify-center'
            }`}>
              {sidebarOpen && (
                <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">FinTrack</h1>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                aria-label="Toggle sidebar"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex-1 p-4 space-y-2">
              <a
                href="#"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                {sidebarOpen && <span className="font-medium">{language === 'tr' ? 'Panel' : 'Dashboard'}</span>}
              </a>
              <a
                href="#"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <Receipt className="w-5 h-5 flex-shrink-0 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                {sidebarOpen && <span className="font-medium">{language === 'tr' ? 'İşlemler' : 'Transactions'}</span>}
              </a>
              <a
                href="#"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors group ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <Settings className="w-5 h-5 flex-shrink-0 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                {sidebarOpen && <span className="font-medium">{language === 'tr' ? 'Ayarlar' : 'Settings'}</span>}
              </a>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={onThemeToggle}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 flex-shrink-0 text-slate-600" />
                )}
                {sidebarOpen && <span className="font-medium">{isDark ? 'Light' : 'Dark'}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">FinTrack</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onLanguageToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                title="Change Language"
              >
                <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">{language.toUpperCase()}</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">{children}</main>
        </div>
      </div>
    </div>
  );
}
