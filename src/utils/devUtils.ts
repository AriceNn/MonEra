/**
 * Development utilities exposed to browser console
 * Use in browser console: window.devUtils.deleteAllUserTransactions()
 */

import { deleteAllUserTransactions, deleteAllUserRecurringTransactions } from '../lib/deleteAllTransactions';
import { runCleanup } from '../lib/cleanupDuplicates';

const devUtils = {
  async deleteAllTransactions() {
    console.warn('⚠️ Deleting all user transactions...');
    const result = await deleteAllUserTransactions();
    console.log('Result:', result);
    if (result.error) {
      console.error('Error:', result.error);
    } else {
      console.log(`✅ Deleted ${result.deleted} transactions`);
      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1000);
    }
    return result;
  },

  async deleteAllRecurring() {
    console.warn('⚠️ Deleting all recurring transactions...');
    const result = await deleteAllUserRecurringTransactions();
    console.log('Result:', result);
    if (result.error) {
      console.error('Error:', result.error);
    } else {
      console.log(`✅ Deleted ${result.deleted} recurring transactions`);
      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1000);
    }
    return result;
  },

  async cleanup() {
    console.log('🧹 Running cleanup...');
    const result = await runCleanup();
    console.log('Result:', result);
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    } else {
      console.log(`✅ Cleaned up ${result.transactions} transactions and ${result.budgets} budgets`);
      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1000);
    }
    return result;
  },

  info() {
    console.log(`
🛠️  Development Utilities Available:
- window.devUtils.deleteAllTransactions() - Delete ALL transactions
- window.devUtils.deleteAllRecurring() - Delete ALL recurring transactions
- window.devUtils.cleanup() - Run cleanup (remove duplicates)
    `);
  }
};

// Expose to window
declare global {
  interface Window {
    devUtils: typeof devUtils;
  }
}

window.devUtils = devUtils;

console.log('💡 Dev utilities available. Type: window.devUtils.info()');
