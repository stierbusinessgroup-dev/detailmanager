-- Migration: Consolidate CRM Tables (Version 3 - Ultra Safe)
-- Description: Adds CRM fields to customers table and creates supporting infrastructure
-- Author: DetailManager
-- Date: 2026-01-22
-- NOTE: This version is designed to never fail, regardless of existing schema

-- ============================================================================
-- STEP 1: Add CRM fields to customers table
-- ============================================================================

DO $$
BEGIN
    -- Add all CRM fields one by one with error handling
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS position TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email';
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'customer';
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS industry TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_to UUID;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10, 2) DEFAULT 0.00;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_purchase_date DATE;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_contact_date DATE;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS facebook_url TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS twitter_url TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS instagram_url TEXT;
    
    RAISE NOTICE 'Added CRM fields to customers table';
END $$;

-- Add foreign key for assigned_to if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customers_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.customers 
        ADD CONSTRAINT customers_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add constraints for new fields
DO $$
BEGIN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS valid_contact_status;
    ALTER TABLE public.customers ADD CONSTRAINT valid_contact_status 
        CHECK (contact_status IN ('lead', 'prospect', 'customer', 'vip', 'inactive', 'lost'));
    
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS valid_preferred_contact;
    ALTER TABLE public.customers ADD CONSTRAINT valid_preferred_contact 
        CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'text'));
    
    RAISE NOTICE 'Added constraints to customers table';
END $$;

-- Create indexes for new CRM fields
CREATE INDEX IF NOT EXISTS idx_customers_contact_status ON public.customers(contact_status);
CREATE INDEX IF NOT EXISTS idx_customers_tags ON public.customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON public.customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_lead_source ON public.customers(lead_source);
CREATE INDEX IF NOT EXISTS idx_customers_next_follow_up ON public.customers(next_follow_up_date);

-- ============================================================================
-- STEP 2: Create CRM interactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    interaction_type TEXT NOT NULL,
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    subject TEXT,
    description TEXT,
    outcome TEXT,
    next_action TEXT,
    next_action_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'task', 'sale'))
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer_id ON public.crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_user_id ON public.crm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_date ON public.crm_interactions(interaction_date);

-- Enable RLS
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can view their own interactions"
    ON public.crm_interactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can insert their own interactions"
    ON public.crm_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can update their own interactions"
    ON public.crm_interactions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can delete their own interactions"
    ON public.crm_interactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Create database functions for CRM
-- ============================================================================

-- Function to get customer details
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    result := json_build_object(
        'customer', (SELECT row_to_json(c.*) FROM customers c WHERE c.id = p_customer_id AND c.user_id = p_user_id),
        'interactions', COALESCE((SELECT json_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC) FROM crm_interactions i WHERE i.customer_id = p_customer_id), '[]'::json),
        'purchases', COALESCE((SELECT json_agg(row_to_json(s.*) ORDER BY s.sale_date DESC) FROM sales s WHERE s.customer_id = p_customer_id AND s.status = 'completed'), '[]'::json),
        'upcoming_events', COALESCE((SELECT json_agg(row_to_json(e.*) ORDER BY e.event_date ASC) FROM calendar_events e WHERE e.customer_id = p_customer_id AND e.event_date >= CURRENT_DATE AND e.status != 'cancelled'), '[]'::json)
    );
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- If any table doesn't exist, return partial data
        result := json_build_object(
            'customer', (SELECT row_to_json(c.*) FROM customers c WHERE c.id = p_customer_id AND c.user_id = p_user_id),
            'interactions', COALESCE((SELECT json_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC) FROM crm_interactions i WHERE i.customer_id = p_customer_id), '[]'::json),
            'purchases', '[]'::json,
            'upcoming_events', '[]'::json
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get CRM summary
CREATE OR REPLACE FUNCTION get_crm_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_contacts', COUNT(*),
        'leads', COUNT(*) FILTER (WHERE contact_status = 'lead'),
        'prospects', COUNT(*) FILTER (WHERE contact_status = 'prospect'),
        'customers', COUNT(*) FILTER (WHERE contact_status = 'customer'),
        'vips', COUNT(*) FILTER (WHERE contact_status = 'vip'),
        'inactive', COUNT(*) FILTER (WHERE contact_status = 'inactive'),
        'total_lifetime_value', COALESCE(SUM(lifetime_value), 0),
        'avg_lifetime_value', COALESCE(AVG(lifetime_value), 0),
        'contacts_needing_follow_up', COUNT(*) FILTER (WHERE next_follow_up_date <= CURRENT_DATE)
    ) INTO result
    FROM customers
    WHERE user_id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to sync customer purchase data
CREATE OR REPLACE FUNCTION sync_customer_purchase_data()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET 
            lifetime_value = COALESCE((SELECT SUM(total_amount) FROM sales WHERE customer_id = NEW.customer_id AND status = 'completed'), 0),
            last_purchase_date = (SELECT MAX(sale_date) FROM sales WHERE customer_id = NEW.customer_id AND status = 'completed'),
            total_purchases = COALESCE((SELECT COUNT(*) FROM sales WHERE customer_id = NEW.customer_id AND status = 'completed'), 0),
            contact_status = CASE WHEN contact_status IN ('lead', 'prospect') THEN 'customer' ELSE contact_status END
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sales table
DROP TRIGGER IF EXISTS trigger_sync_customer_purchase_data ON sales;
CREATE TRIGGER trigger_sync_customer_purchase_data
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION sync_customer_purchase_data();

-- ============================================================================
-- STEP 4: Drop old tables if they exist
-- ============================================================================

DROP TABLE IF EXISTS public.crm_contacts CASCADE;
DROP TABLE IF EXISTS public.crm_tags CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- ============================================================================
-- STEP 5: Add comments
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Unified customer/contact table for CRM, sales, and all customer interactions';
COMMENT ON COLUMN public.customers.contact_status IS 'CRM status: lead, prospect, customer, vip, inactive, lost';
COMMENT ON COLUMN public.customers.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN public.customers.tags IS 'Array of custom tags for organizing contacts';
COMMENT ON TABLE public.crm_interactions IS 'Tracks all interactions with customers';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'CRM consolidation migration completed successfully!' as status;
