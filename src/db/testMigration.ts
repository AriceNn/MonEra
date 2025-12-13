import { v4 as uuidv4 } from 'uuid';
import type { Transaction, CategoryBudget, RecurringTransaction, AppSettings } from '../types';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { migrate, rollback, checkMigrationStatus } from './migration';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';

/**
 * Test & Benchmark Utility for Storage Migration
 * 
 * Run these tests in browser console:
 * 
 * import { generateMockData, testMigration, benchmarkPerformance, testRollback } from './db/testMigration';
 * 
 * // Generate test data
 * await generateMockData(1000);
 * 
 * // Test migration
 * await testMigration();
 * 
 * // Benchmark performance
 * await benchmarkPerformance();
 * 
 * // Test rollback
 * await testRollback();
 */

const MOCK_TITLES = [
  'Grocery Shopping', 'Monthly Salary', 'Rent Payment', 'Electricity Bill',
  'Internet Bill', 'Restaurant', 'Coffee', 'Gas Station', 'Pharmacy',
  'Clothing Store', 'Electronics', 'Books', 'Entertainment', 'Transportation',
  'Health Insurance', 'Freelance Project', 'Investment Return', 'Gift Received'
];

/**
 * Generate mock transactions
 */
function generateMockTransactions(count: number): Transaction[] {
  const transactions: Transaction[] = [];
  const startDate = new Date('2023-01-01');
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    const randomDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );

    const type = Math.random() > 0.7 ? 'income' : 'expense';
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    transactions.push({
      id: uuidv4(),
      title: MOCK_TITLES[Math.floor(Math.random() * MOCK_TITLES.length)],
      amount: Math.floor(Math.random() * 5000) + 50,
      category,
      date: randomDate.toISOString().split('T')[0],
      type,
      description: `Test transaction #${i + 1}`,
      originalCurrency: 'TRY'
    });
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Generate mock budgets
 */
function generateMockBudgets(): CategoryBudget[] {
  return EXPENSE_CATEGORIES.map(category => ({
    id: uuidv4(),
    category,
    monthlyLimit: Math.floor(Math.random() * 10000) + 1000,
    alertThreshold: 80,
    isActive: Math.random() > 0.3,
    currency: 'TRY'
  }));
}

/**
 * Generate mock recurring transactions
 */
function generateMockRecurring(): RecurringTransaction[] {
  const recurring: RecurringTransaction[] = [];
  const frequencies: ('monthly' | 'weekly' | 'yearly')[] = ['monthly', 'weekly', 'yearly'];

  for (let i = 0; i < 10; i++) {
    const type = Math.random() > 0.5 ? 'income' : 'expense';
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    recurring.push({
      id: uuidv4(),
      title: `Recurring ${i + 1}`,
      amount: Math.floor(Math.random() * 3000) + 100,
      category: categories[Math.floor(Math.random() * categories.length)],
      type,
      frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      startDate: new Date('2024-01-01').toISOString().split('T')[0],
      isActive: Math.random() > 0.2,
      originalCurrency: 'TRY'
    });
  }

  return recurring;
}

/**
 * Generate and save mock data to localStorage
 */
export async function generateMockData(transactionCount: number = 1000): Promise<void> {
  console.log(`[Test] Generating ${transactionCount} mock transactions...`);
  
  const adapter = new LocalStorageAdapter();
  
  const transactions = generateMockTransactions(transactionCount);
  const budgets = generateMockBudgets();
  const recurring = generateMockRecurring();
  
  const settings: AppSettings = {
    currency: 'TRY',
    currencyPair: 'TRY-USD',
    language: 'tr',
    theme: 'light',
    inflationRate: 30
  };

  await adapter.importAll({
    transactions,
    budgets,
    recurring,
    settings
  });

  // Clear migration flag to simulate fresh state
  localStorage.removeItem('monera_migration_status');

  console.log(`[Test] Generated ${transactions.length} transactions, ${budgets.length} budgets, ${recurring.length} recurring`);
  console.log('[Test] Mock data saved to localStorage');
}

/**
 * Test migration from localStorage to IndexedDB
 */
