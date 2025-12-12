import { supabase, getCurrentUser } from './supabase';

/**
 * Removes duplicate recurring transactions from the database.
 * Keeps only the first instance of each (recurring_id, date) pair.
 */
export async function cleanupDuplicateTransactions(): Promise<{ deleted: number; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { deleted: 0, error: 'User not authenticated' };
    }

    // Get all recurring transactions for this user
    const { data: allTxs, error: fetchError } = await supabase
      .from('transactions')
      .select('id, recurring_id, date')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) {
      return { deleted: 0, error: fetchError.message };
    }

    if (!allTxs || allTxs.length === 0) {
      return { deleted: 0, error: null };
    }

    // Find duplicates: keep first, mark rest for deletion
    const seen = new Map<string, string>(); // (recurring_id + date) -> id to keep
    const toDelete: string[] = [];

    for (const tx of allTxs) {
      const key = `${tx.recurring_id}:${tx.date}`;
      
      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        toDelete.push(tx.id);
      } else {
        // First occurrence - keep it
        seen.set(key, tx.id);
      }
    }

    if (toDelete.length === 0) {
      return { deleted: 0, error: null };
    }

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .in('id', toDelete);

    if (deleteError) {
      return { deleted: 0, error: deleteError.message };
    }

    console.log(`✅ Cleaned up ${toDelete.length} duplicate transactions`);
    return { deleted: toDelete.length, error: null };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Removes duplicate budget entries from the database.
 * Keeps only the first instance of each (user_id, category) pair.
 */
export async function cleanupDuplicateBudgets(): Promise<{ deleted: number; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { deleted: 0, error: 'User not authenticated' };
    }

    // Get all budgets for this user
    const { data: allBudgets, error: fetchError } = await supabase
      .from('budgets')
      .select('id, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      return { deleted: 0, error: fetchError.message };
    }

    if (!allBudgets || allBudgets.length === 0) {
      return { deleted: 0, error: null };
    }

    // Find duplicates: keep first, mark rest for deletion
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const budget of allBudgets) {
      if (seen.has(budget.category)) {
        // This is a duplicate - mark for deletion
        toDelete.push(budget.id);
      } else {
        // First occurrence - keep it
        seen.add(budget.category);
      }
    }

    if (toDelete.length === 0) {
      return { deleted: 0, error: null };
    }

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('budgets')
      .delete()
      .in('id', toDelete);

    if (deleteError) {
      return { deleted: 0, error: deleteError.message };
    }

    console.log(`✅ Cleaned up ${toDelete.length} duplicate budgets`);
    return { deleted: toDelete.length, error: null };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all cleanup operations
 */
export async function runCleanup(): Promise<{
  transactions: number;
  budgets: number;
  errors: string[];
}> {
  const errors: string[] = [];

  const txResult = await cleanupDuplicateTransactions();
  if (txResult.error) {
    errors.push(`Transactions: ${txResult.error}`);
  }

  const budgetResult = await cleanupDuplicateBudgets();
  if (budgetResult.error) {
    errors.push(`Budgets: ${budgetResult.error}`);
  }

  console.log('🧹 Cleanup complete:', {
    transactions: txResult.deleted,
    budgets: budgetResult.deleted,
    errors,
  });

  return {
    transactions: txResult.deleted,
    budgets: budgetResult.deleted,
    errors,
  };
}
