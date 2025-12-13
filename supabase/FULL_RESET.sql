-- ============================================
-- FULL SUPABASE RESET - FinTrack
-- ============================================
-- UYARI: Bu script TÜM verileri siler ve baştan kurar!
-- Production'da KULLANMAYIN!
-- 
-- Kullanım:
-- 1. Supabase Dashboard > SQL Editor
-- 2. Bu dosyanın tamamını kopyala-yapıştır
-- 3. RUN tıkla
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING TABLES
-- ============================================
DROP TABLE IF EXISTS public.recurring_transactions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;

-- ============================================
-- STEP 2: CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'savings', 'withdrawal')),
    date DATE NOT NULL,
    description TEXT,
    
    -- Recurring transaction link
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_id UUID, -- Links to recurring_transactions.id (optional)
    
    -- Currency support
    original_currency VARCHAR(3) NOT NULL DEFAULT 'TRY' CHECK (original_currency IN ('TRY', 'USD', 'EUR', 'GBP')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT transactions_user_id_not_null CHECK (user_id IS NOT NULL)
);

-- ============================================
-- STEP 3: CREATE RECURRING TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.recurring_transactions (
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
    last_generated DATE, -- Last time a transaction was auto-generated
    next_occurrence DATE NOT NULL DEFAULT CURRENT_DATE, -- Next scheduled date
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT recurring_transactions_user_id_not_null CHECK (user_id IS NOT NULL),
    CONSTRAINT recurring_transactions_dates_check CHECK (
        (end_date IS NULL) OR (end_date >= start_date)
    )
);

-- ============================================
-- STEP 4: CREATE BUDGETS TABLE
-- ============================================
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Budget details
    category VARCHAR(100) NOT NULL,
    monthly_limit DECIMAL(15, 2) NOT NULL CHECK (monthly_limit > 0),
    alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP')),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budgets_user_id_not_null CHECK (user_id IS NOT NULL),
    CONSTRAINT budgets_unique_user_category UNIQUE (user_id, category)
);

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_recurring_id ON public.transactions(recurring_id) WHERE recurring_id IS NOT NULL;
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX idx_transactions_user_type ON public.transactions(user_id, type);

-- Recurring transactions indexes
CREATE INDEX idx_recurring_user_id ON public.recurring_transactions(user_id);
CREATE INDEX idx_recurring_active ON public.recurring_transactions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_next_occurrence ON public.recurring_transactions(next_occurrence) WHERE is_active = true;
CREATE INDEX idx_recurring_frequency ON public.recurring_transactions(user_id, frequency, is_active);

-- Budgets indexes
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_active ON public.budgets(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_budgets_category ON public.budgets(category);

-- ============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: CREATE RLS POLICIES - TRANSACTIONS
-- ============================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
    ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions"
    ON public.transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
    ON public.transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: CREATE RLS POLICIES - RECURRING TRANSACTIONS
-- ============================================

-- Users can view their own recurring transactions
CREATE POLICY "Users can view own recurring transactions"
    ON public.recurring_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own recurring transactions
CREATE POLICY "Users can insert own recurring transactions"
    ON public.recurring_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own recurring transactions
CREATE POLICY "Users can update own recurring transactions"
    ON public.recurring_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recurring transactions
CREATE POLICY "Users can delete own recurring transactions"
    ON public.recurring_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 9: CREATE RLS POLICIES - BUDGETS
-- ============================================

-- Users can view their own budgets
CREATE POLICY "Users can view own budgets"
    ON public.budgets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own budgets
CREATE POLICY "Users can insert own budgets"
    ON public.budgets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own budgets
CREATE POLICY "Users can update own budgets"
    ON public.budgets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own budgets
CREATE POLICY "Users can delete own budgets"
    ON public.budgets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 10: CREATE TRIGGERS
-- ============================================

-- Auto-update updated_at for transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

-- Auto-update updated_at for recurring_transactions
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

-- Auto-update updated_at for budgets
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();

-- ============================================
-- STEP 11: ADD COMMENTS
-- ============================================

COMMENT ON TABLE public.transactions IS 
    'Stores all user transactions (income, expense, savings, withdrawal)';

COMMENT ON TABLE public.recurring_transactions IS 
    'Stores recurring transaction templates for automatic transaction generation';

COMMENT ON TABLE public.budgets IS 
    'Stores user-defined monthly budget limits per category';

COMMENT ON COLUMN public.recurring_transactions.last_generated IS 
    'Last date when a transaction was generated from this template';

COMMENT ON COLUMN public.recurring_transactions.next_occurrence IS 
    'Next scheduled date for transaction generation';

-- ============================================
-- STEP 12: GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

GRANT ALL ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;

GRANT ALL ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables exist
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('transactions', 'recurring_transactions', 'budgets')
ORDER BY tablename;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('transactions', 'recurring_transactions', 'budgets')
ORDER BY tablename, indexname;

-- Check columns in recurring_transactions
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'recurring_transactions'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ FinTrack database setup complete!';
    RAISE NOTICE '✅ Tables created: transactions, recurring_transactions, budgets';
    RAISE NOTICE '✅ RLS policies applied';
    RAISE NOTICE '✅ Indexes created';
    RAISE NOTICE '✅ Triggers configured';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '1. Check verification queries above';
    RAISE NOTICE '2. Clear local IndexedDB: indexedDB.deleteDatabase("MonEraDB")';
    RAISE NOTICE '3. Reload app and test sync';
END $$;