export async function testMigration(): Promise<void> {
  console.log('[Test] ===== MIGRATION TEST =====');
  
  // Check initial status
  const initialStatus = await checkMigrationStatus();
  console.log(`[Test] Initial status: ${initialStatus}`);

  if (initialStatus === 'indexedDB') {
    console.log('[Test] Already migrated. Run testRollback() first to reset.');
    return;
  }

  // Get data counts before migration
  const localAdapter = new LocalStorageAdapter();
  const beforeStats = await localAdapter.getStats();
  console.log('[Test] Data before migration:', beforeStats);

  // Perform migration
  console.time('[Test] Migration duration');
  const result = await migrate();
  console.timeEnd('[Test] Migration duration');

  if (!result.success) {
    console.error('[Test] ❌ Migration failed:', result.error);
    return;
  }

  console.log('[Test] ✅ Migration succeeded');
  console.log('[Test] Migration stats:', result.stats);

  // Verify data in IndexedDB
  const indexedAdapter = new IndexedDBAdapter();
  const afterStats = await indexedAdapter.getStats();
  console.log('[Test] Data after migration:', afterStats);

  // Data integrity check
  const integrityPassed = 
    beforeStats.transactions === afterStats.transactions &&
    beforeStats.budgets === afterStats.budgets &&
    beforeStats.recurring === afterStats.recurring;

  if (integrityPassed) {
    console.log('[Test] ✅ Data integrity verified');
  } else {
    console.error('[Test] ❌ Data integrity check failed');
  }

  // Check final status
  const finalStatus = await checkMigrationStatus();
  console.log(`[Test] Final status: ${finalStatus}`);
}

/**
 * Benchmark query performance: localStorage vs IndexedDB
 */
