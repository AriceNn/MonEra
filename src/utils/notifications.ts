import type { CategoryBudget, RecurringTransaction, Transaction } from '../types';
import { translateCategory, getMonthName } from './i18n';

type Language = 'tr' | 'en';

/**
 * Notification Types
 */
export type NotificationType = 
  | 'budget_warning'      // 80% of budget reached
  | 'budget_exceeded'     // Budget exceeded
  | 'recurring_due'       // Recurring transaction is due
  | 'savings_milestone'   // Reached savings goal
  | 'expense_spike';      // Unusual high spending

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  budgetWarnings: boolean;
  budgetExceeded: boolean;
  recurringReminders: boolean;
  savingsMilestones: boolean;
  expenseSpikes: boolean;
  sound: boolean;
  desktop: boolean; // Browser notifications
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  budgetWarnings: true,
  budgetExceeded: true,
  recurringReminders: true,
  savingsMilestones: false,
  expenseSpikes: false,
  sound: false,
  desktop: false
};

/**
 * Notification Manager
 * 
 * Handles all notification logic:
 * - Budget alerts
 * - Recurring reminders
 * - Savings milestones
 * - Expense spike detection
 */
export class NotificationManager {
  private notifications: Notification[] = [];
  private settings: NotificationSettings;
  private onNewNotification?: (notification: Notification) => void;
  private language: Language;

  constructor(
    settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS,
    language: Language = 'tr'
  ) {
    this.settings = settings;
    this.language = language;
    this.loadNotifications();
  }
  
  /**
   * Update language
   */
  setLanguage(language: Language): void {
    this.language = language;
  }

  /**
   * Load notifications from localStorage
   */
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('fintrack_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Notifications] Error loading:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotifications(): void {
    try {
      localStorage.setItem('fintrack_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('[Notifications] Error saving:', error);
    }
  }

  /**
   * Add notification
   */
  private addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      isRead: false
    };

    this.notifications.unshift(newNotification);
    this.saveNotifications();

    // Trigger callback
    if (this.onNewNotification) {
      this.onNewNotification(newNotification);
    }

    // Browser notification
    if (this.settings.desktop && this.settings.enabled) {
      this.showDesktopNotification(newNotification);
    }

