import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Transaction } from '../../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../types';
import { dateToISOString } from '../../utils/formatters';

interface AddTransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

export function AddTransactionForm({ onAdd }: AddTransactionFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    type: 'income' | 'expense';
    title: string;
    amount: string;
    category: string;
    date: string;
    description: string;
  }>({
    type: 'expense',
    title: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0] || '',
    date: dateToISOString(new Date()),
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onAdd({
      type: formData.type,
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      description: formData.description || undefined,
    });

    // Reset form
    setFormData({
      type: 'expense',
      title: '',
      amount: '',
      category: EXPENSE_CATEGORIES[0] || '',
      date: dateToISOString(new Date()),
      description: '',
    });
    setErrors({});
    setIsModalOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="gap-2">
        <Plus size={20} />
        Add Transaction
      </Button>

      <Modal
        isOpen={isModalOpen}
        title="Add Transaction"
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSubmit}
        confirmLabel="Add"
      >
        <div className="space-y-4">
          {/* Type Selection */}
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value as 'income' | 'expense';
              const newCategory = newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
              setFormData((prev) => ({
                ...prev,
                type: newType,
                category: newCategory || '',
              }));
            }}
            options={[
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
          />

          {/* Title */}
          <Input
            label="Title"
            type="text"
            placeholder="e.g., Lunch, Salary"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
          />

          {/* Amount */}
          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            error={errors.amount}
          />

          {/* Category */}
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            error={errors.category}
            options={categories.map((cat) => ({ value: cat, label: cat }))}
          />

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            error={errors.date}
          />

          {/* Description (Optional) */}
          <Input
            label="Description (Optional)"
            type="text"
            placeholder="Add a note..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
