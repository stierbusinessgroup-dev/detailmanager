-- Migration: Create Sales Tables
-- Run this in your Supabase SQL Editor
-- This creates tables for managing sales transactions

-- First, verify that required tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    RAISE EXCEPTION 'customers table does not exist. Please run migration_create_customers.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    RAISE EXCEPTION 'products table does not exist. Please run migration_products_safe.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
    RAISE EXCEPTION 'services table does not exist. Please ensure services table is created first.';
  END IF;
END $$;

-- Drop existing tables if they exist (for clean re-runs during development)
DROP TABLE IF EXISTS public.sale_inventory_reservations CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;

-- Create sales table (main sales record)
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  sale_number TEXT NOT NULL, -- Auto-generated sale number (e.g., SALE-2024-0001)
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  
  -- Financial Information
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NULL DEFAULT 0, -- Tax rate as percentage (e.g., 8.5 for 8.5%)
  tax_amount NUMERIC(10, 2) NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Cost tracking (for profit calculation)
  total_cost NUMERIC(10, 2) NULL DEFAULT 0, -- Total cost of products/services
  profit_margin NUMERIC(10, 2) NULL DEFAULT 0, -- Calculated profit
  
  -- Sale Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending', 'completed', 'cancelled', 'refunded')
  ),
  
  -- Payment Information (for AR preparation)
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'partial', 'paid', 'refunded')
  ),
  amount_paid NUMERIC(10, 2) NULL DEFAULT 0,
  amount_due NUMERIC(10, 2) NULL DEFAULT 0,
  payment_due_date TIMESTAMP WITH TIME ZONE NULL,
  
  -- Additional Information
  notes TEXT NULL,
  internal_notes TEXT NULL, -- Private notes not visible to customer
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE NULL, -- When sale was completed
  
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT,
  CONSTRAINT sales_unique_sale_number UNIQUE (user_id, sale_number)
);

-- Create sale_items table (line items for each sale)
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Item can be either a service or a standalone product
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
  service_id UUID NULL,
  product_id UUID NULL,
  
  -- Item Details
  item_name TEXT NOT NULL, -- Snapshot of name at time of sale
  item_description TEXT NULL,
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(10, 2) NULL, -- Cost per unit (for profit tracking)
  
  -- Line Item Totals
  line_total NUMERIC(10, 2) NOT NULL, -- quantity * unit_price
  line_cost NUMERIC(10, 2) NULL, -- quantity * unit_cost
  
  -- Discount at line item level
  discount_amount NUMERIC(10, 2) NULL DEFAULT 0,
  
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
  CONSTRAINT sale_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT sale_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL,
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
  CONSTRAINT sale_items_item_reference_check CHECK (
    (item_type = 'service' AND service_id IS NOT NULL) OR
    (item_type = 'product' AND product_id IS NOT NULL)
  )
);

