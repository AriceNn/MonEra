import { Settings } from 'lucide-react';
import type { NotificationSettings } from '../../utils/notifications';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { t } from '../../utils/i18n';

interface NotificationSettingsProps {
  settings: NotificationSettings;
  language: 'tr' | 'en';
  onUpdate: (settings: Partial<NotificationSettings>) => void;
  onClose: () => void;
}

export function NotificationSettingsPanel({
  settings,
  language,
  onUpdate,
  onClose
}: NotificationSettingsProps) {
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdate({ desktop: true });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('notificationSettings', language)}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('enableNotifications', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('notificationDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => onUpdate({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Budget Warnings */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('budgetWarnings', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('budgetWarningsDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.budgetWarnings}
                  onChange={(e) => onUpdate({ budgetWarnings: e.target.checked })}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-yellow-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {/* Budget Exceeded */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('budgetExceededNotif', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('budgetExceededDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.budgetExceeded}
                  onChange={(e) => onUpdate({ budgetExceeded: e.target.checked })}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {/* Recurring Reminders */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('recurringReminders', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('recurringRemindersDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.recurringReminders}
                  onChange={(e) => onUpdate({ recurringReminders: e.target.checked })}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {/* Savings Milestones */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('savingsMilestones', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('savingsMilestonesDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.savingsMilestones}
                  onChange={(e) => onUpdate({ savingsMilestones: e.target.checked })}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {/* Expense Spikes */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('expenseSpikes', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('expenseSpikesDesc', language)}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.expenseSpikes}
                  onChange={(e) => onUpdate({ expenseSpikes: e.target.checked })}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            {/* Desktop Notifications */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t('desktopNotifications', language)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('desktopNotificationsDesc', language)}
                </p>
                {('Notification' in window) && Notification.permission === 'denied' && (
                  <p className="text-xs text-red-500 mt-1">
                    {language === 'tr' ? 'İzin reddedildi. Tarayıcı ayarlarından etkinleştirin.' : 'Permission denied. Enable in browser settings.'}
                  </p>
                )}
              </div>
              {('Notification' in window) && Notification.permission === 'default' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestNotificationPermission}
                  disabled={!settings.enabled}
                >
                  {t('requestPermission', language)}
                </Button>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.desktop && ('Notification' in window) && Notification.permission === 'granted'}
                    onChange={(e) => onUpdate({ desktop: e.target.checked })}
                    disabled={!settings.enabled || !('Notification' in window) || Notification.permission !== 'granted'}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>
              {language === 'tr' ? 'Tamam' : 'Done'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
