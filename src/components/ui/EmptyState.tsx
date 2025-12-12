import { 
  FileQuestion, 
  Calendar, 
  Target,
  Receipt,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        {icon || <FileQuestion className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoTransactionsEmpty({ onAdd, language }: { onAdd: () => void; language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<Receipt className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'İşlem Bulunamadı' : 'No Transactions Found'}
      description={
        language === 'tr'
          ? 'Henüz hiç işlem eklemediniz. İlk işleminizi ekleyerek finansal takibinize başlayın.'
          : 'You haven\'t added any transactions yet. Start tracking your finances by adding your first transaction.'
      }
      action={{
        label: language === 'tr' ? '➕ İşlem Ekle' : '➕ Add Transaction',
        onClick: onAdd,
      }}
    />
  );
}

export function NoRecurringEmpty({ onAdd, language }: { onAdd?: () => void; language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'Tekrarlayan İşlem Yok' : 'No Recurring Transactions'}
      description={
        language === 'tr'
          ? 'Düzenli gelir veya giderlerinizi otomatik takip etmek için tekrarlayan işlem ekleyin.'
          : 'Add recurring transactions to automatically track your regular income and expenses.'
      }
      action={onAdd ? {
        label: language === 'tr' ? '➕ Tekrarlayan İşlem Ekle' : '➕ Add Recurring',
        onClick: onAdd,
      } : undefined}
    />
  );
}

export function NoBudgetsEmpty({ onAdd, language }: { onAdd: () => void; language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<Target className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'Bütçe Belirlenmemiş' : 'No Budgets Set'}
      description={
        language === 'tr'
          ? 'Kategoriler için bütçe limitleri belirleyerek harcamalarınızı kontrol altında tutun.'
          : 'Set budget limits for categories to keep your spending under control.'
      }
      action={{
        label: language === 'tr' ? '➕ Bütçe Ekle' : '➕ Add Budget',
        onClick: onAdd,
      }}
    />
  );
}

export function NoAnalyticsDataEmpty({ language }: { language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'Analiz İçin Veri Yok' : 'No Data for Analysis'}
      description={
        language === 'tr'
          ? 'Analitik raporlar görmek için önce işlem eklemeniz gerekiyor.'
          : 'You need to add transactions first to see analytics reports.'
      }
    />
  );
}

export function NoSearchResultsEmpty({ onClear, language }: { onClear?: () => void; language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<FileQuestion className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'Sonuç Bulunamadı' : 'No Results Found'}
      description={
        language === 'tr'
          ? 'Arama kriterlerinize uygun işlem bulunamadı. Farklı filtreler deneyin.'
          : 'No transactions match your search criteria. Try different filters.'
      }
      action={onClear ? {
        label: language === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters',
        onClick: onClear
      } : undefined}
    />
  );
}

export function NoNotificationsEmpty({ language }: { language: 'tr' | 'en' }) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title={language === 'tr' ? 'Bildirim Yok' : 'No Notifications'}
      description={
        language === 'tr'
          ? 'Bütçe uyarıları ve diğer bildirimler burada görünecek.'
          : 'Budget alerts and other notifications will appear here.'
      }
    />
  );
}

export function ErrorState({ 
  title, 
  description, 
  onRetry, 
  language 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void;
  language: 'tr' | 'en';
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-8 h-8 text-red-500" />}
      title={title || (language === 'tr' ? 'Bir Hata Oluştu' : 'An Error Occurred')}
      description={
        description || 
        (language === 'tr' 
          ? 'Bir şeyler ters gitti. Lütfen tekrar deneyin.' 
          : 'Something went wrong. Please try again.')
      }
      action={onRetry ? {
        label: language === 'tr' ? '🔄 Tekrar Dene' : '🔄 Retry',
        onClick: onRetry,
      } : undefined}
    />
  );
}
