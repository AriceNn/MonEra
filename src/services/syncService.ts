import { supabase, getCurrentUser } from '../lib/supabase';
import { db } from '../db/schema';
import type { Transaction, RecurringTransaction } from '../types';

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: string[];
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
}

/**
 * SyncService - Manages data synchronization between IndexedDB and Supabase
 * 
 * Features:
 * - Push local changes to cloud
 * - Pull cloud changes to local
 * - Conflict resolution (last-write-wins strategy)
 * - Offline queue management
 */
export class SyncService {
  private static instance: SyncService;
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  };
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  private constructor() {
    // Load last sync time from localStorage
    const lastSync = localStorage.getItem('monera-last-sync');
    if (lastSync) {
      this.syncStatus.lastSyncTime = new Date(lastSync);
    }
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners about sync status changes
   */
  private notifyListeners() {
    this.syncListeners.forEach(listener => listener(this.syncStatus));
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Full sync - Push local changes and pull cloud changes
   */
  async syncAll(): Promise<SyncResult> {
    console.log('🔄 [SyncService] Starting full sync...');
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ [SyncService] User not authenticated');
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['User not authenticated'],
      };
    }

    console.log('✅ [SyncService] User authenticated:', user.email);
    this.syncStatus.isSyncing = true;
    this.syncStatus.error = null;
    this.notifyListeners();

    const errors: string[] = [];
    let totalSynced = 0;
    let totalConflicts = 0;

    try {
      // Sync transactions
      const txResult = await this.syncTransactions(user.id);
      totalSynced += txResult.synced;
      totalConflicts += txResult.conflicts;
      errors.push(...txResult.errors);

      // Sync recurring transactions
      const recurringResult = await this.syncRecurringTransactions(user.id);
      totalSynced += recurringResult.synced;
      totalConflicts += recurringResult.conflicts;
      errors.push(...recurringResult.errors);

      // Update last sync time
      this.syncStatus.lastSyncTime = new Date();
      localStorage.setItem('monera-last-sync', this.syncStatus.lastSyncTime.toISOString());

      const result = {
        success: errors.length === 0,
        synced: totalSynced,
        conflicts: totalConflicts,
        errors,
      };
      
      console.log('✅ [SyncService] Sync completed:', result);
      return result;
    } catch (error: any) {
      this.syncStatus.error = error.message;
      return {
        success: false,
        synced: totalSynced,
        conflicts: totalConflicts,
        errors: [error.message],
      };
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync transactions between local and cloud
   */
  private async syncTransactions(userId: string): Promise<SyncResult> {
    console.log('📤 [SyncService] Starting transaction sync...');
    const errors: string[] = [];
    let synced = 0;
    let conflicts = 0;

    try {
      // 1. Push local transactions to cloud
      const localTransactions = await db.transactions.toArray();
      console.log(`📊 [SyncService] Found ${localTransactions.length} local transactions`);
      
      for (const tx of localTransactions) {
        try {
          console.log(`📤 [SyncService] Syncing transaction ${tx.id.substring(0, 8)}...`);
          
          // Use UPSERT to avoid duplicates - will insert or update automatically
          const { error: upsertError } = await supabase
            .from('transactions')
            .upsert({
              id: tx.id,
              user_id: userId,
              title: tx.title,
              amount: tx.amount,
              category: tx.category,
              type: tx.type,
              date: tx.date,
              description: tx.description,
              is_recurring: tx.isRecurring || false,
              original_currency: tx.originalCurrency || 'TRY',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id',
              ignoreDuplicates: false // Update if exists
            });

          if (upsertError) {
            console.error(`❌ [SyncService] Upsert error for ${tx.id}:`, upsertError);
            errors.push(`Transaction ${tx.id}: ${upsertError.message}`);
          } else {
            synced++;
          }
        } catch (error: any) {
          console.error(`❌ [SyncService] Exception for ${tx.id}:`, error);
          errors.push(`Transaction ${tx.id}: ${error.message}`);
        }
      }

      // 2. Pull cloud transactions to local
      console.log('📥 [SyncService] Fetching cloud transactions...');
      const { data: cloudTransactions, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('❌ [SyncService] Fetch error:', fetchError);
        errors.push(`Fetch error: ${fetchError.message}`);
      } else if (cloudTransactions) {
        console.log(`📊 [SyncService] Found ${cloudTransactions.length} cloud transactions`);
        
        for (const cloudTx of cloudTransactions) {
          try {
            const localTx = await db.transactions.get(cloudTx.id);

            if (!localTx) {
              // New cloud transaction, add to local
              console.log(`📥 [SyncService] Adding new transaction from cloud: ${cloudTx.id.substring(0, 8)}`);
              
              const newTransaction = {
                id: cloudTx.id,
                title: cloudTx.title,
                amount: cloudTx.amount,
                category: cloudTx.category,
                type: cloudTx.type,
                date: cloudTx.date,
                description: cloudTx.description,
                isRecurring: cloudTx.is_recurring,
                originalCurrency: cloudTx.original_currency,
              };
              
              console.log(`💾 [SyncService] Transaction data:`, newTransaction);
              
              const addedId = await db.transactions.add(newTransaction);
              console.log(`✅ [SyncService] Added to IndexedDB with ID: ${addedId}`);
              
              // Verify it was added
              const verify = await db.transactions.get(cloudTx.id);
              console.log(`🔍 [SyncService] Verification read:`, verify ? 'Found' : 'NOT FOUND!');
              
              synced++;
            } else {
              // Transaction already exists locally - skip to avoid duplicates
              console.log(`⏭️ [SyncService] Transaction ${cloudTx.id.substring(0, 8)} already exists locally, skipping`);
            }
          } catch (error: any) {
            // If it's a duplicate key error, log and continue
            if (error.name === 'ConstraintError') {
              console.warn(`⚠️ [SyncService] Duplicate transaction ${cloudTx.id}, skipping`);
            } else {
              console.error(`❌ [SyncService] Error adding transaction ${cloudTx.id}:`, error);
              errors.push(`Cloud transaction ${cloudTx.id}: ${error.message}`);
            }
          }
        }
      }

      return { success: errors.length === 0, synced, conflicts, errors };
    } catch (error: any) {
      return {
        success: false,
        synced,
        conflicts,
        errors: [error.message],
      };
    }
  }

  /**
   * Push a single transaction to cloud (for real-time sync)
   */
  async pushTransaction(transaction: Transaction): Promise<boolean> {
    console.log('📤 [SyncService] Pushing transaction:', transaction.id);
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ [SyncService] User not authenticated for push');
      return false;
    }

    try {
      const { error } = await supabase.from('transactions').upsert({
        id: transaction.id,
        user_id: user.id,
        title: transaction.title,
        amount: transaction.amount,
        category: transaction.category,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        is_recurring: transaction.isRecurring || false,
        original_currency: transaction.originalCurrency || 'TRY',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false // Update if exists instead of throwing error
      });

      if (error) {
        console.error('❌ [SyncService] Push error:', error);
        return false;
      }
      
      console.log('✅ [SyncService] Transaction pushed successfully');
      return true;
    } catch (error) {
      console.error('Push transaction error:', error);
      return false;
    }
  }

  /**
   * Sync recurring transactions between local and cloud
   */
  private async syncRecurringTransactions(userId: string): Promise<SyncResult> {
    console.log('📤 [SyncService] Starting recurring transaction sync...');
    const errors: string[] = [];
    let synced = 0;
    let conflicts = 0;

    try {
      // 1. Push local recurring transactions to cloud
      const localRecurring = await db.recurring.toArray();
      console.log(`📊 [SyncService] Found ${localRecurring.length} local recurring transactions`);
      
      for (const recurring of localRecurring) {
        try {
          console.log(`📤 [SyncService] Syncing recurring ${recurring.id.substring(0, 8)}...`);
          
          const { error: upsertError } = await supabase
            .from('recurring_transactions')
            .upsert({
              id: recurring.id,
              user_id: userId,
              title: recurring.title,
              amount: recurring.amount,
              category: recurring.category,
              type: recurring.type,
              frequency: recurring.frequency,
              start_date: recurring.startDate,
              end_date: recurring.endDate || null,
              last_generated: recurring.lastGenerated || null,
              next_occurrence: recurring.nextOccurrence,
              is_active: recurring.isActive,
              description: recurring.description || null,
              original_currency: recurring.originalCurrency || 'TRY',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`❌ [SyncService] Recurring upsert error:`, upsertError);
            errors.push(`Recurring ${recurring.id}: ${upsertError.message}`);
          } else {
            console.log(`✅ [SyncService] Synced recurring ${recurring.id.substring(0, 8)}`);
            synced++;
          }
        } catch (error: any) {
          console.error(`❌ [SyncService] Recurring exception:`, error);
          errors.push(`Recurring ${recurring.id}: ${error.message}`);
        }
      }

      // 2. Pull cloud recurring transactions to local
      console.log('📥 [SyncService] Fetching cloud recurring transactions...');
      const { data: cloudRecurring, error: fetchError } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('❌ [SyncService] Recurring fetch error:', fetchError);
        errors.push(`Recurring fetch: ${fetchError.message}`);
      } else if (cloudRecurring) {
        console.log(`📊 [SyncService] Found ${cloudRecurring.length} cloud recurring transactions`);
        
        for (const cloudRec of cloudRecurring) {
          try {
            const localRec = await db.recurring.get(cloudRec.id);

            if (!localRec) {
              console.log(`📥 [SyncService] Adding recurring from cloud: ${cloudRec.id.substring(0, 8)}`);
              
              const newRecurring: RecurringTransaction = {
                id: cloudRec.id,
                title: cloudRec.title,
                amount: cloudRec.amount,
                category: cloudRec.category,
                type: cloudRec.type,
                frequency: cloudRec.frequency,
                startDate: cloudRec.start_date,
                endDate: cloudRec.end_date || undefined,
                lastGenerated: cloudRec.last_generated || undefined,
                nextOccurrence: cloudRec.next_occurrence,
                isActive: cloudRec.is_active,
                description: cloudRec.description || undefined,
                originalCurrency: cloudRec.original_currency,
              };
              
              await db.recurring.add(newRecurring);
              console.log(`✅ [SyncService] Added recurring ${cloudRec.id.substring(0, 8)} from cloud`);
              synced++;
            }
          } catch (error: any) {
            if (error.name === 'ConstraintError') {
              console.warn(`⚠️ [SyncService] Duplicate recurring ${cloudRec.id}`);
            } else {
              console.error(`❌ [SyncService] Error adding recurring:`, error);
              errors.push(`Cloud recurring ${cloudRec.id}: ${error.message}`);
            }
          }
        }
      }

      return { success: errors.length === 0, synced, conflicts, errors };
    } catch (error: any) {
      return {
        success: false,
        synced,
        conflicts,
        errors: [error.message],
      };
    }
  }

  /**
   * Push a single recurring transaction to cloud
   */
  async pushRecurringTransaction(recurring: RecurringTransaction): Promise<boolean> {
    console.log('📤 [SyncService] Pushing recurring transaction:', recurring.id);
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ [SyncService] User not authenticated');
      return false;
    }

    try {
      const { error } = await supabase.from('recurring_transactions').upsert({
        id: recurring.id,
        user_id: user.id,
        title: recurring.title,
        amount: recurring.amount,
        category: recurring.category,
        type: recurring.type,
        frequency: recurring.frequency,
        start_date: recurring.startDate,
        end_date: recurring.endDate || null,
        last_generated: recurring.lastGenerated || null,
        next_occurrence: recurring.nextOccurrence,
        is_active: recurring.isActive,
        description: recurring.description || null,
        original_currency: recurring.originalCurrency || 'TRY',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (error) {
        console.error('❌ [SyncService] Push recurring error:', error);
        return false;
      }
      
      console.log('✅ [SyncService] Recurring transaction pushed');
      return true;
    } catch (error) {
      console.error('❌ [SyncService] Push recurring error:', error);
      return false;
    }
  }

  /**
   * Delete recurring transaction from cloud
   */
  async deleteRecurringTransaction(recurringId: string): Promise<boolean> {
    console.log('🗑️ [SyncService] Deleting recurring transaction:', recurringId);
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ [SyncService] Cannot delete - user not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', recurringId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [SyncService] Delete recurring error:', error);
        return false;
      }
      
      console.log('✅ [SyncService] Recurring transaction deleted from cloud');
      return true;
    } catch (error) {
      console.error('❌ [SyncService] Delete recurring error:', error);
      return false;
    }
  }

  /**
   * Delete transaction from cloud (HARD DELETE)
   */
  async deleteTransaction(transactionId: string): Promise<boolean> {
    console.log('🗑️ [SyncService] Hard deleting transaction:', transactionId);
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ [SyncService] Cannot delete - user not authenticated');
      return false;
    }

    try {
      // HARD DELETE - permanently remove from database
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [SyncService] Delete error:', error);
        return false;
      }
      
      console.log('✅ [SyncService] Transaction permanently deleted from cloud');
      return true;
    } catch (error) {
      console.error('❌ [SyncService] Delete transaction error:', error);
      return false;
    }
  }

  /**
   * Check if user is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
