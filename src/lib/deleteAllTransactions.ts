import { supabase, getCurrentUser } from './supabase';

/**
 * CAUTION: Deletes ALL transactions for current user
 * Use only for cleanup after duplicate issues
 */
export async function deleteAllUserTransactions(): Promise<{ deleted: number; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { deleted: 0, error: 'User not authenticated' };
    }

    // Get count first
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return { deleted: 0, error: countError.message };
    }

    const totalCount = count || 0;
    console.log(`⚠️ Deleting ${totalCount} transactions for user ${user.email}...`);

    // Delete all transactions
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return { deleted: 0, error: deleteError.message };
    }

    console.log(`✅ Successfully deleted ${totalCount} transactions`);
    return { deleted: totalCount, error: null };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all recurring transactions for current user
 */
export async function deleteAllUserRecurringTransactions(): Promise<{ deleted: number; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { deleted: 0, error: 'User not authenticated' };
    }

    // Get count first
    const { count, error: countError } = await supabase
      .from('recurring_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return { deleted: 0, error: countError.message };
    }

    const totalCount = count || 0;
    console.log(`⚠️ Deleting ${totalCount} recurring transactions for user ${user.email}...`);

    // Delete all recurring transactions
    const { error: deleteError } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return { deleted: 0, error: deleteError.message };
    }

    console.log(`✅ Successfully deleted ${totalCount} recurring transactions`);
    return { deleted: totalCount, error: null };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
