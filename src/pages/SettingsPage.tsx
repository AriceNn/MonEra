import { useRef, useState } from 'react';
import { Download, Upload, Cloud, CloudOff, RotateCcw, AlertCircle } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../lib/supabase';
import { useDataExportImport } from '../hooks/useDataExportImport';
import { SyncStatusIndicator } from '../components/sync/SyncStatusIndicator';
import type { AppSettings } from '../types';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshRates?: () => void;
  isFetchingRates?: boolean;
}

export function SettingsPage({ isOpen, onClose, onRefreshRates, isFetchingRates = false }: SettingsPageProps) {
  const { settings, updateSettings, transactions, addBulkTransactions } = useFinance();
  const { user, isAuthenticated, isCloudEnabled } = useAuth();
  const { downloadJSON, downloadCSV, importFromJSON, importFromCSV } = useDataExportImport();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ transactions: any[]; count: number } | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const importLockRef = useRef(false);

  const handleLogout = async () => {
    try {
      await signOut();
      setImportMessage({ 
        type: 'success', 
        text: settings.language === 'tr' ? 'Başarıyla çıkış yapıldı!' : 'Logged out successfully!' 
      });
      setTimeout(() => {
        setImportMessage(null);
        onClose();
      }, 1000);
    } catch (error) {
      setImportMessage({ 
        type: 'error', 
        text: settings.language === 'tr' ? 'Çıkış yapılırken hata oluştu' : 'Error logging out' 
      });
      setTimeout(() => setImportMessage(null), 3000);
    }
  };

  const handleExportJSON = () => {
    downloadJSON(transactions, settings, `monera-${new Date().toISOString().split('T')[0]}.json`);
    setImportMessage({ type: 'success', text: settings.language === 'tr' ? 'Veriler başarıyla dışa aktarıldı!' : 'Data exported successfully!' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleExportCSV = () => {
    downloadCSV(transactions, `monera-${new Date().toISOString().split('T')[0]}.csv`);
    setImportMessage({ type: 'success', text: settings.language === 'tr' ? 'Veriler başarıyla dışa aktarıldı!' : 'Data exported successfully!' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleImportJSON = async (file: File) => {
    // Triple guard: ref lock, state, and early return
    if (importLockRef.current || isProcessing) {
      return;
    }
    
    importLockRef.current = true;
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = importFromJSON(text);
      
      if (result.success && result.data) {
        const transactionsToAdd = result.data.transactions.map((t) => ({
          id: t.id, // Preserve original ID for duplicate detection
          title: t.title || 'Untitled',
          amount: Math.max(0, t.amount || 0),
          category: t.category || 'Other',
          date: t.date || new Date().toISOString().split('T')[0],
          type: t.type || 'expense',
          description: t.description,
          originalCurrency: (t as any).originalCurrency || 'TRY',
        }));
        
        // Show import mode dialog if there are existing transactions
        if (transactions.length > 0) {
          setPendingImportData({ transactions: transactionsToAdd, count: result.data.transactions.length });
          setShowImportModeDialog(true);
          importLockRef.current = false;
          setIsProcessing(false);
          return;
        }
        
        // No existing data, just add
        addBulkTransactions(transactionsToAdd, false);
        const count = result.data.transactions.length;
        
        setImportMessage({ 
          type: 'success', 
          text: settings.language === 'tr' 
            ? `${count} işlem başarıyla içe aktarıldı!` 
            : `${count} transactions imported successfully!` 
        });
        
        // Wait a tick for state to settle, then close modal
        setTimeout(() => {
          setImportMessage(null);
          onClose();
        }, 1500);
      } else {
        setImportMessage({ 
          type: 'error', 
          text: result.message || (settings.language === 'tr' ? 'Dosya yükleme başarısız' : 'Import failed') 
        });
        setTimeout(() => setImportMessage(null), 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage({ 
        type: 'error', 
        text: settings.language === 'tr' ? 'Dosya yükleme başarısız' : 'File upload failed' 
      });
      setTimeout(() => setImportMessage(null), 3000);
    } finally {
      setIsProcessing(false);
      importLockRef.current = false;
      // Clear input to allow re-selection
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const handleImportCSV = async (file: File) => {
    // Triple guard: ref lock, state, and early return
    if (importLockRef.current || isProcessing) {
      return;
    }
    
    importLockRef.current = true;
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = importFromCSV(text);
      
      if (result.success && result.data) {
        const transactionsToAdd = result.data.transactions.map((t) => ({
          id: t.id, // Preserve original ID for duplicate detection
          title: t.title || 'Untitled',
          amount: Math.max(0, t.amount || 0),
          category: t.category || 'Other',
          date: t.date || new Date().toISOString().split('T')[0],
          type: t.type || 'expense',
          description: t.description,
          originalCurrency: (t as any).originalCurrency || 'TRY',
        }));
        
        // Show import mode dialog if there are existing transactions
        if (transactions.length > 0) {
          setPendingImportData({ transactions: transactionsToAdd, count: result.data.transactions.length });
          setShowImportModeDialog(true);
          importLockRef.current = false;
          setIsProcessing(false);
          return;
        }
        
        // No existing data, just add
        addBulkTransactions(transactionsToAdd, false);
        const count = result.data.transactions.length;
        
        setImportMessage({ 
          type: 'success', 
          text: settings.language === 'tr' 
            ? `${count} işlem başarıyla içe aktarıldı!` 
            : `${count} transactions imported successfully!` 
        });
        
        // Wait a tick for state to settle, then close modal
        setTimeout(() => {
          setImportMessage(null);
          onClose();
        }, 1500);
      } else {
        setImportMessage({ 
          type: 'error', 
          text: result.message || (settings.language === 'tr' ? 'Dosya yükleme başarısız' : 'Import failed') 
        });
        setTimeout(() => setImportMessage(null), 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage({ 
        type: 'error', 
        text: settings.language === 'tr' ? 'Dosya yükleme başarısız' : 'File upload failed' 
      });
      setTimeout(() => setImportMessage(null), 3000);
    } finally {
      setIsProcessing(false);
      importLockRef.current = false;
      // Clear input to allow re-selection
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleConfirmImport = (replaceMode: boolean) => {
    if (!pendingImportData) return;
    
    const count = pendingImportData.count;
    const transactionsToImport = pendingImportData.transactions;
    
    // Close dialog first
    setPendingImportData(null);
    setShowImportModeDialog(false);
    
    // Add transactions with a small delay to ensure state is clean
    setTimeout(() => {
      addBulkTransactions(transactionsToImport, replaceMode);
      
      setImportMessage({ 
        type: 'success', 
        text: settings.language === 'tr' 
          ? `${count} işlem başarıyla içe aktarıldı!` 
          : `${count} transactions imported successfully!` 
      });
      
      setTimeout(() => {
        setImportMessage(null);
        onClose();
      }, 1500);
    }, 100);
  };

  const handleCancelImport = () => {
    setPendingImportData(null);
    setShowImportModeDialog(false);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const validateForm = () => {
    return true;
  };

  const handleSave = async () => {
    if (validateForm()) {
      // Optimistic close - show success immediately
      setImportMessage({ 
        type: 'success', 
        text: settings.language === 'tr' ? 'Ayarlar kaydediliyor...' : 'Saving settings...' 
      });
      
      // Close dialog immediately for better UX
      onClose();
      
      // Persist to database in background
      updateSettings(formData).then((success) => {
        if (success) {
          console.log('[SettingsPage] Settings saved successfully');
          setImportMessage({ 
            type: 'success', 
            text: settings.language === 'tr' ? 'Ayarlar kaydedildi' : 'Settings saved' 
          });
          setTimeout(() => setImportMessage(null), 2000);
        } else {
          console.error('[SettingsPage] Failed to save settings');
          setImportMessage({ 
            type: 'error', 
            text: settings.language === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings' 
          });
          setTimeout(() => setImportMessage(null), 3000);
        }
      }).catch(error => {
        console.error('[SettingsPage] Error saving settings:', error);
        setImportMessage({ 
          type: 'error', 
          text: settings.language === 'tr' ? 'Hata oluştu' : 'An error occurred' 
        });
        setTimeout(() => setImportMessage(null), 3000);
      });
    }
  };

  const handleCancel = () => {
    setFormData(settings);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={settings.language === 'tr' ? 'Ayarlar' : 'Settings'}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Appearance Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🎨</span>
            {settings.language === 'tr' ? 'Görünüm' : 'Appearance'}
          </h3>
          
          <Card className="p-4 space-y-4">
            {/* Language */}
            <div>
              <label htmlFor="language-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? 'Dil' : 'Language'}
              </label>
              <Select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as 'tr' | 'en' })}
                options={[
                  { value: 'tr', label: 'Türkçe' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            {/* Theme */}
            <div>
              <label htmlFor="theme-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? 'Tema' : 'Theme'}
              </label>
              <Select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' })}
                options={[
                  { value: 'light', label: settings.language === 'tr' ? 'Açık' : 'Light' },
                  { value: 'dark', label: settings.language === 'tr' ? 'Koyu' : 'Dark' },
                ]}
              />
            </div>
          </Card>
        </section>

        {/* Currency Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>💱</span>
            {settings.language === 'tr' ? 'Para Birimi' : 'Currency'}
          </h3>
          
          <Card className="p-4 space-y-3">
            {/* Standart Para Birimi */}
            <div>
              <label htmlFor="currency-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? 'Standart Para Birimi' : 'Default Currency'}
              </label>
              <div className="flex gap-3 items-end">
                <div className="w-1/2">
                  <Select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                    options={[
                      { value: 'TRY', label: 'TRY (₺)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {settings.language === 'tr' ? 'Kuru Yenile' : 'Refresh Rate'}
                  </label>
                  <button
                    onClick={onRefreshRates}
                    disabled={isFetchingRates}
                    title={settings.language === 'tr' ? 'Kurları güncelle' : 'Refresh exchange rates'}
                    className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 h-9"
                  >
                    <RotateCcw className={`w-4 h-4 ${isFetchingRates ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Kur Çifti */}
            <div>
              <label htmlFor="pair-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? 'Kur Çifti (Header)' : 'Currency Pair (Header)'}
              </label>
              <Select
                value={formData.currencyPair || 'TRY-USD'}
                onChange={(e) => setFormData({ ...formData, currencyPair: e.target.value as any })}
                options={[
                  { value: 'TRY-USD', label: 'TRY/USD (₺/$)' },
                  { value: 'USD-TRY', label: 'USD/TRY ($/₺)' },
                  { value: 'EUR-USD', label: 'EUR/USD (€/$)' },
                  { value: 'USD-EUR', label: 'USD/EUR ($/€)' },
                  { value: 'TRY-EUR', label: 'TRY/EUR (₺/€)' },
                  { value: 'EUR-TRY', label: 'EUR/TRY (€/₺)' },
                  { value: 'GBP-USD', label: 'GBP/USD (£/$)' },
                  { value: 'USD-GBP', label: 'USD/GBP ($/£)' },
                ]}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {settings.language === 'tr' 
                  ? 'Header\'da gösterilecek kur çiftini seçin ve çifte göre para birimi değiştirir.' 
                  : 'Choose the currency pair displayed in the header. Currency toggle will switch between them.'}
              </p>
            </div>
          </Card>
        </section>

        {/* Cloud Sync Section */}
        {isCloudEnabled && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>☁️</span>
              {settings.language === 'tr' ? 'Bulut Senkronizasyonu' : 'Cloud Sync'}
            </h3>
            
            <Card className="p-4 space-y-3">
              {isAuthenticated ? (
                <>
                  {/* User Info Card */}
                  <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <Cloud size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        {settings.language === 'tr' ? 'Bulut Aktif' : 'Cloud Active'}
                      </p>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Sync Status */}
                  <SyncStatusIndicator />
                  
                  {/* Sign Out Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    {settings.language === 'tr' ? '🚪 Çıkış Yap' : '🚪 Sign Out'}
                  </button>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <CloudOff size={18} className="text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {settings.language === 'tr' ? 'Bulut Devre Dışı' : 'Cloud Disabled'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {settings.language === 'tr' 
                        ? 'Verileriniz sadece bu cihazda saklanır.' 
                        : 'Your data is stored locally only.'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* Data Management Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📦</span>
            {settings.language === 'tr' ? 'Veri Yönetimi' : 'Data Management'}
          </h3>
          
          <Card className="p-4 space-y-4">
            {/* Export */}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Download size={14} />
                {settings.language === 'tr' ? 'Dışa Aktar' : 'Export'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJSON}
                  disabled={isProcessing}
                  className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={isProcessing}
                  className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Import */}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Upload size={14} />
                {settings.language === 'tr' ? 'İçe Aktar' : 'Import'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !importLockRef.current && !isProcessing) {
                        handleImportJSON(file);
                      }
                    }}
                    className="hidden"
                    id="json-import"
                  />
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    JSON
                  </button>
                </div>

                <div>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !importLockRef.current && !isProcessing) {
                        handleImportCSV(file);
                      }
                    }}
                    className="hidden"
                    id="csv-import"
                  />
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Message */}
          {importMessage && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
              importMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200'
            }`}>
              <span className="flex-shrink-0 mt-0.5">
                {importMessage.type === 'success' ? '✓' : '✕'}
              </span>
              <span>{importMessage.text}</span>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            disabled={isProcessing}
          >
            {settings.language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            disabled={isProcessing}
          >
            {settings.language === 'tr' ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* Import Mode Dialog */}
      {showImportModeDialog && pendingImportData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelImport}>
          <Card className="max-w-md w-full shadow-xl" onClick={(e: any) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {settings.language === 'tr' ? 'İçe Aktarma Modu' : 'Import Mode'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {settings.language === 'tr' 
                      ? `${pendingImportData.count} işlem bulundu. Mevcut ${transactions.length} işleminiz var.`
                      : `${pendingImportData.count} transactions found. You have ${transactions.length} existing.`}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleConfirmImport(false)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    {settings.language === 'tr' ? '➕ Mevcut Verilere Ekle' : '➕ Add to Existing'}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    {settings.language === 'tr' 
                      ? 'Yeni veriler eklenecek (duplikatlar filtrelenir)'
                      : 'New data will be added (duplicates filtered)'}
                  </div>
                </button>
                
                <button
                  onClick={() => handleConfirmImport(true)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <div className="font-semibold text-orange-900 dark:text-orange-100 text-sm">
                    {settings.language === 'tr' ? '🔄 Tüm Veriyi Değiştir' : '🔄 Replace All'}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                    {settings.language === 'tr' 
                      ? 'Mevcut tüm veriler silinecek'
                      : 'All existing data will be deleted'}
                  </div>
                </button>
                
                <button
                  onClick={handleCancelImport}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  {settings.language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
