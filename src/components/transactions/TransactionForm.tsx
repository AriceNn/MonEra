import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Transaction } from '../../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, SAVINGS_CATEGORIES } from '../../types';
import { dateToISOString } from '../../utils/formatters';
import { t, translateCategory } from '../../utils/i18n';

interface TransactionFormProps {
  mode: 'add' | 'edit';
  transaction?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => boolean | void;
  onClose?: () => void;
  triggerButton?: boolean;
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
}

export function TransactionForm({ 
  mode, 
  transaction, 
  onSubmit, 
  onClose,
  triggerButton = true,
  language,
  currency
}: TransactionFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    type: 'income' | 'expense' | 'savings' | 'withdrawal';
    title: string;
    amount: string;
    category: string;
    date: string;
    description: string;
    originalCurrency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  }>({
    type: 'expense',
    title: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0] || '',
    date: dateToISOString(new Date()),
    description: '',
    originalCurrency: currency,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load transaction data when editing
  useEffect(() => {
    if (mode === 'edit' && transaction) {
      setFormData({
        type: transaction.type,
        title: transaction.title,
        amount: transaction.amount.toString(),
        category: transaction.category,
        date: transaction.date,
        description: transaction.description || '',
        originalCurrency: (transaction as any).originalCurrency || currency,
      });
      setIsModalOpen(true);
    }
  }, [mode, transaction]);

  const categories = formData.type === 'income' 
    ? INCOME_CATEGORIES 
    : (formData.type === 'savings' || formData.type === 'withdrawal')
    ? SAVINGS_CATEGORIES
    : EXPENSE_CATEGORIES;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = language === 'tr' ? 'Başlık gereklidir' : 'Title is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = language === 'tr' ? 'Tutar 0\'dan büyük olmalıdır' : 'Amount must be greater than 0';
    }
    // Category is required only if not withdrawal
    if (formData.type !== 'withdrawal' && !formData.category) {
      newErrors.category = language === 'tr' ? 'Kategori gereklidir' : 'Category is required';
    }
    if (!formData.date) {
      newErrors.date = language === 'tr' ? 'Tarih gereklidir' : 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const result = onSubmit({
      type: formData.type,
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      description: formData.description || undefined,
      originalCurrency: formData.originalCurrency,
    });

    if (result === false) {
      const message = language === 'tr'
        ? 'Nakit bakiye yetersiz. Tutarı düşürmeyi deneyin.'
        : 'Insufficient cash balance. Try a lower amount.';
      setErrors((prev) => ({ ...prev, amount: message }));
      return;
    }

    // Reset form
    setFormData({
      type: 'expense',
      title: '',
      amount: '',
      category: EXPENSE_CATEGORIES[0] || '',
      date: dateToISOString(new Date()),
      description: '',
      originalCurrency: currency,
    });
    setErrors({});
    setIsModalOpen(false);
    onClose?.();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setErrors({});
    onClose?.();
  };

  return (
    <>
      {triggerButton && mode === 'add' && (
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={20} />
          {t('addTransaction', language)}
        </Button>
      )}

      <Modal
        isOpen={isModalOpen}
        title={mode === 'add' ? t('addTransaction', language) : t('edit', language)}
        onClose={handleClose}
        onConfirm={handleSubmit}
        confirmLabel={mode === 'add' ? t('addTransaction', language).split(' ')[1] : t('save', language)}
      >
        <div className="space-y-4">
          {/* Type Selection */}
          <Select
            label={t('transactionType', language)}
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value as 'income' | 'expense' | 'savings' | 'withdrawal';
              const newCategory = newType === 'income' 
                ? INCOME_CATEGORIES[0] 
                : (newType === 'savings' || newType === 'withdrawal')
                ? SAVINGS_CATEGORIES[0]
                : EXPENSE_CATEGORIES[0];
              setFormData((prev) => ({
                ...prev,
                type: newType,
                category: newCategory || '',
              }));
            }}
            options={[
              { value: 'income', label: t('incomeType', language) },
              { value: 'expense', label: t('expenseType', language) },
              { value: 'savings', label: t('savingsType', language) },
              { value: 'withdrawal', label: t('withdrawal', language) },
            ]}
          />

          {/* Title */}
          <Input
            label={t('title', language)}
            type="text"
            placeholder={language === 'tr' ? 'ör: Öğle Yemeği, Maaş' : 'e.g., Lunch, Salary'}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
          />

          {/* Amount */}
          <Input
            label={t('amount', language)}
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            error={errors.amount}
          />

          {/* Currency for this transaction */}
          <Select
            label={t('currency', language)}
            value={formData.originalCurrency}
            onChange={(e) => setFormData({ ...formData, originalCurrency: e.target.value as any })}
            options={[
              { value: 'TRY', label: '₺ TRY' },
              { value: 'USD', label: '$ USD' },
              { value: 'EUR', label: '€ EUR' },
              { value: 'GBP', label: '£ GBP' },
            ]}
          />

          {/* Category - Hidden for withdrawal */}
          {formData.type !== 'withdrawal' && (
            <Select
              label={t('category', language)}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              error={errors.category}
              options={categories.map((cat) => ({ value: cat, label: translateCategory(cat, language) }))}
            />
          )}

          {/* Date */}
          <Input
            label={t('date', language)}
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            error={errors.date}
          />

          {/* Description (Optional) */}
          <Input
            label={`${t('description', language)} (${language === 'tr' ? 'Opsiyonel' : 'Optional'})`}
            type="text"
            placeholder={language === 'tr' ? 'Not ekle...' : 'Add a note...'}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
