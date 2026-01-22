-- Migration: Add Payment Terms to Customers Table
-- Run this in your Supabase SQL Editor
-- This adds payment terms fields to track customer payment preferences

-- Add payment terms columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS payment_terms_type TEXT DEFAULT 'net_days' CHECK (
  payment_terms_type IN ('net_days', 'discount', 'specific_dates', 'due_on_receipt')
),
ADD COLUMN IF NOT EXISTS payment_net_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS payment_discount_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_discount_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_specific_dates TEXT, -- JSON array of dates like [1, 15] for 1st and 15th
ADD COLUMN IF NOT EXISTS payment_terms_notes TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.customers.payment_terms_type IS 'Type of payment terms: net_days, discount, specific_dates, or due_on_receipt';
COMMENT ON COLUMN public.customers.payment_net_days IS 'Number of days until payment is due (e.g., 30 for Net 30)';
COMMENT ON COLUMN public.customers.payment_discount_percent IS 'Discount percentage if paid early (e.g., 2 for 2%)';
COMMENT ON COLUMN public.customers.payment_discount_days IS 'Number of days to receive discount (e.g., 10 for 2/10 Net 30)';
COMMENT ON COLUMN public.customers.payment_specific_dates IS 'Specific dates of month for payment (JSON array, e.g., [1, 15])';
COMMENT ON COLUMN public.customers.payment_terms_notes IS 'Additional notes about payment terms';

-- Create index for payment terms type
CREATE INDEX IF NOT EXISTS idx_customers_payment_terms_type ON public.customers(payment_terms_type);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
