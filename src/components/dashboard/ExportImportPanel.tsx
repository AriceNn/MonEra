import { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { useFinance } from '../../hooks/useFinance';
import { useDataExportImport } from '../../hooks/useDataExportImport';
import { t } from '../../utils/i18n';

export function ExportImportPanel() {
  const { transactions, settings, importData } = useFinance();
  const { downloadJSON, importFromJSON, importFromCSV } = useDataExportImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExportJSON = () => {
    try {
      downloadJSON(transactions, settings, `fintrack-${new Date().toISOString().split('T')[0]}.json`);
      setStatus({
        type: 'success',
        message: t('exportSuccess', settings.language),
      });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: settings.language === 'tr' ? 'Dışa aktarma başarısız' : 'Export failed',
      });
    }
  };

  const handleImportClick = (fileType: 'json' | 'csv') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = fileType === 'json' ? '.json' : '.csv';
      fileInputRef.current.dataset.fileType = fileType;
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const fileType = (event.target as HTMLInputElement & { dataset: { fileType: string } }).dataset.fileType as 'json' | 'csv';

      let result;
      if (fileType === 'json') {
        result = importFromJSON(fileContent);
      } else {
        result = importFromCSV(fileContent);
      }

      if (result.success && result.data) {
        importData(JSON.stringify(result.data));
        setStatus({
          type: 'success',
          message: t('importSuccess', settings.language),
        });
      } else {
        setStatus({
          type: 'error',
          message: result.message,
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setStatus(null), 4000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: t('importError', settings.language),
      });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Download size={16} />
          {t('export', settings.language)}
        </h3>
        <div className="pl-6">
          <Button
            onClick={handleExportJSON}
            className="w-full"
            variant="secondary"
          >
            {t('exportJSON', settings.language)}
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Upload size={16} />
          {t('import', settings.language)}
        </h3>
        <div className="pl-6 space-y-2">
          <Button
            onClick={() => handleImportClick('json')}
            className="w-full"
            variant="secondary"
          >
            {t('importJSON', settings.language)}
          </Button>
          <Button
            onClick={() => handleImportClick('csv')}
            className="w-full"
            variant="secondary"
          >
            {t('importCSV', settings.language)}
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".json,.csv"
      />

      {/* Status Message */}
      {status && (
        <div
          className={`rounded-lg p-3 text-sm font-medium ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