-- Create sale_inventory_reservations table (tracks inventory reserved for sale)
CREATE TABLE public.sale_inventory_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  sale_item_id UUID NULL, -- Which line item this reservation is for
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  quantity_reserved NUMERIC(10, 3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'committed', 'released', 'cancelled')
  ),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  committed_at TIMESTAMP WITH TIME ZONE NULL,
  
  CONSTRAINT sale_inventory_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT sale_inventory_reservations_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
  CONSTRAINT sale_inventory_reservations_sale_item_id_fkey FOREIGN KEY (sale_item_id) REFERENCES public.sale_items(id) ON DELETE CASCADE,
  CONSTRAINT sale_inventory_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
  CONSTRAINT sale_inventory_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.sales (sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales (payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales (sale_date);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_user_id ON public.sale_items (user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_service_id ON public.sale_items (service_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);

CREATE INDEX IF NOT EXISTS idx_sale_inventory_reservations_sale_id ON public.sale_inventory_reservations (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_inventory_reservations_product_id ON public.sale_inventory_reservations (product_id);
CREATE INDEX IF NOT EXISTS idx_sale_inventory_reservations_status ON public.sale_inventory_reservations (status);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_inventory_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "Users can view own sales" ON public.sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON public.sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.sales
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sale_items
CREATE POLICY "Users can view own sale items" ON public.sale_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sale items" ON public.sale_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sale items" ON public.sale_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sale items" ON public.sale_items
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sale_inventory_reservations
CREATE POLICY "Users can view own inventory reservations" ON public.sale_inventory_reservations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory reservations" ON public.sale_inventory_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory reservations" ON public.sale_inventory_reservations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory reservations" ON public.sale_inventory_reservations
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER sales_updated_at_trigger
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_updated_at();

CREATE TRIGGER sale_items_updated_at_trigger
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_updated_at();

CREATE TRIGGER sale_inventory_reservations_updated_at_trigger
  BEFORE UPDATE ON public.sale_inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_updated_at();

-- Function to generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  sale_number_result TEXT;
  current_year TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the next number for this user and year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(s.sale_number FROM 'SALE-' || current_year || '-(\d+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM public.sales s
  WHERE s.user_id = user_id_param
    AND s.sale_number LIKE 'SALE-' || current_year || '-%';
  
  -- Format as SALE-YYYY-0001
  sale_number_result := 'SALE-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN sale_number_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate sale totals
CREATE OR REPLACE FUNCTION public.calculate_sale_totals(sale_id_param UUID)
RETURNS TABLE(
  subtotal NUMERIC,
  total_cost NUMERIC,
  profit_margin NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(si.line_total - COALESCE(si.discount_amount, 0)), 0) AS subtotal,
    COALESCE(SUM(si.line_cost), 0) AS total_cost,
    COALESCE(SUM(si.line_total - COALESCE(si.discount_amount, 0)) - SUM(si.line_cost), 0) AS profit_margin
  FROM public.sale_items si
  WHERE si.sale_id = sale_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reserve inventory for a service
CREATE OR REPLACE FUNCTION public.reserve_service_inventory(
  sale_id_param UUID,
  sale_item_id_param UUID,
  service_id_param UUID,
  user_id_param UUID,
  quantity_multiplier NUMERIC DEFAULT 1
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  quantity_needed NUMERIC,
  quantity_available INTEGER,
  quantity_reserved NUMERIC,
  is_sufficient BOOLEAN
) AS $$
BEGIN
  -- Create reservations for all products in the service
  INSERT INTO public.sale_inventory_reservations (
    sale_id,
    sale_item_id,
    product_id,
    user_id,
    quantity_reserved,
    status
  )
  SELECT 
    sale_id_param,
    sale_item_id_param,
    sp.product_id,
    user_id_param,
    sp.quantity_used * quantity_multiplier,
    'reserved'
  FROM public.service_products sp
  WHERE sp.service_id = service_id_param;
  
  -- Return the reservation details
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    sp.quantity_used * quantity_multiplier,
    p.quantity_in_stock,
    sp.quantity_used * quantity_multiplier,
    (p.quantity_in_stock >= sp.quantity_used * quantity_multiplier) AS is_sufficient
  FROM public.service_products sp
  JOIN public.products p ON sp.product_id = p.id
  WHERE sp.service_id = service_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if sufficient inventory is available for a sale
CREATE OR REPLACE FUNCTION public.check_sale_inventory_availability(sale_id_param UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  total_reserved NUMERIC,
  quantity_available INTEGER,
  is_sufficient BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    SUM(sir.quantity_reserved) AS total_reserved,
    p.quantity_in_stock,
    (p.quantity_in_stock >= SUM(sir.quantity_reserved)) AS is_sufficient
  FROM public.sale_inventory_reservations sir
  JOIN public.products p ON sir.product_id = p.id
  WHERE sir.sale_id = sale_id_param
    AND sir.status = 'reserved'
  GROUP BY p.id, p.name, p.quantity_in_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to commit inventory reservations (when sale is completed)
CREATE OR REPLACE FUNCTION public.commit_sale_inventory(sale_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  reservation RECORD;
BEGIN
  -- Check if all reservations can be fulfilled
  FOR reservation IN 
    SELECT 
      sir.id,
      sir.product_id,
      sir.quantity_reserved,
      p.quantity_in_stock
    FROM public.sale_inventory_reservations sir
    JOIN public.products p ON sir.product_id = p.id
    WHERE sir.sale_id = sale_id_param
      AND sir.status = 'reserved'
  LOOP
    IF reservation.quantity_in_stock < reservation.quantity_reserved THEN
      RAISE EXCEPTION 'Insufficient inventory for product %', reservation.product_id;
    END IF;
  END LOOP;
  
  -- Deduct inventory and mark reservations as committed
  FOR reservation IN 
    SELECT 
      sir.id,
      sir.product_id,
      sir.quantity_reserved
    FROM public.sale_inventory_reservations sir
    WHERE sir.sale_id = sale_id_param
      AND sir.status = 'reserved'
  LOOP
    -- Update product inventory
    UPDATE public.products
    SET quantity_in_stock = quantity_in_stock - reservation.quantity_reserved
    WHERE id = reservation.product_id;
    
    -- Mark reservation as committed
    UPDATE public.sale_inventory_reservations
    SET 
      status = 'committed',
      committed_at = TIMEZONE('utc', NOW())
    WHERE id = reservation.id;
    
    -- Create inventory transaction record
    INSERT INTO public.inventory_transactions (
      product_id,
      user_id,
      transaction_type,
      quantity_change,
      quantity_after,
      notes
    )
    SELECT 
      reservation.product_id,
      sale_rec.user_id,
      'sale',
      -reservation.quantity_reserved,
      prod.quantity_in_stock,
      'Sale #' || sale_rec.sale_number
    FROM public.sales sale_rec
    JOIN public.products prod ON prod.id = reservation.product_id
    WHERE sale_rec.id = sale_id_param;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release inventory reservations (when sale is cancelled)
CREATE OR REPLACE FUNCTION public.release_sale_inventory(sale_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.sale_inventory_reservations
  SET 
    status = 'released',
    updated_at = TIMEZONE('utc', NOW())
  WHERE sale_id = sale_id_param
    AND status = 'reserved';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.sales TO authenticated;
GRANT ALL ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_inventory_reservations TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
