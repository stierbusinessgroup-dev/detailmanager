-- Migration: Create CRM Module
-- Description: Creates tables and functions for comprehensive CRM functionality
-- Author: DetailManager
-- Date: 2026-01-22

-- ============================================================================
-- TABLE: crm_contacts
-- Description: Stores all CRM contacts with comprehensive information
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- Company Information
    company VARCHAR(255),
    position VARCHAR(100),
    website VARCHAR(255),
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Contact Details
    preferred_contact_method VARCHAR(20) DEFAULT 'email', -- email, phone, mobile, text
    
    -- CRM Status
    contact_status VARCHAR(50) DEFAULT 'lead', -- lead, prospect, customer, vip, inactive, lost
    lead_source VARCHAR(100), -- referral, website, social_media, advertising, trade_show, cold_call, other
    lead_score INTEGER DEFAULT 0, -- 0-100 score for lead quality
    
    -- Tags and Categories
    tags TEXT[], -- Array of custom tags
    industry VARCHAR(100),
    
    -- Relationship Information
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- Link to customers table if they become a customer
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Assigned sales rep/employee
    
    -- Financial Information
    lifetime_value DECIMAL(10, 2) DEFAULT 0.00,
    last_purchase_date DATE,
    total_purchases INTEGER DEFAULT 0,
    
    -- Notes and Interactions
    notes TEXT,
    last_contact_date DATE,
    next_follow_up_date DATE,
    
    -- Social Media
    linkedin_url VARCHAR(255),
    facebook_url VARCHAR(255),
    twitter_url VARCHAR(255),
    instagram_url VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT valid_contact_status CHECK (contact_status IN ('lead', 'prospect', 'customer', 'vip', 'inactive', 'lost')),
    CONSTRAINT valid_preferred_contact CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'text'))
);

-- ============================================================================
-- TABLE: crm_interactions
-- Description: Tracks all interactions with contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    
    -- Interaction Details
    interaction_type VARCHAR(50) NOT NULL, -- call, email, meeting, note, task, sale
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    subject VARCHAR(255),
    description TEXT,
    
    -- Outcome
    outcome VARCHAR(50), -- successful, unsuccessful, follow_up_needed, no_answer, completed
    next_action VARCHAR(255),
    next_action_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'task', 'sale'))
);

