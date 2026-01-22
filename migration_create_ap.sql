-- Migration: Create Accounts Payable (AP) Module
-- Description: Creates tables and functions for managing vendor bills and payments

-- ============================================================================
-- VENDORS TABLE - Update existing table with new columns
-- ============================================================================
-- Add new columns to existing vendors table if they don't exist
DO $$ 
BEGIN
    -- Add vendor_name if it doesn't exist (rename from name if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='vendor_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='name') THEN
            ALTER TABLE vendors RENAME COLUMN name TO vendor_name;
        ELSE
            ALTER TABLE vendors ADD COLUMN vendor_name VARCHAR(255);
        END IF;
    END IF;

    -- Add contact_person if it doesn't exist (rename from contact_name if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='contact_person') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='contact_name') THEN
            ALTER TABLE vendors RENAME COLUMN contact_name TO contact_person;
        ELSE
            ALTER TABLE vendors ADD COLUMN contact_person VARCHAR(255);
        END IF;
    END IF;

    -- Add city if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='city') THEN
        ALTER TABLE vendors ADD COLUMN city VARCHAR(100);
    END IF;

    -- Add state if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='state') THEN
        ALTER TABLE vendors ADD COLUMN state VARCHAR(50);
    END IF;

    -- Add zip if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='zip') THEN
        ALTER TABLE vendors ADD COLUMN zip VARCHAR(20);
    END IF;

    -- Add country if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='country') THEN
        ALTER TABLE vendors ADD COLUMN country VARCHAR(100) DEFAULT 'USA';
    END IF;

    -- Add tax_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='tax_id') THEN
        ALTER TABLE vendors ADD COLUMN tax_id VARCHAR(50);
    END IF;

    -- Add payment_terms_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_terms_type') THEN
        ALTER TABLE vendors ADD COLUMN payment_terms_type VARCHAR(50) DEFAULT 'net_days';
    END IF;

    -- Add payment_net_days if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_net_days') THEN
        ALTER TABLE vendors ADD COLUMN payment_net_days INTEGER DEFAULT 30;
    END IF;

    -- Add payment_discount_percent if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_discount_percent') THEN
        ALTER TABLE vendors ADD COLUMN payment_discount_percent DECIMAL(5,2);
    END IF;

    -- Add payment_discount_days if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_discount_days') THEN
        ALTER TABLE vendors ADD COLUMN payment_discount_days INTEGER;
    END IF;

    -- Add payment_specific_dates if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_specific_dates') THEN
        ALTER TABLE vendors ADD COLUMN payment_specific_dates TEXT;
    END IF;

    -- Add payment_terms_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='payment_terms_notes') THEN
        ALTER TABLE vendors ADD COLUMN payment_terms_notes TEXT;
    END IF;

    -- Add account_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='account_number') THEN
        ALTER TABLE vendors ADD COLUMN account_number VARCHAR(100);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);

