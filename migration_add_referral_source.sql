-- Add referral_source field to customers table
-- This field tracks how customers found the business

-- Add the referral_source column
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.customers.referral_source IS 'How the customer found the business (Google, Referral, Yelp, Social Media, Drive-by, Other)';

-- Create an index for better query performance on referral source
CREATE INDEX IF NOT EXISTS idx_customers_referral_source ON public.customers(referral_source);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
