-- Migration: Create Vendors Table
-- Run this in your Supabase SQL Editor

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  address TEXT NULL,
  website TEXT NULL,
  rating NUMERIC(2, 1) NULL CHECK (rating >= 0 AND rating <= 5),
  payment_terms TEXT NULL,
  amount_owed NUMERIC(10, 2) NULL DEFAULT 0,
  notes TEXT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc', now()),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors (user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors (name);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors (is_active);

-- Enable Row Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete own vendors" ON public.vendors;

-- RLS Policies for vendors
CREATE POLICY "Users can view own vendors" ON public.vendors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors" ON public.vendors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors" ON public.vendors
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;

-- Create trigger to automatically update updated_at
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vendors_updated_at();

-- Add vendor_id to products table to link products with vendors
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id UUID NULL;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_vendor_id_fkey'
  ) THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT products_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for vendor_id in products
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products (vendor_id);

-- Grant permissions
GRANT ALL ON public.vendors TO authenticated;

-- Refresh schema cache (important!)
NOTIFY pgrst, 'reload schema';
