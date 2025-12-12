import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useFinance } from '../hooks/useFinance';
import { t } from '../utils/i18n';
import type { AppSettings } from '../types';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPage({ isOpen, onClose }: SettingsPageProps) {
  const { settings, updateSettings } = useFinance();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = () => {
    if (!validateForm()) return;

    updateSettings(formData);
    setErrors({});
    onClose();
  };

  const handleReset = () => {
    setFormData(settings);
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('settings', settings.language)}
      onClose={() => {
        handleReset();
        onClose();
      }}
      onConfirm={handleSubmit}
      confirmLabel={t('save', settings.language)}
    >
      <div className="space-y-6">
        {/* Appearance Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <SettingsIcon size={16} />
            {settings.language === 'tr' ? 'Görünüm' : 'Appearance'}
          </h3>
          <div className="space-y-4 pl-6">
            {/* Theme Selection */}
            <Select
              label={t('theme', settings.language)}
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' })}
              options={[
                { value: 'light', label: t('light', settings.language) },
                { value: 'dark', label: t('dark', settings.language) },
              ]}
            />

            {/* Language Selection */}
            <Select
              label={t('language', settings.language)}
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as 'tr' | 'en' })}
              options={[
                { value: 'tr', label: 'Türkçe' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
        </div>

        {/* Localization Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {settings.language === 'tr' ? 'Yerelleştirme' : 'Localization'}
          </h3>
          <div className="space-y-4 pl-6">
            {/* Currency Selection */}
            <Select
              label={t('currency', settings.language)}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' | 'GBP' })}
              options={[
                { value: 'TRY', label: '₺ TRY (Türk Lirası)' },
                { value: 'USD', label: '$ USD (US Dollar)' },
                { value: 'EUR', label: '€ EUR (Euro)' },
                { value: 'GBP', label: '£ GBP (British Pound)' },
              ]}
            />
          </div>
        </div>

        {/* Financial Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {settings.language === 'tr' ? 'Finansal Parametreler' : 'Financial Parameters'}
          </h3>
          <div className="space-y-4 pl-6">
            {/* Inflation Rate */}
            <div>
              <Input
                label={t('inflationRate', settings.language)}
                type="number"
                min="0"
                max="1000"
                step="0.1"
                value={formData.inflationRate.toString()}
                onChange={(e) => setFormData({ ...formData, inflationRate: parseFloat(e.target.value) || 0 })}
                error={errors.inflationRate}
                helperText={t('inflationRateDesc', settings.language)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {settings.language === 'tr'
                  ? 'Örnek: Türkiye için ~30, ABD için ~2'
                  : 'Example: ~30 for Turkey, ~2 for US'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {settings.language === 'tr'
              ? '💡 Enflasyon oranı, gerçek servet hesaplamasında (inflation-adjusted wealth) kullanılır.'
              : '💡 Inflation rate is used for real wealth calculations (inflation-adjusted wealth).'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
