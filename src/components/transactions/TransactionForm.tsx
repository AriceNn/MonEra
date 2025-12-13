import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Transaction, RecurringTransaction } from '../../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, SAVINGS_CATEGORIES } from '../../types';
import { dateToISOString } from '../../utils/formatters';
import { t, translateCategory } from '../../utils/i18n';
import { useFinance } from '../../hooks/useFinance';
import { useAlert } from '../../hooks/useAlert';

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
  const { addRecurringTransaction, getBudgetProgress, budgets } = useFinance();
  const { showConfirm, AlertComponent } = useAlert();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [formData, setFormData] = useState<{
    type: 'income' | 'expense' | 'savings' | 'withdrawal';
    title: string;
    amount: string;
    category: string;
    date: string;
    description: string;
    originalCurrency: 'TRY' | 'USD' | 'EUR' | 'GBP';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate: string;
  }>({
    type: 'expense',
    title: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0] || '',
    date: dateToISOString(new Date()),
    description: '',
    originalCurrency: currency,
    frequency: 'monthly',
    endDate: '',
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
        frequency: 'monthly',
        endDate: '',
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
    } else if (formData.title.length > 100) {
      newErrors.title = language === 'tr' ? 'Başlık en fazla 100 karakter olabilir' : 'Title must be 100 characters or less';
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = language === 'tr' ? 'Tutar 0\'dan büyük olmalıdır' : 'Amount must be greater than 0';
    } else if (parseFloat(formData.amount) > 999999999) {
      newErrors.amount = language === 'tr' ? 'Tutar çok büyük' : 'Amount is too large';
    }
    
    // Category is required only if not withdrawal
    if (formData.type !== 'withdrawal' && !formData.category) {
      newErrors.category = language === 'tr' ? 'Kategori gereklidir' : 'Category is required';
    }
    
    if (!formData.date) {
      newErrors.date = language === 'tr' ? 'Tarih gereklidir' : 'Date is required';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = language === 'tr' ? 'Açıklama en fazla 500 karakter olabilir' : 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check budget before adding expense
    if (formData.type === 'expense' && mode === 'add') {
      const date = new Date(formData.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const amount = parseFloat(formData.amount);
      
      const budget = budgets.find(b => b.category === formData.category && b.isActive);
      if (budget) {
        const progress = getBudgetProgress(formData.category, month, year);
        if (progress) {
          const projectedSpent = progress.spent + amount;
          const projectedPercentage = (projectedSpent / progress.limit) * 100;
          
          if (projectedPercentage >= budget.alertThreshold) {
            const confirmed = await showConfirm({
              title: language === 'tr' ? 'Bütçe Uyarısı' : 'Budget Warning',
              message: language === 'tr'
                ? `Dikkat! Bu işlem bütçenizin %${projectedPercentage.toFixed(0)}'ine ulaşmanıza neden olacak. Devam etmek istiyor musunuz?`
                : `Warning! This transaction will bring you to ${projectedPercentage.toFixed(0)}% of your budget. Do you want to continue?`,
              type: 'warning',
              confirmText: language === 'tr' ? 'Devam Et' : 'Continue',
              cancelText: language === 'tr' ? 'İptal' : 'Cancel',
            });
            
            if (!confirmed) {
              return;
            }
          }
        }
      }
    }

    // If recurring, create recurring transaction template only
    // generateRecurringTransactions() will create all actual transaction instances
    if (isRecurring && mode === 'add') {
      const recurringData: Omit<RecurringTransaction, 'id'> = {
        type: formData.type,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        frequency: formData.frequency,
        startDate: formData.date,
        endDate: formData.endDate || undefined,
        description: formData.description || undefined,
        originalCurrency: formData.originalCurrency,
        lastGenerated: undefined, // Not generated yet
        nextOccurrence: formData.date, // Start from this date
        isActive: true,
      };
      addRecurringTransaction(recurringData);
      // Note: Actual transactions will be generated by generateRecurringTransactions()
    } else {
      // Normal transaction
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
      frequency: 'monthly',
      endDate: '',
    });
    setIsRecurring(false);
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
        <Button 
          onClick={() => setIsModalOpen(true)} 
          className="gap-2"
          data-transaction-form-trigger="true"
        >
          <Plus size={20} />
          {t('addTransaction', language)}
        </Button>
      )}
      {/* Even when button is hidden, allow external trigger */}
      {!triggerButton && mode === 'add' && (
        <button
          onClick={() => setIsModalOpen(true)}
          data-transaction-form-trigger="true"
          style={{ display: 'none' }}
          aria-hidden="true"
        />
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
            maxLength={100}
          />

          {/* Amount */}
          <Input
            label={t('amount', language)}
            type="number"
            placeholder="0.00"
            min="0"
            max="999999999"
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
            error={errors.description}
            maxLength={500}
          />

          {/* Recurring Toggle (Add mode only) */}
          {mode === 'add' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                id="recurring-toggle"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
              />
              <label
                htmlFor="recurring-toggle"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t('makeRecurring', language)}
              </label>
            </div>
          )}

          {/* Recurring Options */}
          {isRecurring && mode === 'add' && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                label={`${t('endDate', language)} (${language === 'tr' ? 'Opsiyonel' : 'Optional'})`}
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                helperText={language === 'tr' ? 'Boş bırakırsanız süresiz devam eder' : 'Leave empty for no end date'}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Alert Dialog */}
      {AlertComponent}
    </>
  );
}
