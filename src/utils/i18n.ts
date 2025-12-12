export const translations = {
  tr: {
    // Navigation
    dashboard: 'Panel',
    transactions: 'İşlemler',
    settings: 'Ayarlar',
    
    // Actions
    addTransaction: 'İşlem Ekle',
    edit: 'Düzenle',
    delete: 'Sil',
    save: 'Kaydet',
    cancel: 'İptal',
    
    // Summary Cards
    income: 'Gelir',
    expense: 'Gider',
    netWorth: 'Net Değer',
    saveRate: 'Tasarruf Oranı',
    
    // Charts
    wealth: 'Servet',
    cashFlow: 'Nakit Akışı',
    expenses: 'Harcamalar',
    
    // Transaction Form
    transactionType: 'İşlem Tipi',
    category: 'Kategori',
    amount: 'Tutar',
    date: 'Tarih',
    description: 'Açıklama',
    title: 'Başlık',
    
    // Transaction Types
    incomeType: 'Gelir',
    expenseType: 'Gider',
    savingsType: 'Tasarruf',
    
    // Summary Cards
    savings: 'Tasarruf',
    cashBalance: 'Nakit Bakiye',
    withdrawal: 'Tasarruftan Çıkış',
    
    // Messages
    noTransactions: 'Henüz işlem yok. Yeni işlem ekleyerek başlayın!',
    noDataCharts: 'Grafikleri görmek için işlem ekleyin!',
    
    // Months
    january: 'Ocak',
    february: 'Şubat',
    march: 'Mart',
    april: 'Nisan',
    may: 'Mayıs',
    june: 'Haziran',
    july: 'Temmuz',
    august: 'Ağustos',
    september: 'Eylül',
    october: 'Ekim',
    november: 'Kasım',
    december: 'Aralık',
    
    // Categories - Income
    'Salary': 'Maaş',
    'Investment Return': 'Yatırım Getirisi',
    'Bonus': 'İkramiye',
    'Freelance': 'Serbest Çalışma',
    'Rental Income': 'Kira Geliri',
    'Pension': 'Emekli Maaşı',
    'Dividend': 'Temettü',
    'Other Income': 'Diğer Gelir',
    
    // Categories - Expense
    'Food': 'Yemek',
    'Transportation': 'Ulaşım',
    'Rent': 'Kira',
    'Utilities': 'Faturalar',
    'Healthcare': 'Sağlık',
    'Education': 'Eğitim',
    'Entertainment': 'Eğlence',
    'Shopping': 'Alışveriş',
    'Insurance': 'Sigorta',
    'Phone': 'Telefon',
    'Internet': 'İnternet',
    'Subscriptions': 'Abonelikler',
    'Personal Care': 'Kişisel Bakım',
    'Other Expense': 'Diğer Gider',
    
    // Categories - Savings
    'Emergency Fund': 'Acil Durum Fonu',
    'Investment': 'Yatırım',
    'Retirement': 'Emeklilik',
    'Goal Savings': 'Hedef Tasarruf',
    'Other Savings': 'Diğer Tasarruf',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    settings: 'Settings',
    
    // Actions
    addTransaction: 'Add Transaction',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    
    // Summary Cards
    income: 'Income',
    expense: 'Expense',
    netWorth: 'Net Worth',
    saveRate: 'Save Rate',
    
    // Charts
    wealth: 'Wealth',
    cashFlow: 'Cash Flow',
    expenses: 'Expenses',
    
    // Transaction Form
    transactionType: 'Transaction Type',
    category: 'Category',
    amount: 'Amount',
    date: 'Date',
    description: 'Description',
    title: 'Title',
    
    // Transaction Types
    incomeType: 'Income',
    expenseType: 'Expense',
    savingsType: 'Savings',
    
    // Summary Cards
    savings: 'Savings',
    cashBalance: 'Cash Balance',
    withdrawal: 'Withdraw from Savings',
    
    // Messages
    noTransactions: 'No transactions yet. Start by adding a new one!',
    noDataCharts: 'Add transactions to see visualizations!',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    
    // Categories - Income
    'Salary': 'Salary',
    'Investment Return': 'Investment Return',
    'Bonus': 'Bonus',
    'Freelance': 'Freelance',
    'Rental Income': 'Rental Income',
    'Pension': 'Pension',
    'Dividend': 'Dividend',
    'Other Income': 'Other Income',
    
    // Categories - Expense
    'Food': 'Food',
    'Transportation': 'Transportation',
    'Rent': 'Rent',
    'Utilities': 'Utilities',
    'Healthcare': 'Healthcare',
    'Education': 'Education',
    'Entertainment': 'Entertainment',
    'Shopping': 'Shopping',
    'Insurance': 'Insurance',
    'Phone': 'Phone',
    'Internet': 'Internet',
    'Subscriptions': 'Subscriptions',
    'Personal Care': 'Personal Care',
    'Other Expense': 'Other Expense',
    
    // Categories - Savings
    'Emergency Fund': 'Emergency Fund',
    'Investment': 'Investment',
    'Retirement': 'Retirement',
    'Goal Savings': 'Goal Savings',
    'Other Savings': 'Other Savings',
  },
};

export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, language: 'tr' | 'en'): string {
  return translations[language][key];
}

export function translateCategory(category: string, language: 'tr' | 'en'): string {
  const key = category as TranslationKey;
  return translations[language][key] || category;
}

export function getMonthName(monthIndex: number, language: 'tr' | 'en'): string {
  const months: TranslationKey[] = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  return t(months[monthIndex], language);
}
