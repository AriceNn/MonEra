import { useState } from 'react';
import { Cloud, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

export function SyncStatusIndicator() {
  const { syncStatus, syncNow, autoSync, setAutoSync, settings } = useFinance();
  const { isAuthenticated, isCloudEnabled } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const locale = settings.language === 'tr' ? tr : enUS;

  const texts = {
    tr: {
      cloudActive: 'Bulut Aktif',
      cloudDisabled: 'Bulut Devre Dışı',
      syncing: 'Senkronize ediliyor...',
      syncNow: 'Şimdi Senkronize Et',
      lastSync: 'Son senkronizasyon',
      never: 'Hiçbir zaman',
      autoSync: 'Otomatik Senkronizasyon',
      syncSuccess: 'Senkronizasyon başarılı!',
      syncError: 'Senkronizasyon hatası',
      itemsSynced: 'öğe senkronize edildi',
      conflicts: 'çakışma',
    },
    en: {
      cloudActive: 'Cloud Active',
      cloudDisabled: 'Cloud Disabled',
      syncing: 'Syncing...',
      syncNow: 'Sync Now',
      lastSync: 'Last sync',
      never: 'Never',
      autoSync: 'Auto Sync',
      syncSuccess: 'Sync successful!',
      syncError: 'Sync error',
      itemsSynced: 'items synced',
      conflicts: 'conflicts',
    },
  };

  const t = texts[settings.language];

  const handleSync = async () => {
    if (isSyncing || !isAuthenticated) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncNow();

      if (result.success) {
        setSyncMessage({
          type: 'success',
          text: `${t.syncSuccess} ${result.synced} ${t.itemsSynced}${result.conflicts > 0 ? `, ${result.conflicts} ${t.conflicts}` : ''}`,
        });
      } else {
        setSyncMessage({
          type: 'error',
          text: `${t.syncError}: ${result.errors.join(', ')}`,
        });
      }

      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (error: any) {
      setSyncMessage({
        type: 'error',
        text: `${t.syncError}: ${error.message}`,
      });
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Show disabled state if not authenticated or cloud not enabled
  if (!isCloudEnabled || !isAuthenticated) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Cloud className="w-5 h-5" />
          <span className="text-sm">
            {!isCloudEnabled 
              ? (settings.language === 'tr' ? 'Bulut devre dışı' : 'Cloud disabled')
              : (settings.language === 'tr' ? 'Giriş yapılmadı' : 'Not signed in')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {syncStatus.isSyncing ? (
            <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
          ) : (
            <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {syncStatus.isSyncing ? t.syncing : t.cloudActive}
          </span>
        </div>

        {/* Manual Sync Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing || syncStatus.isSyncing}
          className="text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {t.syncNow}
        </Button>
      </div>

      {/* Last Sync Time */}
      {syncStatus.lastSyncTime && (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {t.lastSync}:{' '}
            {formatDistanceToNow(syncStatus.lastSyncTime, {
              addSuffix: true,
              locale,
            })}
          </span>
        </div>
      )}

      {/* Sync Message */}
      {syncMessage && (
        <div
          className={`flex items-start gap-2 text-xs p-2 rounded ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Auto Sync Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {t.autoSync}
        </span>
        <button
          onClick={() => setAutoSync(!autoSync)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            autoSync
              ? 'bg-indigo-600 dark:bg-indigo-500'
              : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              autoSync ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Error Display */}
      {syncStatus.error && (
        <div className="flex items-start gap-2 text-xs p-2 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{syncStatus.error}</span>
        </div>
      )}
    </div>
  );
}