-- ============================================================================
-- AP LEDGER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ap_ledger (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_remaining DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    description TEXT,
    category VARCHAR(100),
    invoice_file_url TEXT,
    invoice_file_name VARCHAR(255),
    payment_terms TEXT,
    is_overdue BOOLEAN DEFAULT false,
    days_overdue INTEGER DEFAULT 0,
    aging_bucket VARCHAR(20) DEFAULT 'current',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ap_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ap_ledger_user_id ON ap_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ap_ledger_vendor_id ON ap_ledger(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_ledger_status ON ap_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ap_ledger_due_date ON ap_ledger(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_ledger_is_overdue ON ap_ledger(is_overdue);

-- ============================================================================
-- AP PAYMENT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ap_payment_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    ap_ledger_id INTEGER NOT NULL REFERENCES ap_ledger(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ap_payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ap_payment_history_user_id ON ap_payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_history_ap_ledger_id ON ap_payment_history(ap_ledger_id);

-- ============================================================================
-- FUNCTION: Create AP Entry
-- ============================================================================
CREATE OR REPLACE FUNCTION create_ap_entry(
    p_user_id UUID,
    p_vendor_id UUID,
    p_invoice_number VARCHAR(100),
    p_invoice_date DATE,
    p_due_date DATE,
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT NULL,
    p_invoice_file_url TEXT DEFAULT NULL,
    p_invoice_file_name VARCHAR(255) DEFAULT NULL,
    p_payment_terms TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_ap_id INTEGER;
BEGIN
    INSERT INTO ap_ledger (
        user_id,
        vendor_id,
        invoice_number,
        invoice_date,
        due_date,
        amount,
        amount_paid,
        amount_remaining,
        status,
        description,
        category,
        invoice_file_url,
        invoice_file_name,
        payment_terms,
        notes
    ) VALUES (
        p_user_id,
        p_vendor_id,
        p_invoice_number,
        p_invoice_date,
        p_due_date,
        p_amount,
        0,
        p_amount,
        'open',
        p_description,
        p_category,
        p_invoice_file_url,
        p_invoice_file_name,
        p_payment_terms,
        p_notes
    ) RETURNING id INTO v_ap_id;
    
    RETURN v_ap_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Record AP Payment
-- ============================================================================
CREATE OR REPLACE FUNCTION record_ap_payment(
    p_user_id UUID,
    p_ap_ledger_id INTEGER,
    p_payment_date DATE,
    p_amount_paid DECIMAL(10,2),
    p_payment_method VARCHAR(50) DEFAULT NULL,
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_paid DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_new_paid DECIMAL(10,2);
    v_new_remaining DECIMAL(10,2);
    v_new_status VARCHAR(50);
BEGIN
    -- Get current payment info
    SELECT amount_paid, amount INTO v_current_paid, v_total_amount
    FROM ap_ledger
    WHERE id = p_ap_ledger_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AP ledger entry not found';
    END IF;
    
    -- Calculate new amounts
    v_new_paid := v_current_paid + p_amount_paid;
    v_new_remaining := v_total_amount - v_new_paid;
    
    -- Determine new status
    IF v_new_remaining <= 0 THEN
        v_new_status := 'paid';
        v_new_remaining := 0;
    ELSIF v_new_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'open';
    END IF;
    
    -- Update AP ledger
    UPDATE ap_ledger
    SET amount_paid = v_new_paid,
        amount_remaining = v_new_remaining,
        status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_ap_ledger_id;
    
    -- Record payment history
    INSERT INTO ap_payment_history (
        user_id,
        ap_ledger_id,
        payment_date,
        amount_paid,
        payment_method,
        reference_number,
        notes
    ) VALUES (
        p_user_id,
        p_ap_ledger_id,
        p_payment_date,
        p_amount_paid,
        p_payment_method,
        p_reference_number,
        p_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get AP Aging Summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_ap_aging_summary(p_user_id UUID)
RETURNS TABLE(
    total_outstanding DECIMAL(10,2),
    current_amount DECIMAL(10,2),
    days_31_60 DECIMAL(10,2),
    days_61_90 DECIMAL(10,2),
    over_90_days DECIMAL(10,2),
    total_overdue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(amount_remaining), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN aging_bucket = 'current' THEN amount_remaining ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN aging_bucket = '31-60' THEN amount_remaining ELSE 0 END), 0) as days_31_60,
        COALESCE(SUM(CASE WHEN aging_bucket = '61-90' THEN amount_remaining ELSE 0 END), 0) as days_61_90,
        COALESCE(SUM(CASE WHEN aging_bucket = 'over_90' THEN amount_remaining ELSE 0 END), 0) as over_90_days,
        COALESCE(SUM(CASE WHEN is_overdue = true THEN amount_remaining ELSE 0 END), 0) as total_overdue
    FROM ap_ledger
    WHERE user_id = p_user_id AND status != 'paid';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update AP Overdue Status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ap_overdue_status(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ap_ledger
    SET 
        is_overdue = CASE 
            WHEN due_date < CURRENT_DATE AND status != 'paid' THEN true 
            ELSE false 
        END,
        days_overdue = CASE 
            WHEN due_date < CURRENT_DATE AND status != 'paid' 
            THEN EXTRACT(DAY FROM CURRENT_DATE - due_date)::INTEGER
            ELSE 0 
        END,
        aging_bucket = CASE
            WHEN due_date >= CURRENT_DATE OR status = 'paid' THEN 'current'
            WHEN EXTRACT(DAY FROM CURRENT_DATE - due_date) BETWEEN 1 AND 30 THEN 'current'
            WHEN EXTRACT(DAY FROM CURRENT_DATE - due_date) BETWEEN 31 AND 60 THEN '31-60'
            WHEN EXTRACT(DAY FROM CURRENT_DATE - due_date) BETWEEN 61 AND 90 THEN '61-90'
            ELSE 'over_90'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Update vendors updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_vendors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_vendors_timestamp ON vendors;
CREATE TRIGGER trigger_update_vendors_timestamp
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendors_timestamp();

-- ============================================================================
-- TRIGGER: Update ap_ledger updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ap_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_ap_ledger_timestamp ON ap_ledger;
CREATE TRIGGER trigger_update_ap_ledger_timestamp
BEFORE UPDATE ON ap_ledger
FOR EACH ROW
EXECUTE FUNCTION update_ap_ledger_timestamp();
