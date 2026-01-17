-- Migration: Link Services to Products/Inventory
-- Run this in your Supabase SQL Editor
-- This creates a many-to-many relationship between services and products

-- Create service_products junction table
CREATE TABLE public.service_products (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  service_id UUID NOT NULL,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  quantity_used NUMERIC(10, 3) NOT NULL DEFAULT 1.0, -- Amount of product used per service (e.g., 0.5 bottles, 2 oz, etc.)
  unit TEXT NULL, -- Unit of measurement (oz, ml, bottles, etc.)
  notes TEXT NULL, -- Optional notes about how this product is used in the service
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT service_products_pkey PRIMARY KEY (id),
  CONSTRAINT service_products_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  CONSTRAINT service_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT service_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT service_products_quantity_check CHECK (quantity_used > 0),
  -- Ensure a product can only be added once per service
  CONSTRAINT service_products_unique_service_product UNIQUE (service_id, product_id)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_products_service_id ON public.service_products USING btree (service_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_products_product_id ON public.service_products USING btree (product_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_products_user_id ON public.service_products USING btree (user_id) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_products
CREATE POLICY "Users can view own service products" ON public.service_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service products" ON public.service_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service products" ON public.service_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own service products" ON public.service_products
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER service_products_updated_at
  BEFORE UPDATE ON public.service_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create a view to easily see services with their associated products
CREATE OR REPLACE VIEW public.services_with_products AS
SELECT 
  s.id AS service_id,
  s.user_id,
  s.name AS service_name,
  s.description AS service_description,
  s.base_price AS service_price,
  s.category AS service_category,
  s.cost AS service_cost,
  json_agg(
    json_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'product_category', p.category,
      'quantity_used', sp.quantity_used,
      'unit', sp.unit,
      'product_cost', p.cost,
      'total_cost', (sp.quantity_used * COALESCE(p.cost, 0)),
      'notes', sp.notes
    ) ORDER BY p.name
  ) FILTER (WHERE p.id IS NOT NULL) AS products
FROM public.services s
LEFT JOIN public.service_products sp ON s.id = sp.service_id
LEFT JOIN public.products p ON sp.product_id = p.id
GROUP BY s.id, s.user_id, s.name, s.description, s.base_price, s.category, s.cost;

-- Create a function to calculate total product cost for a service
CREATE OR REPLACE FUNCTION public.calculate_service_product_cost(service_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC;
BEGIN
  SELECT COALESCE(SUM(sp.quantity_used * COALESCE(p.cost, 0)), 0)
  INTO total_cost
  FROM public.service_products sp
  JOIN public.products p ON sp.product_id = p.id
  WHERE sp.service_id = service_id_param;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if sufficient inventory exists for a service
CREATE OR REPLACE FUNCTION public.check_service_inventory(service_id_param UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  quantity_needed NUMERIC,
  quantity_available INTEGER,
  is_sufficient BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    sp.quantity_used,
    p.quantity_in_stock,
    (p.quantity_in_stock >= sp.quantity_used) AS is_sufficient
  FROM public.service_products sp
  JOIN public.products p ON sp.product_id = p.id
  WHERE sp.service_id = service_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
