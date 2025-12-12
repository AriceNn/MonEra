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
 * SyncService - DEPRECATED: Supabase-only mode
 * All data operations now go directly to Supabase. No local caching.
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

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async syncAll(): Promise<SyncResult> {
    console.log('ℹ️ [SyncService] Sync disabled - using Supabase-only mode');
    return { success: true, synced: 0, conflicts: 0, errors: [] };
  }

  async pushTransaction(_transaction: Transaction): Promise<boolean> {
    console.log('ℹ️ [SyncService] pushTransaction deprecated');
    return true;
  }

  async pushRecurringTransaction(_recurring: RecurringTransaction): Promise<boolean> {
    console.log('ℹ️ [SyncService] pushRecurringTransaction deprecated');
    return true;
  }

  async deleteRecurringTransaction(_recurringId: string): Promise<boolean> {
    console.log('ℹ️ [SyncService] deleteRecurringTransaction deprecated');
    return true;
  }

  async deleteTransaction(_transactionId: string): Promise<boolean> {
    console.log('ℹ️ [SyncService] deleteTransaction deprecated');
    return true;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const syncService = SyncService.getInstance();
