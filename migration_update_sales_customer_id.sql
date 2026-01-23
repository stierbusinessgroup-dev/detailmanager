-- Migration: Update Sales Table to use customer_id instead of client_id
-- Description: Converts sales.client_id to sales.customer_id if needed
-- Author: DetailManager
-- Date: 2026-01-22
-- NOTE: Run this BEFORE migration_consolidate_customers_v2.sql if your sales table has client_id

-- ============================================================================
-- Check and update sales table
-- ============================================================================

DO $$
BEGIN
    -- Check if sales table has client_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'client_id'
    ) THEN
        RAISE NOTICE 'Sales table has client_id, converting to customer_id...';
        
        -- Add customer_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'customer_id'
        ) THEN
            ALTER TABLE public.sales ADD COLUMN customer_id UUID;
            RAISE NOTICE 'Added customer_id column to sales table';
        END IF;
        
        -- Create temporary mapping from clients to customers
        CREATE TEMP TABLE IF NOT EXISTS temp_client_customer_map AS
        SELECT 
            cl.id as client_id,
            cu.id as customer_id
        FROM public.clients cl
        LEFT JOIN public.customers cu ON (
            cl.user_id = cu.user_id 
            AND (
                (cl.email = cu.email AND cl.email IS NOT NULL AND cl.email != '')
                OR (cl.phone = cu.phone AND cl.phone IS NOT NULL AND cl.phone != '')
                OR (cl.license_plate = cu.license_plate AND cl.license_plate IS NOT NULL AND cl.license_plate != '')
            )
        );
        
        -- Update sales.customer_id from client_id mapping
        UPDATE public.sales s
        SET customer_id = m.customer_id
        FROM temp_client_customer_map m
        WHERE s.client_id = m.client_id
        AND s.customer_id IS NULL;
        
        RAISE NOTICE 'Updated customer_id values from client_id mapping';
        
        -- Drop the old client_id foreign key constraint if it exists
        ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_client_id_fkey;
        
        -- Drop the client_id column
        ALTER TABLE public.sales DROP COLUMN client_id;
        
        -- Add foreign key constraint for customer_id
        ALTER TABLE public.sales 
        ADD CONSTRAINT sales_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;
        
        RAISE NOTICE 'Successfully converted sales.client_id to sales.customer_id';
        
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'customer_id'
    ) THEN
        RAISE NOTICE 'Sales table already has customer_id column - no conversion needed';
    ELSE
        RAISE NOTICE 'Sales table does not exist or has neither client_id nor customer_id';
    END IF;
END $$;

SELECT 'Sales table customer_id check/conversion complete!' as status;
