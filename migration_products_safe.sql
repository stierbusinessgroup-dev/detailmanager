-- Migration: Create or Update Products/Inventory Table (Safe Version)
-- Run this in your Supabase SQL Editor
-- This version checks if table exists and handles both scenarios

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  category TEXT NULL DEFAULT 'other',
  price NUMERIC(10, 2) NOT NULL,
  cost NUMERIC(10, 2) NULL,
  sku TEXT NULL,
  vendor TEXT NULL,
  size TEXT NULL,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NULL DEFAULT 10,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc', now()),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT products_category_check CHECK (
    category IN (
      'detail_package',
      'wax',
      'coating',
      'polish',
      'interior',
      'exterior',
      'addon',
      'other'
    )
  ),
  CONSTRAINT products_quantity_check CHECK (quantity_in_stock >= 0)
);

-- Add missing columns if table already exists (will fail silently if columns exist)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor TEXT NULL;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size TEXT NULL;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantity_in_stock INTEGER NOT NULL DEFAULT 0;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NULL DEFAULT 10;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products (user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products (vendor);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

-- RLS Policies for products
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS products_updated_at ON public.products;

-- Create trigger to automatically update updated_at
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_products_updated_at();

-- Create inventory_transactions table for tracking stock changes
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return')),
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT inventory_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for inventory transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON public.inventory_transactions (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON public.inventory_transactions (user_id);

-- Enable RLS for inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can insert own inventory transactions" ON public.inventory_transactions;

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view own inventory transactions" ON public.inventory_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory transactions" ON public.inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.inventory_transactions TO authenticated;

-- Refresh schema cache (important!)
NOTIFY pgrst, 'reload schema';