export async function benchmarkPerformance(): Promise<void> {
  console.log('[Test] ===== PERFORMANCE BENCHMARK =====');

  const status = await checkMigrationStatus();
  if (status !== 'both' && status !== 'indexedDB') {
    console.error('[Test] Need migrated data for benchmark. Run testMigration() first.');
    return;
  }

  const localAdapter = new LocalStorageAdapter();
  const indexedAdapter = new IndexedDBAdapter();

  const testDate = new Date();
  const startOfMonth = new Date(testDate.getFullYear(), testDate.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(testDate.getFullYear(), testDate.getMonth() + 1, 0).toISOString().split('T')[0];

  // Test 1: Get all transactions
  console.log('\n[Test] Test 1: getAllTransactions()');
  
  console.time('[LocalStorage] getAllTransactions');
  const localAll = await localAdapter.getAllTransactions();
  console.timeEnd('[LocalStorage] getAllTransactions');
  
  console.time('[IndexedDB] getAllTransactions');
  const indexedAll = await indexedAdapter.getAllTransactions();
  console.timeEnd('[IndexedDB] getAllTransactions');
  
  console.log(`Result: ${localAll.length} vs ${indexedAll.length} transactions`);

  // Test 2: Get transactions by date range
  console.log('\n[Test] Test 2: getTransactionsByDateRange()');
  
  console.time('[LocalStorage] getByDateRange');
  const localRange = await localAdapter.getTransactionsByDateRange(startOfMonth, endOfMonth);
  console.timeEnd('[LocalStorage] getByDateRange');
  
  console.time('[IndexedDB] getByDateRange');
  const indexedRange = await indexedAdapter.getTransactionsByDateRange(startOfMonth, endOfMonth);
  console.timeEnd('[IndexedDB] getByDateRange');
  
  console.log(`Result: ${localRange.length} vs ${indexedRange.length} transactions`);

  // Test 3: Get transactions by category
  console.log('\n[Test] Test 3: getTransactionsByCategory()');
  const testCategory = EXPENSE_CATEGORIES[0];
  
  console.time('[LocalStorage] getByCategory');
  const localCategory = await localAdapter.getTransactionsByCategory(testCategory);
  console.timeEnd('[LocalStorage] getByCategory');
  
  console.time('[IndexedDB] getByCategory');
  const indexedCategory = await indexedAdapter.getTransactionsByCategory(testCategory);
  console.timeEnd('[IndexedDB] getByCategory');
  
  console.log(`Result: ${localCategory.length} vs ${indexedCategory.length} transactions for ${testCategory}`);

  // Test 4: Get transactions by type
  console.log('\n[Test] Test 4: getTransactionsByType()');
  
  console.time('[LocalStorage] getByType');
  const localType = await localAdapter.getTransactionsByType('expense');
  console.timeEnd('[LocalStorage] getByType');
  
  console.time('[IndexedDB] getByType');
  const indexedType = await indexedAdapter.getTransactionsByType('expense');
  console.timeEnd('[IndexedDB] getByType');
  
  console.log(`Result: ${localType.length} vs ${indexedType.length} expense transactions`);

  // Test 5: Get active budgets
  console.log('\n[Test] Test 5: getActiveBudgets()');
  
  console.time('[LocalStorage] getActiveBudgets');
  const localBudgets = await localAdapter.getActiveBudgets();
  console.timeEnd('[LocalStorage] getActiveBudgets');
  
  console.time('[IndexedDB] getActiveBudgets');
  const indexedBudgets = await indexedAdapter.getActiveBudgets();
  console.timeEnd('[IndexedDB] getActiveBudgets');
  
  console.log(`Result: ${localBudgets.length} vs ${indexedBudgets.length} active budgets`);

  console.log('\n[Test] ✅ Benchmark completed');
}

/**
 * Test rollback functionality
 */
export async function testRollback(): Promise<void> {
  console.log('[Test] ===== ROLLBACK TEST =====');

  const status = await checkMigrationStatus();
  console.log(`[Test] Current status: ${status}`);

  if (status !== 'indexedDB' && status !== 'both') {
    console.error('[Test] Cannot rollback - not in IndexedDB mode');
    return;
  }

  // Get data counts before rollback
  const indexedAdapter = new IndexedDBAdapter();
  const beforeStats = await indexedAdapter.getStats();
  console.log('[Test] Data before rollback:', beforeStats);

  // Perform rollback
  console.time('[Test] Rollback duration');
  const result = await rollback();
  console.timeEnd('[Test] Rollback duration');

  if (!result.success) {
    console.error('[Test] ❌ Rollback failed:', result.error);
    return;
  }

  console.log('[Test] ✅ Rollback succeeded');
  console.log('[Test] Rollback stats:', result.stats);

  // Verify data in localStorage
  const localAdapter = new LocalStorageAdapter();
  const afterStats = await localAdapter.getStats();
  console.log('[Test] Data after rollback:', afterStats);

  // Data integrity check
  const integrityPassed = 
    beforeStats.transactions === afterStats.transactions &&
    beforeStats.budgets === afterStats.budgets &&
    beforeStats.recurring === afterStats.recurring;

  if (integrityPassed) {
    console.log('[Test] ✅ Data integrity verified');
  } else {
    console.error('[Test] ❌ Data integrity check failed');
  }

  // Check final status
  const finalStatus = await checkMigrationStatus();
  console.log(`[Test] Final status: ${finalStatus}`);
}

/**
 * Run all tests in sequence
 */
export async function runAllTests(): Promise<void> {
  console.log('[Test] ========================================');
  console.log('[Test] RUNNING COMPLETE TEST SUITE');
  console.log('[Test] ========================================\n');

  try {
    // Step 1: Generate mock data
    console.log('[Test] Step 1: Generating mock data...');
    await generateMockData(1000);
    console.log('[Test] ✅ Mock data generated\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Test migration
    console.log('[Test] Step 2: Testing migration...');
    await testMigration();
    console.log('[Test] ✅ Migration test completed\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Benchmark performance
    console.log('[Test] Step 3: Benchmarking performance...');
    await benchmarkPerformance();
    console.log('[Test] ✅ Benchmark completed\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Test rollback
    console.log('[Test] Step 4: Testing rollback...');
    await testRollback();
    console.log('[Test] ✅ Rollback test completed\n');

    console.log('[Test] ========================================');
    console.log('[Test] ✅ ALL TESTS PASSED');
    console.log('[Test] ========================================');
  } catch (error) {
    console.error('[Test] ❌ Test suite failed:', error);
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).testMigration = {
    generateMockData,
    testMigration,
    benchmarkPerformance,
    testRollback,
    runAllTests
  };
  console.log('[Test] Migration test utilities loaded. Available commands:');
  console.log('  - testMigration.generateMockData(1000)');
  console.log('  - testMigration.testMigration()');
  console.log('  - testMigration.benchmarkPerformance()');
  console.log('  - testMigration.testRollback()');
  console.log('  - testMigration.runAllTests()');
}
