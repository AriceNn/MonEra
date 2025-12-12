import { useRef, useState } from 'react';
import { Download, Upload, Cloud, CloudOff } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../lib/supabase';
import { useDataExportImport } from '../hooks/useDataExportImport';
import { SyncStatusIndicator } from '../components/sync/SyncStatusIndicator';
import type { AppSettings } from '../types';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPage({ isOpen, onClose }: SettingsPageProps) {
  const { settings, updateSettings, transactions, addBulkTransactions } = useFinance();
  const { user, isAuthenticated, isCloudEnabled } = useAuth();
  const { downloadJSON, downloadCSV, importFromJSON, importFromCSV } = useDataExportImport();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    downloadJSON(transactions, settings, `fintrack-${new Date().toISOString().split('T')[0]}.json`);
    setImportMessage({ type: 'success', text: settings.language === 'tr' ? 'Veriler başarıyla dışa aktarıldı!' : 'Data exported successfully!' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleExportCSV = () => {
    downloadCSV(transactions, `fintrack-${new Date().toISOString().split('T')[0]}.csv`);
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
    const newErrors: Record<string, string> = {};

    if (formData.inflationRate < 0) {
      newErrors.inflationRate = settings.language === 'tr'
        ? 'Enflasyon oranı 0 veya daha büyük olmalıdır'
        : 'Inflation rate must be 0 or greater';
    }

    if (formData.inflationRate > 1000) {
      newErrors.inflationRate = settings.language === 'tr'
        ? 'Enflasyon oranı 1000\'den küçük olmalıdır'
        : 'Inflation rate must be less than 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      updateSettings(formData);
      onClose();
    }
  };

  const handleCancel = () => {
    setFormData(settings);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={settings.language === 'tr' ? 'Ayarlar' : 'Settings'}
    >
      <div className="space-y-6">
        {/* Basic Settings */}
        <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {settings.language === 'tr' ? 'Genel Ayarlar' : 'General Settings'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {settings.language === 'tr' ? 'Para Birimi' : 'Currency'}
              </label>
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {settings.language === 'tr' ? 'Kur Çifti Gösterimi' : 'Currency Pair Display'}
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.language === 'tr' 
                  ? 'Header\'da gösterilecek kur çiftini seçin' 
                  : 'Select currency pair to display in header'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {settings.language === 'tr' ? 'Yıllık Enflasyon Oranı (%)' : 'Annual Inflation Rate (%)'}
              </label>
              <Input
                type="number"
                value={formData.inflationRate}
                onChange={(e) => setFormData({ ...formData, inflationRate: parseFloat(e.target.value) || 0 })}
                error={errors.inflationRate}
                step="0.1"
                min="0"
                max="1000"
              />
            </div>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {settings.language === 'tr' ? 'Bulut Senkronizasyonu' : 'Cloud Sync'}
          </h3>

          <div className="space-y-4">
            {isCloudEnabled && isAuthenticated ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Cloud size={18} className="text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {settings.language === 'tr' ? 'Bulut Aktif' : 'Cloud Active'}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Sync Status Indicator */}
                  <SyncStatusIndicator />
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 transition-colors text-xs font-medium"
                  >
                  {settings.language === 'tr' ? 'Çıkış Yap' : 'Sign Out'}
                </button>
              </>
            ) : !isCloudEnabled ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <CloudOff size={18} className="text-slate-500 dark:text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {settings.language === 'tr' ? 'Bulut devre dışı' : 'Cloud disabled'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {settings.language === 'tr' 
                      ? 'Verileriniz sadece bu cihazda saklanır' 
                      : 'Your data is stored locally only'}
                  </p>
                </div>
              </div>
            ) : (
              <SyncStatusIndicator />
            )}
          </div>
        </section>        {/* Data Management */}
        <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {settings.language === 'tr' ? 'Veri Yönetimi' : 'Data Management'}
          </h3>

          <div className="space-y-4">
            {/* Export Subsection */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? '💾 Dışa Aktar' : '💾 Export'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors text-xs font-medium"
                  disabled={isProcessing}
                >
                  <Download size={14} />
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors text-xs font-medium"
                  disabled={isProcessing}
                >
                  <Download size={14} />
                  CSV
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {settings.language === 'tr'
                  ? 'Tüm işlemlerinizi yedekleyin'
                  : 'Backup all your transactions'}
              </p>
            </div>

            {/* Import Subsection */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {settings.language === 'tr' ? '📤 İçe Aktar' : '📤 Import'}
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
                    id="json-import-input"
                  />
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={14} />
                    {isProcessing ? '...' : 'JSON'}
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
                    id="csv-import-input"
                  />
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={14} />
                    {isProcessing ? '...' : 'CSV'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {settings.language === 'tr'
                  ? 'Daha önce yedeklenen verileri geri yükleyin'
                  : 'Restore previously backed up data'}
              </p>
            </div>
          </div>

          {/* Status Message */}
          {importMessage && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${
              importMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200'
            }`}>
              {importMessage.type === 'success' ? '✓ ' : '✕ '}{importMessage.text}
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            {settings.language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            {settings.language === 'tr' ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* Import Mode Dialog */}
      {showImportModeDialog && pendingImportData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelImport}>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              {settings.language === 'tr' ? 'İçe Aktarma Modu' : 'Import Mode'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              {settings.language === 'tr' 
                ? `${pendingImportData.count} işlem içe aktarılacak. Mevcut ${transactions.length} işleminiz var. Ne yapmak istersiniz?`
                : `${pendingImportData.count} transactions will be imported. You have ${transactions.length} existing transactions. What would you like to do?`}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleConfirmImport(false)}
                className="w-full px-4 py-3 text-sm font-medium text-left bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
              >
                <div className="font-semibold mb-1">
                  {settings.language === 'tr' ? '➕ Mevcut Verilere Ekle' : '➕ Add to Existing Data'}
                </div>
                <div className="text-xs opacity-75">
                  {settings.language === 'tr' 
                    ? 'Yeni veriler mevcut verilerinize eklenecek (duplicate kontrol edilir)'
                    : 'New data will be added to your existing data (duplicates filtered)'}
                </div>
              </button>
              
              <button
                onClick={() => handleConfirmImport(true)}
                className="w-full px-4 py-3 text-sm font-medium text-left bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg transition-colors"
              >
                <div className="font-semibold mb-1">
                  {settings.language === 'tr' ? '🔄 Tüm Veriyi Değiştir' : '🔄 Replace All Data'}
                </div>
                <div className="text-xs opacity-75">
                  {settings.language === 'tr' 
                    ? 'Mevcut tüm veriler silinecek ve yeni veriler yüklenecek'
                    : 'All existing data will be deleted and new data will be loaded'}
                </div>
              </button>
              
              <button
                onClick={handleCancelImport}
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {settings.language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
