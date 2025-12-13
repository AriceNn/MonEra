import type { StorageAdapter } from './StorageAdapter';
import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';

/**
 * Storage Migration Utility
 * 
 * Handles migration from localStorage to IndexedDB
 * Features:
 * - Auto-detection of current storage state
 * - Safe migration with backup
 * - Rollback capability
 * - Data integrity verification
 */

export type MigrationStatus = 
  | 'not-started'    // No data in either storage
  | 'localStorage'   // Data only in localStorage
  | 'indexedDB'      // Data only in IndexedDB
  | 'both'           // Data in both (migration backup exists)
  | 'migrating';     // Migration in progress

export interface MigrationResult {
  success: boolean;
  status: MigrationStatus;
  error?: string;
  stats?: {
    transactionsMigrated: number;
    budgetsMigrated: number;
    recurringMigrated: number;
    settingsMigrated: boolean;
  };
}

const MIGRATION_FLAG_KEY = 'monera_migration_status';
const MIGRATION_BACKUP_KEY = 'monera_migration_backup';
const MIGRATION_DATE_KEY = 'monera_migration_date';

/**
 * Check current migration status
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  const flagValue = localStorage.getItem(MIGRATION_FLAG_KEY);
  
  if (flagValue === 'indexedDB') {
    return 'indexedDB';
  }
  
  if (flagValue === 'migrating') {
    return 'migrating';
  }

  const localAdapter = new LocalStorageAdapter();
  const indexedAdapter = new IndexedDBAdapter();

  try {
    const [localStats, indexedStats] = await Promise.all([
      localAdapter.getStats(),
      indexedAdapter.getStats()
    ]);

    const hasLocalData = 
      localStats.transactions > 0 || 
      localStats.budgets > 0 || 
      localStats.recurring > 0 || 
      localStats.hasSettings;

    const hasIndexedData = 
      indexedStats.transactions > 0 || 
      indexedStats.budgets > 0 || 
      indexedStats.recurring > 0 || 
      indexedStats.hasSettings;

    if (hasIndexedData && hasLocalData) {
      return 'both';
    }

    if (hasIndexedData) {
      return 'indexedDB';
    }

    if (hasLocalData) {
      return 'localStorage';
    }

    return 'not-started';
  } catch (error) {
    console.error('[Migration] Error checking status:', error);
    return 'localStorage'; // Fallback to localStorage
  }
}

/**
 * Migrate data from localStorage to IndexedDB
 */
