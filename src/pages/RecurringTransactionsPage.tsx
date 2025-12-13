import { useState } from 'react';
import { Repeat, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { useAlert } from '../hooks/useAlert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { t, translateCategory } from '../utils/i18n';
import type { RecurringFrequency } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, SAVINGS_CATEGORIES } from '../types';
import type { RecurringTransaction } from '../types';
import { NoRecurringEmpty } from '../components/ui/EmptyState';

interface RecurringTransactionsPageProps {
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
}

export function RecurringTransactionsPage({ language, currency }: RecurringTransactionsPageProps) {
  const { recurringTransactions, toggleRecurringActive, deleteRecurringTransaction, updateRecurringTransaction } = useFinance();
  const { showConfirm, AlertComponent } = useAlert();
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const handleToggleActive = (id: string) => {
    toggleRecurringActive(id);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: language === 'tr' ? 'Tekrarlayan İşlemi Sil' : 'Delete Recurring Transaction',
      message: language === 'tr'
        ? 'Bu tekrarlayan işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
        : 'Are you sure you want to delete this recurring transaction? This action cannot be undone.',
      type: 'danger',
      confirmText: language === 'tr' ? 'Sil' : 'Delete',
      cancelText: language === 'tr' ? 'İptal' : 'Cancel',
    });
    
    if (confirmed) {
      deleteRecurringTransaction(id);
    }
  };

  const getFrequencyLabel = (frequency: RecurringFrequency) => {
    return t(frequency, language);
  };

  const getTypeColor = (type: string) => {
    if (type === 'income') return 'text-emerald-600 dark:text-emerald-400';
    if (type === 'expense') return 'text-rose-600 dark:text-rose-400';
    if (type === 'savings') return 'text-purple-600 dark:text-purple-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  if (recurringTransactions.length === 0) {
    return (
      <>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Repeat className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('recurringTransactions', language)}
            </h1>
          </div>

          <NoRecurringEmpty language={language} />
        </div>
        
        {/* Alert Dialog */}
        {AlertComponent}
      </>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Repeat className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('recurringTransactions', language)}
          </h1>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {recurringTransactions.length} {language === 'tr' ? 'tekrarlayan işlem' : 'recurring transactions'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recurringTransactions.map((recurring) => (
          <Card key={recurring.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {recurring.title}
                  </h3>
                  {recurring.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t('active', language)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {t('paused', language)}
                    </span>
                  )}
                </div>
                <p className={`text-2xl font-bold ${getTypeColor(recurring.type)}`}>
                  {formatCurrency(recurring.amount, recurring.originalCurrency, language)}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('category', language)}:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {translateCategory(recurring.category, language)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('frequency', language)}:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {getFrequencyLabel(recurring.frequency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('startDate', language)}:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(recurring.startDate, language)}
                </span>
              </div>
              {recurring.endDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('endDate', language)}:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(recurring.endDate, language)}
                  </span>
                </div>
              )}
              {recurring.lastGenerated && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('lastGenerated', language)}:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(recurring.lastGenerated, language)}
                  </span>
                </div>
              )}
              {recurring.description && (
                <div className="text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">{t('description', language)}:</span>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{recurring.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleActive(recurring.id)}
                className="flex-1"
              >
                {recurring.isActive ? (
                  <>
                    <Pause size={16} />
                    {t('pause', language)}
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    {t('resume', language)}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingRecurring(recurring)}
              >
                <Edit2 size={16} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(recurring.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {editingRecurring && (
        <EditRecurringModal
          recurring={editingRecurring}
          language={language}
          currency={currency}
          onClose={() => setEditingRecurring(null)}
          onSave={(updates, applyToExisting) => {
            updateRecurringTransaction(editingRecurring.id, updates, applyToExisting);
            setEditingRecurring(null);
          }}
        />
      )}

      {/* Alert Dialog */}
      {AlertComponent}
    </div>
    </>
  );
}

interface EditRecurringModalProps {
  recurring: RecurringTransaction;
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  onClose: () => void;
  onSave: (updates: Partial<Omit<RecurringTransaction, 'id' | 'isActive'>>, applyToExisting?: boolean) => void;
}

function EditRecurringModal({ recurring, language, onClose, onSave }: EditRecurringModalProps) {
  const [formData, setFormData] = useState({
    title: recurring.title,
    amount: recurring.amount.toString(),
    category: recurring.category,
    frequency: recurring.frequency,
    endDate: recurring.endDate || '',
    description: recurring.description || '',
  });
  const [applyToExisting, setApplyToExisting] = useState(false);

  const handleSubmit = () => {
    onSave({
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      frequency: formData.frequency,
      endDate: formData.endDate || undefined,
      description: formData.description || undefined,
    }, applyToExisting);
  };

  const getCategoryOptions = () => {
    if (recurring.type === 'income') return INCOME_CATEGORIES;
    if (recurring.type === 'savings') return SAVINGS_CATEGORIES;
    return EXPENSE_CATEGORIES;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleSubmit}
      title={t('edit', language) + ' - ' + recurring.title}
      confirmLabel={t('save', language)}
    >
      <div className="space-y-4">
        <Input
          label={t('title', language)}
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />

        <Input
          label={t('amount', language)}
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />

        <Select
          label={t('category', language)}
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          options={getCategoryOptions().map((cat) => ({
            value: cat,
            label: translateCategory(cat, language),
          }))}
        />

        <Select
          label={t('frequency', language)}
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
          options={[
            { value: 'daily', label: t('daily', language) },
            { value: 'weekly', label: t('weekly', language) },
            { value: 'monthly', label: t('monthly', language) },
            { value: 'yearly', label: t('yearly', language) },
          ]}
        />

        <Input
          label={t('endDate', language) + ' (' + (language === 'tr' ? 'Opsiyonel' : 'Optional') + ')'}
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        />

        <Input
          label={t('description', language) + ' (' + (language === 'tr' ? 'Opsiyonel' : 'Optional') + ')'}
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {language === 'tr'
                ? 'Önceki işlemleri de güncelle'
                : 'Update existing transactions'}
            </span>
          </label>
          <p className="text-xs text-blue-700 dark:text-blue-300 ml-7">
            {language === 'tr'
              ? 'Daha önce bu işlemden oluşturulan işlemlerin kategori, başlık ve açıklaması da güncellenecek.'
              : 'Previously generated transactions will also be updated with the new category, title, and description.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
