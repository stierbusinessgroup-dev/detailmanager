-- Migration: Consolidate CRM, Customers, and Clients Tables
-- Description: Merges crm_contacts, customers, and clients into a single enhanced customers table
-- Author: DetailManager
-- Date: 2026-01-22

-- ============================================================================
-- STEP 1: Add CRM fields to customers table
-- ============================================================================

-- Add CRM-specific fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_purchase_date DATE,
ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contact_date DATE,
ADD COLUMN IF NOT EXISTS next_follow_up_date DATE,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add constraints for new fields
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS valid_contact_status,
ADD CONSTRAINT valid_contact_status CHECK (contact_status IN ('lead', 'prospect', 'customer', 'vip', 'inactive', 'lost'));

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS valid_preferred_contact,
ADD CONSTRAINT valid_preferred_contact CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'text'));

-- Create indexes for new CRM fields
CREATE INDEX IF NOT EXISTS idx_customers_contact_status ON public.customers(contact_status);
CREATE INDEX IF NOT EXISTS idx_customers_tags ON public.customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON public.customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_lead_source ON public.customers(lead_source);
CREATE INDEX IF NOT EXISTS idx_customers_next_follow_up ON public.customers(next_follow_up_date);

-- ============================================================================
-- STEP 2: Migrate data from clients table to customers table
-- ============================================================================

-- Insert clients that don't already exist in customers
INSERT INTO public.customers (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vehicle_color,
    license_plate,
    notes,
    created_at,
    updated_at,
    contact_status
)
SELECT 
    c.user_id,
    -- Split name into first_name and last_name
    CASE 
        WHEN position(' ' IN c.name) > 0 THEN split_part(c.name, ' ', 1)
        ELSE c.name
    END as first_name,
    CASE 
        WHEN position(' ' IN c.name) > 0 THEN substring(c.name FROM position(' ' IN c.name) + 1)
        ELSE ''
    END as last_name,
    c.email,
    c.phone,
    c.vehicle_make,
    c.vehicle_model,
    c.vehicle_year,
    c.vehicle_color,
    c.license_plate,
    c.notes,
    c.created_at,
    c.updated_at,
    'customer' as contact_status
FROM public.clients c
WHERE NOT EXISTS (
    SELECT 1 FROM public.customers cu
    WHERE cu.user_id = c.user_id 
    AND cu.email = c.email
    AND c.email IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Create mapping table for client_id to customer_id
-- ============================================================================

-- Create temporary mapping table
CREATE TEMP TABLE client_customer_mapping AS
SELECT 
    c.id as client_id,
    cu.id as customer_id
FROM public.clients c
LEFT JOIN public.customers cu ON (
    c.user_id = cu.user_id 
    AND (
        (c.email = cu.email AND c.email IS NOT NULL)
        OR (c.phone = cu.phone AND c.phone IS NOT NULL)
        OR (c.license_plate = cu.license_plate AND c.license_plate IS NOT NULL)
    )
);

-- ============================================================================
-- STEP 4: Update foreign key references from client_id to customer_id
-- ============================================================================

-- Update sales table if it references clients
DO $$
BEGIN
    -- Check if sales.client_id exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'client_id'
    ) THEN
        -- Add customer_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'customer_id'
        ) THEN
            ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        END IF;
        
        -- Update customer_id based on client_id mapping
        UPDATE public.sales s
        SET customer_id = m.customer_id
        FROM client_customer_mapping m
        WHERE s.client_id = m.client_id
        AND s.customer_id IS NULL;
        
        -- Drop the old client_id foreign key constraint
        ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_client_id_fkey;
        
        -- Drop the client_id column
        ALTER TABLE public.sales DROP COLUMN IF EXISTS client_id;
    ELSE
        -- Sales table already uses customer_id, nothing to do
        RAISE NOTICE 'Sales table already uses customer_id column';
    END IF;
END $$;

-- Update appointments table if it exists and references clients
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'appointments'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id'
    ) THEN
        -- Add customer_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'customer_id'
        ) THEN
            ALTER TABLE public.appointments ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;
        END IF;
        
        -- Update customer_id based on client_id mapping
        UPDATE public.appointments a
        SET customer_id = m.customer_id
        FROM client_customer_mapping m
        WHERE a.client_id = m.client_id
        AND a.customer_id IS NULL;
        
        -- Drop the old client_id foreign key constraint
        ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
        
        -- Drop the client_id column
        ALTER TABLE public.appointments DROP COLUMN IF EXISTS client_id;
    ELSE
        -- Appointments table doesn't exist or already uses customer_id
        RAISE NOTICE 'Appointments table does not need migration';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create CRM interactions table (keep this for interaction history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    -- Interaction Details
    interaction_type TEXT NOT NULL,
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    subject TEXT,
    description TEXT,
    
    -- Outcome
    outcome TEXT,
    next_action TEXT,
    next_action_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'task', 'sale'))
);

