-- ============================================
-- RECURRING TRANSACTIONS TABLE
-- ============================================
-- Purpose: Store recurring transaction templates for cross-device sync
-- Features: User isolation, soft delete support, automatic timestamps

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'savings', 'withdrawal')),
    description TEXT,
    original_currency VARCHAR(3) NOT NULL DEFAULT 'TRY' CHECK (original_currency IN ('TRY', 'USD', 'EUR', 'GBP')),
    
    -- Recurrence settings
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    last_generated DATE, -- Last time a transaction was auto-generated from this template
    next_occurrence DATE NOT NULL, -- Next scheduled date for this recurring transaction
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT recurring_transactions_user_id_idx CHECK (user_id IS NOT NULL),
    CONSTRAINT recurring_transactions_dates_check CHECK (
        (end_date IS NULL) OR (end_date >= start_date)
    )
);

-- ============================================
-- INDEXES
-- ============================================

-- User-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_recurring_user_id 
    ON public.recurring_transactions(user_id);

-- Active recurring transactions
CREATE INDEX IF NOT EXISTS idx_recurring_active 
    ON public.recurring_transactions(user_id, is_active) 
    WHERE is_active = true;

-- Upcoming scheduled transactions
CREATE INDEX IF NOT EXISTS idx_recurring_next_occurrence 
    ON public.recurring_transactions(next_occurrence) 
    WHERE is_active = true;

-- User's active recurring by frequency
CREATE INDEX IF NOT EXISTS idx_recurring_frequency 
    ON public.recurring_transactions(user_id, frequency, is_active);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recurring transactions
CREATE POLICY "Users can view own recurring transactions"
    ON public.recurring_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own recurring transactions
CREATE POLICY "Users can insert own recurring transactions"
    ON public.recurring_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recurring transactions
CREATE POLICY "Users can update own recurring transactions"
    ON public.recurring_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recurring transactions
CREATE POLICY "Users can delete own recurring transactions"
    ON public.recurring_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_transactions_updated_at
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.recurring_transactions IS 
    'Stores recurring transaction templates for automatic transaction generation';

COMMENT ON COLUMN public.recurring_transactions.last_generated IS 
    'Last date when a transaction was generated from this template';

COMMENT ON COLUMN public.recurring_transactions.next_occurrence IS 
    'Next scheduled date for transaction generation';

COMMENT ON COLUMN public.recurring_transactions.frequency IS 
    'How often the transaction repeats: daily, weekly, biweekly, monthly, quarterly, yearly';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant authenticated users access to the table
GRANT ALL ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;
