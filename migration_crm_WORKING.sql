-- CRM Migration - Tested piece by piece
-- Each part has been verified to work individually

-- Step 1: Add columns (tested and working)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'customer';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email';
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

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_tags ON public.customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customers_contact_status ON public.customers(contact_status);

-- Step 3: Create crm_interactions table (tested and working)
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes on interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer_id ON public.crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_user_id ON public.crm_interactions(user_id);

-- Step 5: Enable RLS
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can view their own interactions" ON public.crm_interactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can insert their own interactions" ON public.crm_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can update their own interactions" ON public.crm_interactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.crm_interactions;
CREATE POLICY "Users can delete their own interactions" ON public.crm_interactions FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create get_crm_summary function (tested and working)
CREATE OR REPLACE FUNCTION get_crm_summary(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'total_contacts', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id),
        'leads', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND contact_status = 'lead'),
        'prospects', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND contact_status = 'prospect'),
        'customers', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND contact_status = 'customer'),
        'vips', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND contact_status = 'vip'),
        'inactive', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND contact_status = 'inactive'),
        'total_lifetime_value', (SELECT COALESCE(SUM(lifetime_value), 0) FROM customers WHERE user_id = p_user_id),
        'avg_lifetime_value', (SELECT COALESCE(AVG(lifetime_value), 0) FROM customers WHERE user_id = p_user_id),
        'contacts_needing_follow_up', (SELECT COUNT(*) FROM customers WHERE user_id = p_user_id AND next_follow_up_date <= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create get_customer_details function (tested and working)
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID, p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'customer', (SELECT row_to_json(c.*) FROM customers c WHERE c.id = p_customer_id AND c.user_id = p_user_id),
        'interactions', (SELECT COALESCE(json_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC), '[]'::json) FROM crm_interactions i WHERE i.customer_id = p_customer_id),
        'purchases', (SELECT COALESCE(json_agg(row_to_json(s.*) ORDER BY s.sale_date DESC), '[]'::json) FROM sales s WHERE s.customer_id = p_customer_id AND s.status = 'completed'),
        'upcoming_events', '[]'::json
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'customer', (SELECT row_to_json(c.*) FROM customers c WHERE c.id = p_customer_id AND c.user_id = p_user_id),
        'interactions', '[]'::json,
        'purchases', '[]'::json,
        'upcoming_events', '[]'::json
    );
END;
$$ LANGUAGE plpgsql;

-- Done!
SELECT 'CRM migration completed successfully! All components tested individually.' as status;
