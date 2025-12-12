import { useState } from 'react';
import { Target, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { BudgetProgressBar } from '../components/budget/BudgetProgressBar';
import { translateCategory } from '../utils/i18n';
import { formatCurrency } from '../utils/formatters';
import { EXPENSE_CATEGORIES } from '../types';
import { NoBudgetsEmpty } from '../components/ui/EmptyState';

interface BudgetPageProps {
  language: 'tr' | 'en';
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  selectedMonth: number;
  selectedYear: number;
}

export function BudgetPage({ language, currency, selectedMonth, selectedYear }: BudgetPageProps) {
  const { budgets, setBudget, deleteBudget, toggleBudgetActive, getBudgetProgress } = useFinance();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0] || '',
    monthlyLimit: '',
    alertThreshold: '80',
  });

  const handleAddBudget = () => {
    if (!formData.category || !formData.monthlyLimit) return;

    // Check if budget already exists for this category
    const exists = budgets.some((b) => b.category === formData.category);
    if (exists) {
      alert(language === 'tr' ? 'Bu kategori için zaten bir bütçe var!' : 'Budget already exists for this category!');
      return;
    }

    setBudget({
      category: formData.category,
      monthlyLimit: parseFloat(formData.monthlyLimit),
      alertThreshold: parseInt(formData.alertThreshold),
      isActive: true,
      currency: currency,
    });

    // Reset form
    setFormData({
      category: EXPENSE_CATEGORIES[0] || '',
      monthlyLimit: '',
      alertThreshold: '80',
    });
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, category: string) => {
    if (window.confirm(language === 'tr' 
      ? `${translateCategory(category, language)} için bütçeyi silmek istediğinizden emin misiniz?`
      : `Are you sure you want to delete the budget for ${translateCategory(category, language)}?`)) {
      deleteBudget(id);
    }
  };

  // Get available categories (not yet budgeted)
  const availableCategories = EXPENSE_CATEGORIES.filter(
    (cat) => !budgets.some((b) => b.category === cat)
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {language === 'tr' ? 'Bütçe Yönetimi' : 'Budget Management'}
          </h1>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
          <Plus size={20} />
          {language === 'tr' ? 'Bütçe Ekle' : 'Add Budget'}
        </Button>
      </div>

      {budgets.length === 0 ? (
        <NoBudgetsEmpty
          onAdd={() => setIsAddModalOpen(true)}
          language={language}
        />
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const progress = getBudgetProgress(budget.category, selectedMonth, selectedYear);
            
            return (
              <Card key={budget.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {translateCategory(budget.category, language)}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {language === 'tr' ? 'Aylık Limit' : 'Monthly Limit'}: {formatCurrency(budget.monthlyLimit, budget.currency, language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBudgetActive(budget.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={budget.isActive ? (language === 'tr' ? 'Devre Dışı Bırak' : 'Disable') : (language === 'tr' ? 'Etkinleştir' : 'Enable')}
                    >
                      {budget.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                      )}
                    </button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(budget.id, budget.category)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {budget.isActive && progress && (
                  <BudgetProgressBar
                    category={budget.category}
                    spent={progress.spent}
                    limit={progress.limit}
                    percentage={progress.percentage}
                    exceeded={progress.exceeded}
                    alertThreshold={budget.alertThreshold}
                    currency={budget.currency}
                    language={language}
                  />
                )}

                {!budget.isActive && (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                    {language === 'tr' ? 'Bütçe takibi devre dışı' : 'Budget tracking disabled'}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Budget Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddBudget}
        title={language === 'tr' ? 'Yeni Bütçe Ekle' : 'Add New Budget'}
        confirmLabel={language === 'tr' ? 'Ekle' : 'Add'}
      >
        <div className="space-y-4">
          <Select
            label={language === 'tr' ? 'Kategori' : 'Category'}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={availableCategories.map((cat) => ({
              value: cat,
              label: translateCategory(cat, language),
            }))}
          />

          <Input
            label={language === 'tr' ? 'Aylık Limit' : 'Monthly Limit'}
            type="number"
            step="0.01"
            min="0"
            value={formData.monthlyLimit}
            onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
            helperText={`${language === 'tr' ? 'Para Birimi' : 'Currency'}: ${currency}`}
          />

          <Input
            label={language === 'tr' ? 'Uyarı Eşiği (%)' : 'Alert Threshold (%)'}
            type="number"
            min="0"
            max="100"
            value={formData.alertThreshold}
            onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
            helperText={language === 'tr' ? 'Bu yüzdeye ulaştığınızda uyarı alırsınız' : 'You will be alerted when reaching this percentage'}
          />
        </div>
      </Modal>
    </div>
  );
}
