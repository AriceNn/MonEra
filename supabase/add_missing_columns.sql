-- ============================================
-- ADD MISSING COLUMNS TO recurring_transactions
-- ============================================
-- Quick fix: Add last_generated and next_occurrence if they don't exist

-- Add last_generated column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_transactions' 
        AND column_name = 'last_generated'
    ) THEN
        ALTER TABLE public.recurring_transactions 
        ADD COLUMN last_generated DATE;
        
        RAISE NOTICE 'Added last_generated column';
    END IF;
END $$;

-- Add next_occurrence column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_transactions' 
        AND column_name = 'next_occurrence'
    ) THEN
        ALTER TABLE public.recurring_transactions 
        ADD COLUMN next_occurrence DATE NOT NULL DEFAULT CURRENT_DATE;
        
        RAISE NOTICE 'Added next_occurrence column';
    END IF;
END $$;

-- Add frequency column with proper constraints (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_transactions' 
        AND column_name = 'frequency'
    ) THEN
        ALTER TABLE public.recurring_transactions 
        ADD COLUMN frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' 
        CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));
        
        RAISE NOTICE 'Added frequency column';
    ELSE
        -- Update constraint if column exists
        ALTER TABLE public.recurring_transactions 
        DROP CONSTRAINT IF EXISTS recurring_transactions_frequency_check;
        
        ALTER TABLE public.recurring_transactions 
        ADD CONSTRAINT recurring_transactions_frequency_check 
        CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));
        
        RAISE NOTICE 'Updated frequency constraint';
    END IF;
END $$;

-- Add start_date column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_transactions' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.recurring_transactions 
        ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
        
        RAISE NOTICE 'Added start_date column';
    END IF;
END $$;

-- Add end_date column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_transactions' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE public.recurring_transactions 
        ADD COLUMN end_date DATE;
        
        RAISE NOTICE 'Added end_date column';
    END IF;
END $$;

-- Verify columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'recurring_transactions'
ORDER BY ordinal_position;