    return newNotification;
  }

  /**
   * Show browser desktop notification
   */
  private async showDesktopNotification(notification: Notification): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showDesktopNotification(notification);
      }
    }
  }

  /**
   * Set notification callback
   */
  setOnNewNotification(callback: (notification: Notification) => void): void {
    this.onNewNotification = callback;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return this.notifications;
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.saveNotifications();
  }

  /**
   * Check budget alerts
   */
  checkBudgetAlerts(
    budget: CategoryBudget,
    spent: number,
    month: number,
    year: number
  ): void {
    if (!this.settings.enabled) return;

    const percentage = (spent / budget.monthlyLimit) * 100;
    const monthName = getMonthName(month, this.language);
    const categoryTranslated = translateCategory(budget.category, this.language);

    // Budget warning (80% threshold)
    if (this.settings.budgetWarnings && percentage >= budget.alertThreshold && percentage < 100) {
      const existing = this.notifications.find(
        n => n.type === 'budget_warning' && 
             n.metadata?.budgetId === budget.id &&
             n.metadata?.month === month &&
             n.metadata?.year === year
      );

      if (!existing) {
        const remaining = budget.monthlyLimit - spent;
        const title = categoryTranslated;
        const message = this.language === 'tr'
          ? `${monthName}: ${spent.toFixed(0)} ₺ harcandı (%${percentage.toFixed(0)}). Kalan: ${remaining.toFixed(0)} ₺. Limit: ${budget.monthlyLimit.toFixed(0)} ₺`
          : `${monthName}: ${spent.toFixed(0)} spent (${percentage.toFixed(0)}%). Remaining: ${remaining.toFixed(0)}. Limit: ${budget.monthlyLimit.toFixed(0)}`;
        
        this.addNotification({
          type: 'budget_warning',
          title,
          message,
          severity: 'warning',
          actionUrl: '/budget',
          metadata: {
            budgetId: budget.id,
            category: budget.category,
            spent,
            limit: budget.monthlyLimit,
            percentage,
            month,
            year
          }
        });
      }
    }

    // Budget exceeded (100%+)
    if (this.settings.budgetExceeded && percentage >= 100) {
      const existing = this.notifications.find(
        n => n.type === 'budget_exceeded' && 
             n.metadata?.budgetId === budget.id &&
             n.metadata?.month === month &&
             n.metadata?.year === year
      );

      if (!existing) {
        const overspent = spent - budget.monthlyLimit;
        const title = categoryTranslated;
        const message = this.language === 'tr'
          ? `${monthName}: ${spent.toFixed(0)} ₺ harcandı (Limit: ${budget.monthlyLimit.toFixed(0)} ₺). ${overspent.toFixed(0)} ₺ fazla harcama yaptınız. Bu kategorideki işlemlerinizi gözden geçirin.`
          : `${monthName}: ${spent.toFixed(0)} spent (Limit: ${budget.monthlyLimit.toFixed(0)}). You exceeded by ${overspent.toFixed(0)}. Review transactions in this category.`;
        
        this.addNotification({
          type: 'budget_exceeded',
          title,
          message,
          severity: 'error',
          actionUrl: '/budget',
          metadata: {
            budgetId: budget.id,
            category: budget.category,
            spent,
            limit: budget.monthlyLimit,
            overspent,
            percentage,
            month,
            year
          }
        });
      }
    }
  }

  /**
   * Check recurring reminders
   */
  checkRecurringReminders(pendingRecurring: RecurringTransaction[]): void {
    if (!this.settings.enabled || !this.settings.recurringReminders) return;

    const today = new Date().toISOString().split('T')[0];

    pendingRecurring.forEach(recurring => {
      const existing = this.notifications.find(
        n => n.type === 'recurring_due' && 
             n.metadata?.recurringId === recurring.id &&
             n.timestamp.split('T')[0] === today
      );

      if (!existing) {
        const categoryTranslated = translateCategory(recurring.category, this.language);
        const typeText = this.language === 'tr' 
          ? (recurring.type === 'income' ? 'Gelir' : recurring.type === 'expense' ? 'Gider' : 'Tasarruf')
          : (recurring.type === 'income' ? 'Income' : recurring.type === 'expense' ? 'Expense' : 'Savings');
        const title = recurring.title;
        const message = this.language === 'tr'
          ? `${typeText} - ${categoryTranslated}: ${recurring.amount.toFixed(0)} ${recurring.originalCurrency} bugün için planlandı. İşlemi eklemek için Tekrarlayan bölümüne gidin.`
          : `${typeText} - ${categoryTranslated}: ${recurring.amount.toFixed(0)} ${recurring.originalCurrency} scheduled for today. Go to Recurring section to add the transaction.`;
        
        this.addNotification({
          type: 'recurring_due',
          title,
          message,
          severity: 'info',
          actionUrl: '/recurring',
          metadata: {
            recurringId: recurring.id,
            title: recurring.title,
            amount: recurring.amount,
            category: recurring.category,
            type: recurring.type
          }
        });
      }
    });
  }

  /**
   * Check savings milestones
   */
  checkSavingsMilestone(totalSavings: number): void {
    if (!this.settings.enabled || !this.settings.savingsMilestones) return;

    const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
    const reachedMilestone = milestones.find(m => {
      const existing = this.notifications.find(
        n => n.type === 'savings_milestone' && n.metadata?.milestone === m
      );
      return totalSavings >= m && !existing;
    });

    if (reachedMilestone) {
      const nextMilestone = milestones.find(m => m > reachedMilestone);
      const title = this.language === 'tr' ? '🎉 Tasarruf Hedefine Ulaştınız!' : '🎉 Savings Milestone Reached!';
      const message = this.language === 'tr'
        ? `Toplam tasarrufunuz ${totalSavings.toLocaleString()} ₺ oldu. ${reachedMilestone.toLocaleString()} ₺ hedefinize ulaştınız!${nextMilestone ? ` Sonraki hedef: ${nextMilestone.toLocaleString()} ₺` : ' Harikasınız!'}`
        : `Your total savings reached ${totalSavings.toLocaleString()}. You've achieved the ${reachedMilestone.toLocaleString()} milestone!${nextMilestone ? ` Next goal: ${nextMilestone.toLocaleString()}` : ' Amazing!'}`;
      
      this.addNotification({
        type: 'savings_milestone',
        title,
        message,
        severity: 'success',
        metadata: {
          milestone: reachedMilestone,
          totalSavings
        }
      });
    }
  }

  /**
   * Check expense spikes (unusual spending)
   */
  checkExpenseSpike(
    transactions: Transaction[],
    newTransaction: Transaction
  ): void {
    if (!this.settings.enabled || !this.settings.expenseSpikes) return;
    if (newTransaction.type !== 'expense') return;

    // Calculate average expense in same category
    const categoryExpenses = transactions.filter(
      t => t.type === 'expense' && t.category === newTransaction.category
    );

    if (categoryExpenses.length < 5) return; // Not enough data

    const avgAmount = categoryExpenses.reduce((sum, t) => sum + t.amount, 0) / categoryExpenses.length;
    const threshold = avgAmount * 2; // 2x average

    if (newTransaction.amount >= threshold) {
      const categoryTranslated = translateCategory(newTransaction.category, this.language);
      const title = `${categoryTranslated} - ${newTransaction.title}`;
      const message = this.language === 'tr'
        ? `Bu işlem ${newTransaction.amount.toFixed(0)} ₺ tutarında ve normalden 2 kat yüksek. ${categoryTranslated} kategorisindeki ortalama harcamanız: ${avgAmount.toFixed(0)} ₺. Bu olağandışı bir harcama mı?`
        : `This transaction is ${newTransaction.amount.toFixed(0)} and 2x higher than average. Your average ${categoryTranslated} spending: ${avgAmount.toFixed(0)}. Is this unusual spending?`;
      
      this.addNotification({
        type: 'expense_spike',
        title,
        message,
        severity: 'warning',
        metadata: {
          transactionId: newTransaction.id,
          amount: newTransaction.amount,
          average: avgAmount,
          category: newTransaction.category
        }
      });
    }
  }
}