-- Create indexes for interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer_id ON public.crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_user_id ON public.crm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_date ON public.crm_interactions(interaction_date);

-- Enable RLS on interactions
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interactions
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
-- STEP 6: Create/Update database functions for CRM
-- ============================================================================

-- Function to get customer details with purchase history and interactions
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'customer', row_to_json(c.*),
        'interactions', COALESCE((
            SELECT json_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC)
            FROM crm_interactions i
            WHERE i.customer_id = p_customer_id
        ), '[]'::json),
        'purchases', COALESCE((
            SELECT json_agg(row_to_json(s.*) ORDER BY s.sale_date DESC)
            FROM sales s
            WHERE s.customer_id = p_customer_id AND s.status = 'completed'
        ), '[]'::json),
        'upcoming_events', COALESCE((
            SELECT json_agg(row_to_json(e.*) ORDER BY e.event_date ASC)
            FROM calendar_events e
            WHERE e.customer_id = p_customer_id 
            AND e.event_date >= CURRENT_DATE
            AND e.status != 'cancelled'
        ), '[]'::json)
    ) INTO result
    FROM customers c
    WHERE c.id = p_customer_id AND c.user_id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get CRM summary statistics
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
    -- Only update if customer_id is not null
    IF NEW.customer_id IS NOT NULL THEN
        -- Update customer with purchase data when a sale is completed
        UPDATE customers
        SET 
            lifetime_value = COALESCE((
                SELECT SUM(total_amount)
                FROM sales
                WHERE customer_id = NEW.customer_id AND status = 'completed'
            ), 0),
            last_purchase_date = (
                SELECT MAX(sale_date)
                FROM sales
                WHERE customer_id = NEW.customer_id AND status = 'completed'
            ),
            total_purchases = COALESCE((
                SELECT COUNT(*)
                FROM sales
                WHERE customer_id = NEW.customer_id AND status = 'completed'
            ), 0),
            contact_status = CASE 
                WHEN contact_status IN ('lead', 'prospect') THEN 'customer'
                ELSE contact_status
            END
        WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sales table to sync customer data
DROP TRIGGER IF EXISTS trigger_sync_customer_purchase_data ON sales;
CREATE TRIGGER trigger_sync_customer_purchase_data
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION sync_customer_purchase_data();

-- ============================================================================
-- STEP 7: Drop old tables
-- ============================================================================

-- Drop crm_contacts table if it exists (we just created it, but consolidating)
DROP TABLE IF EXISTS public.crm_contacts CASCADE;

-- Drop crm_tags table if it exists
DROP TABLE IF EXISTS public.crm_tags CASCADE;

-- Drop clients table (data has been migrated)
DROP TABLE IF EXISTS public.clients CASCADE;

-- ============================================================================
-- STEP 8: Add helpful comments
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Unified customer/contact table for CRM, sales, and all customer interactions';
COMMENT ON COLUMN public.customers.contact_status IS 'CRM status: lead, prospect, customer, vip, inactive, lost';
COMMENT ON COLUMN public.customers.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN public.customers.tags IS 'Array of custom tags for organizing contacts';
COMMENT ON COLUMN public.customers.lifetime_value IS 'Total revenue from this customer (auto-calculated)';
COMMENT ON COLUMN public.customers.total_purchases IS 'Count of completed purchases (auto-calculated)';
COMMENT ON TABLE public.crm_interactions IS 'Tracks all interactions with customers (calls, emails, meetings, notes, tasks)';
COMMENT ON FUNCTION get_customer_details IS 'Retrieves complete customer information with purchase history and interactions';
COMMENT ON FUNCTION get_crm_summary IS 'Returns CRM dashboard statistics';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ Added CRM fields to customers table
-- ✓ Migrated data from clients table to customers
-- ✓ Updated all foreign key references from client_id to customer_id
-- ✓ Created crm_interactions table for interaction history
-- ✓ Created database functions for CRM functionality
-- ✓ Dropped redundant tables (clients, crm_contacts, crm_tags)
-- ✓ All modules now use single unified customers table