export async function migrate(): Promise<MigrationResult> {
  console.log('[Migration] Starting migration from localStorage to IndexedDB...');

  try {
    // Set migration flag
    localStorage.setItem(MIGRATION_FLAG_KEY, 'migrating');

    const localAdapter = new LocalStorageAdapter();
    const indexedAdapter = new IndexedDBAdapter();

    // Step 1: Export all data from localStorage
    console.log('[Migration] Exporting data from localStorage...');
    const data = await localAdapter.exportAll();

    // Step 2: Create backup in localStorage
    console.log('[Migration] Creating backup...');
    localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(data));
    localStorage.setItem(MIGRATION_DATE_KEY, new Date().toISOString());

    // Step 3: Import data to IndexedDB
    console.log('[Migration] Importing data to IndexedDB...');
    await indexedAdapter.importAll(data);

    // Step 4: Verify data integrity
    console.log('[Migration] Verifying data integrity...');
    const indexedStats = await indexedAdapter.getStats();

    const migrationSuccess = 
      indexedStats.transactions === data.transactions.length &&
      indexedStats.budgets === data.budgets.length &&
      indexedStats.recurring === data.recurring.length &&
      indexedStats.hasSettings;

    if (!migrationSuccess) {
      throw new Error('Data verification failed - counts do not match');
    }

    // Step 5: Mark migration as complete
    localStorage.setItem(MIGRATION_FLAG_KEY, 'indexedDB');

    console.log('[Migration] Migration completed successfully!');
    console.log(`[Migration] Migrated: ${data.transactions.length} transactions, ${data.budgets.length} budgets, ${data.recurring.length} recurring`);

    return {
      success: true,
      status: 'indexedDB',
      stats: {
        transactionsMigrated: data.transactions.length,
        budgetsMigrated: data.budgets.length,
        recurringMigrated: data.recurring.length,
        settingsMigrated: true
      }
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    
    // Reset migration flag on error
    localStorage.setItem(MIGRATION_FLAG_KEY, 'localStorage');

    return {
      success: false,
      status: 'localStorage',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Rollback from IndexedDB to localStorage
 */
export async function rollback(): Promise<MigrationResult> {
  console.log('[Migration] Rolling back from IndexedDB to localStorage...');

  try {
    // Check if backup exists
    const backupData = localStorage.getItem(MIGRATION_BACKUP_KEY);
    if (!backupData) {
      throw new Error('No backup found - cannot rollback');
    }

    // Parse backup
    const data = JSON.parse(backupData) as {
      transactions: Transaction[];
      budgets: CategoryBudget[];
      recurring: RecurringTransaction[];
      settings: AppSettings;
    };

    const localAdapter = new LocalStorageAdapter();
    const indexedAdapter = new IndexedDBAdapter();

    // Step 1: Clear IndexedDB
    console.log('[Migration] Clearing IndexedDB...');
    await indexedAdapter.clearAll();

    // Step 2: Restore data to localStorage
    console.log('[Migration] Restoring data to localStorage...');
    await localAdapter.importAll(data);

    // Step 3: Update migration status
    localStorage.setItem(MIGRATION_FLAG_KEY, 'localStorage');

    console.log('[Migration] Rollback completed successfully!');

    return {
      success: true,
      status: 'localStorage',
      stats: {
        transactionsMigrated: data.transactions.length,
        budgetsMigrated: data.budgets.length,
        recurringMigrated: data.recurring.length,
        settingsMigrated: true
      }
    };
  } catch (error) {
    console.error('[Migration] Rollback failed:', error);

    return {
      success: false,
      status: 'indexedDB',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current storage adapter based on migration status
 */
export async function getCurrentAdapter(): Promise<StorageAdapter> {
  const status = await checkMigrationStatus();

  if (status === 'indexedDB' || status === 'both') {
    console.log('[Storage] Using IndexedDB adapter');
    return new IndexedDBAdapter();
  }

  console.log('[Storage] Using localStorage adapter');
  return new LocalStorageAdapter();
}

/**
 * Auto-migrate if needed (call on app startup)
 */
export async function autoMigrate(): Promise<MigrationResult | null> {
  const status = await checkMigrationStatus();

  if (status === 'localStorage') {
    console.log('[Migration] Auto-migration triggered');
    return await migrate();
  }

  if (status === 'migrating') {
    console.warn('[Migration] Migration was interrupted - retrying');
    return await migrate();
  }

  console.log(`[Migration] No migration needed (current status: ${status})`);
  return null;
}

/**
 * Clean up old backup (call after successful migration + 30 days)
 */
export function cleanupBackup(): void {
  const migrationDate = localStorage.getItem(MIGRATION_DATE_KEY);
  
  if (!migrationDate) {
    return;
  }

  const daysSinceMigration = 
    (Date.now() - new Date(migrationDate).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceMigration >= 30) {
    console.log('[Migration] Cleaning up old backup (30+ days old)');
    localStorage.removeItem(MIGRATION_BACKUP_KEY);
    localStorage.removeItem(MIGRATION_DATE_KEY);
  }
}

/**
 * Get migration info for debug/settings page
 */
export function getMigrationInfo(): {
  status: string;
  migrationDate: string | null;
  hasBackup: boolean;
} {
  const status = localStorage.getItem(MIGRATION_FLAG_KEY) || 'not-started';
  const migrationDate = localStorage.getItem(MIGRATION_DATE_KEY);
  const hasBackup = localStorage.getItem(MIGRATION_BACKUP_KEY) !== null;

  return {
    status,
    migrationDate,
    hasBackup
  };
}