-- ============================================================================
-- TABLE: crm_tags
-- Description: Predefined and custom tags for organizing contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color code
    is_system BOOLEAN DEFAULT FALSE, -- System tags cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_tag_per_user UNIQUE(user_id, tag_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_id ON crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer_id ON crm_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(contact_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tags ON crm_contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact_id ON crm_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_user_id ON crm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_tags_user_id ON crm_tags(user_id);

-- ============================================================================
-- FUNCTION: update_crm_contact_timestamp
-- Description: Automatically updates the updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crm_contact_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crm_contact_timestamp
    BEFORE UPDATE ON crm_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_contact_timestamp();

-- ============================================================================
-- FUNCTION: sync_contact_with_customer
-- Description: Syncs CRM contact data with customer purchases
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_contact_with_customer()
RETURNS TRIGGER AS $$
DECLARE
    contact_record RECORD;
BEGIN
    -- Find CRM contact linked to this customer
    SELECT * INTO contact_record
    FROM crm_contacts
    WHERE customer_id = NEW.id;
    
    IF FOUND THEN
        -- Update contact with customer purchase data
        UPDATE crm_contacts
        SET 
            lifetime_value = COALESCE((
                SELECT SUM(total_amount)
                FROM sales
                WHERE customer_id = NEW.id AND status = 'completed'
            ), 0),
            last_purchase_date = (
                SELECT MAX(sale_date)
                FROM sales
                WHERE customer_id = NEW.id AND status = 'completed'
            ),
            total_purchases = COALESCE((
                SELECT COUNT(*)
                FROM sales
                WHERE customer_id = NEW.id AND status = 'completed'
            ), 0),
            contact_status = CASE 
                WHEN contact_status = 'lead' OR contact_status = 'prospect' THEN 'customer'
                ELSE contact_status
            END
        WHERE id = contact_record.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sales table to sync contact data
CREATE TRIGGER trigger_sync_contact_with_customer
    AFTER INSERT OR UPDATE ON sales
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION sync_contact_with_customer();

-- ============================================================================
-- FUNCTION: get_contact_details
-- Description: Retrieves complete contact information with purchase history
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contact_details(p_contact_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'contact', row_to_json(c.*),
        'customer', row_to_json(cust.*),
        'interactions', COALESCE((
            SELECT json_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC)
            FROM crm_interactions i
            WHERE i.contact_id = p_contact_id
        ), '[]'::json),
        'purchases', COALESCE((
            SELECT json_agg(row_to_json(s.*) ORDER BY s.sale_date DESC)
            FROM sales s
            WHERE s.customer_id = c.customer_id AND s.status = 'completed'
        ), '[]'::json),
        'upcoming_events', COALESCE((
            SELECT json_agg(row_to_json(e.*) ORDER BY e.event_date ASC)
            FROM calendar_events e
            WHERE e.customer_id = c.customer_id 
            AND e.event_date >= CURRENT_DATE
            AND e.status != 'cancelled'
        ), '[]'::json)
    ) INTO result
    FROM crm_contacts c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.id = p_contact_id AND c.user_id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_contacts_summary
-- Description: Returns summary statistics for CRM dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contacts_summary(p_user_id UUID)
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
    FROM crm_contacts
    WHERE user_id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: create_contact_from_customer
-- Description: Creates a CRM contact from an existing customer
-- ============================================================================

CREATE OR REPLACE FUNCTION create_contact_from_customer(p_customer_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    new_contact_id UUID;
    customer_record RECORD;
BEGIN
    -- Get customer data
    SELECT * INTO customer_record
    FROM customers
    WHERE id = p_customer_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Check if contact already exists for this customer
    SELECT id INTO new_contact_id
    FROM crm_contacts
    WHERE customer_id = p_customer_id;
    
    IF FOUND THEN
        RETURN new_contact_id;
    END IF;
    
    -- Create new contact
    INSERT INTO crm_contacts (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        customer_id,
        contact_status,
        lifetime_value,
        last_purchase_date,
        total_purchases
    )
    VALUES (
        p_user_id,
        customer_record.first_name,
        customer_record.last_name,
        customer_record.email,
        customer_record.phone,
        customer_record.address,
        customer_record.city,
        customer_record.state,
        customer_record.zip,
        p_customer_id,
        'customer',
        COALESCE((
            SELECT SUM(total_amount)
            FROM sales
            WHERE customer_id = p_customer_id AND status = 'completed'
        ), 0),
        (
            SELECT MAX(sale_date)
            FROM sales
            WHERE customer_id = p_customer_id AND status = 'completed'
        ),
        COALESCE((
            SELECT COUNT(*)
            FROM sales
            WHERE customer_id = p_customer_id AND status = 'completed'
        ), 0)
    )
    RETURNING id INTO new_contact_id;
    
    RETURN new_contact_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;

-- Policies for crm_contacts
CREATE POLICY "Users can view their own contacts"
    ON crm_contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
    ON crm_contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
    ON crm_contacts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
    ON crm_contacts FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for crm_interactions
CREATE POLICY "Users can view their own interactions"
    ON crm_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
    ON crm_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
    ON crm_interactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
    ON crm_interactions FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for crm_tags
CREATE POLICY "Users can view their own tags"
    ON crm_tags FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
    ON crm_tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
    ON crm_tags FOR UPDATE
    USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete their own tags"
    ON crm_tags FOR DELETE
    USING (auth.uid() = user_id AND is_system = FALSE);

-- ============================================================================
-- INSERT DEFAULT SYSTEM TAGS
-- ============================================================================

-- Note: System tags will be inserted per user when they first access CRM
-- This is handled in the application layer

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE crm_contacts IS 'Stores all CRM contacts with comprehensive information';
COMMENT ON TABLE crm_interactions IS 'Tracks all interactions with contacts';
COMMENT ON TABLE crm_tags IS 'Predefined and custom tags for organizing contacts';
COMMENT ON FUNCTION get_contact_details IS 'Retrieves complete contact information with purchase history';
COMMENT ON FUNCTION get_contacts_summary IS 'Returns summary statistics for CRM dashboard';
COMMENT ON FUNCTION create_contact_from_customer IS 'Creates a CRM contact from an existing customer';
