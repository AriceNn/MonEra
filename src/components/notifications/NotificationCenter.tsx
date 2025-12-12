import { Bell, X, CheckCircle2, AlertCircle, Info, TrendingUp, Settings as SettingsIcon, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Notification } from '../../utils/notifications';
import { t } from '../../utils/i18n';

interface NotificationCenterProps {
  notifications: Notification[];
  language: 'tr' | 'en';
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
}

export function NotificationCenter({
  notifications,
  language,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onOpenSettings
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationStyle = (type: Notification['type']) => {
    switch (type) {
      case 'budget_exceeded':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-l-red-500',
          badge: language === 'tr' ? 'Bütçe Aşıldı' : 'Budget Exceeded',
          badgeColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
        };
      case 'budget_warning':
        return {
          icon: AlertCircle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          borderColor: 'border-l-yellow-500',
          badge: language === 'tr' ? 'Bütçe Uyarısı' : 'Budget Warning',
          badgeColor: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
        };
      case 'recurring_due':
        return {
          icon: Clock,
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-l-blue-500',
          badge: language === 'tr' ? 'Hatırlatma' : 'Reminder',
          badgeColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
        };
      case 'savings_milestone':
        return {
          icon: CheckCircle2,
          iconColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-l-green-500',
          badge: language === 'tr' ? 'Başarı' : 'Achievement',
          badgeColor: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
        };
      case 'expense_spike':
        return {
          icon: TrendingUp,
          iconColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-l-orange-500',
          badge: language === 'tr' ? 'Yüksek Harcama' : 'High Spending',
          badgeColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-slate-600 dark:text-slate-400',
          bgColor: 'bg-slate-50 dark:bg-slate-950/30',
          borderColor: 'border-l-slate-500',
          badge: language === 'tr' ? 'Bilgi' : 'Info',
          badgeColor: 'bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300'
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow', language);
    if (diffMins < 60) return `${diffMins} ${t('minutesAgo', language)}`;
    if (diffHours < 24) return `${diffHours} ${t('hoursAgo', language)}`;
    if (diffDays < 7) return `${diffDays} ${t('daysAgo', language)}`;
    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.notification-center')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="notification-center relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Mobil Uyumlu */}
      {isOpen && (
        <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:mt-2 md:w-[420px] bg-white dark:bg-slate-900 md:rounded-xl shadow-2xl border-0 md:border md:border-slate-200 md:dark:border-slate-700 z-50 flex flex-col md:max-h-[600px]">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t('notifications', language)}
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {unreadCount} {language === 'tr' ? 'okunmamış' : 'unread'}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Action Buttons */}
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={onOpenSettings}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  {language === 'tr' ? 'Ayarlar' : 'Settings'}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Tümünü Okundu' : 'Mark All Read'}
                  </button>
                )}
                <button
                  onClick={onClearAll}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Bell className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-900 dark:text-white font-medium mb-1">
                  {language === 'tr' ? 'Henüz bildirim yok' : 'No notifications yet'}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                  {language === 'tr' 
                    ? 'Finansal aktiviteleriniz hakkında buradan bildirim alacaksınız'
                    : 'You\'ll receive notifications about your financial activities here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(notification => {
                  const style = getNotificationStyle(notification.type);
                  const IconComponent = style.icon;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-l-4 ${style.borderColor} ${
                        !notification.isRead ? style.bgColor : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      } transition-colors`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border-2 ${style.borderColor}`}>
                          <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.badgeColor}`}>
                                  {style.badge}
                                </span>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                )}
                              </div>
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => onDelete(notification.id)}
                              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                              title={t('delete', language)}
                            >
                              <X className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400" />
                            </button>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {!notification.isRead && (
                              <button
                                onClick={() => onMarkAsRead(notification.id)}
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                              >
                                {t('markAsRead', language)}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
