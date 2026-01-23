-- Migration: Clean Up Old CRM Triggers and Functions
-- Description: Removes all old CRM-related triggers and functions before consolidation
-- Author: DetailManager
-- Date: 2026-01-22
-- NOTE: Run this FIRST, then run migration_consolidate_customers_FINAL.sql

-- ============================================================================
-- Drop ALL old CRM triggers first
-- ============================================================================

-- Drop trigger on sales table
DROP TRIGGER IF EXISTS trigger_sync_contact_with_customer ON sales;

-- Drop trigger on crm_contacts table
DROP TRIGGER IF EXISTS trigger_update_crm_contact_timestamp ON crm_contacts;

-- Drop trigger for calendar event creation (we'll recreate it later if needed)
DROP TRIGGER IF EXISTS trigger_create_calendar_event_from_sale ON sales;

DO $$ BEGIN RAISE NOTICE 'Dropped old CRM triggers'; END $$;

-- ============================================================================
-- Drop ALL old CRM functions
-- ============================================================================

DROP FUNCTION IF EXISTS sync_contact_with_customer() CASCADE;
DROP FUNCTION IF EXISTS update_crm_contact_timestamp() CASCADE;
DROP FUNCTION IF EXISTS create_contact_from_customer(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_contact_details(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_contacts_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_calendar_event_from_sale() CASCADE;

DO $$ BEGIN RAISE NOTICE 'Dropped old CRM functions'; END $$;

-- ============================================================================
-- Drop old CRM tables
-- ============================================================================

DROP TABLE IF EXISTS public.crm_contacts CASCADE;
DROP TABLE IF EXISTS public.crm_tags CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

DO $$ BEGIN RAISE NOTICE 'Dropped old CRM tables'; END $$;

-- ============================================================================
-- Cleanup complete
-- ============================================================================

SELECT 'Old CRM cleanup completed! Now run migration_consolidate_customers_FINAL.sql' as status;
