-- Migration: Create Accounts Receivable (AR) Tables
-- Run this in your Supabase SQL Editor
-- This creates tables for managing accounts receivable and payment tracking

-- First, verify that required tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    RAISE EXCEPTION 'sales table does not exist. Please run migration_create_sales.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    RAISE EXCEPTION 'customers table does not exist. Please run migration_create_customers.sql first.';
  END IF;
END $$;

-- Drop existing tables if they exist (for clean re-runs during development)
DROP TABLE IF EXISTS public.ar_payment_history CASCADE;
DROP TABLE IF EXISTS public.ar_ledger CASCADE;

-- Create AR Ledger table (main receivables tracking)
CREATE TABLE public.ar_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sale_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  
  -- Invoice Information
  invoice_number TEXT NOT NULL, -- References sale_number from sales table
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NULL,
  
  -- Financial Information
  original_amount NUMERIC(10, 2) NOT NULL, -- Original invoice total
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(10, 2) NOT NULL, -- Remaining balance
  
  -- AR Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'partial', 'paid', 'overdue', 'written_off', 'cancelled')
  ),
  
  -- Additional Information
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  paid_at TIMESTAMP WITH TIME ZONE NULL, -- When fully paid
  
  CONSTRAINT ar_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT ar_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT ar_ledger_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
  CONSTRAINT ar_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT,
  CONSTRAINT ar_ledger_unique_sale UNIQUE (sale_id)
);

-- Create AR Payment History table (tracks all payments received)
CREATE TABLE public.ar_payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ar_ledger_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Payment Information
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  payment_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NULL CHECK (
    payment_method IS NULL OR 
    payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'venmo', 'other')
  ),
  
  -- Payment Details
  reference_number TEXT NULL, -- Check number, transaction ID, etc.
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID NULL,
  
  CONSTRAINT ar_payment_history_pkey PRIMARY KEY (id),
  CONSTRAINT ar_payment_history_ar_ledger_id_fkey FOREIGN KEY (ar_ledger_id) REFERENCES public.ar_ledger(id) ON DELETE CASCADE,
  CONSTRAINT ar_payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT ar_payment_history_amount_positive CHECK (payment_amount > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ar_ledger_user_id ON public.ar_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_ar_ledger_customer_id ON public.ar_ledger (customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_ledger_sale_id ON public.ar_ledger (sale_id);
CREATE INDEX IF NOT EXISTS idx_ar_ledger_status ON public.ar_ledger (status);
CREATE INDEX IF NOT EXISTS idx_ar_ledger_due_date ON public.ar_ledger (due_date);
CREATE INDEX IF NOT EXISTS idx_ar_payment_history_ar_ledger_id ON public.ar_payment_history (ar_ledger_id);
CREATE INDEX IF NOT EXISTS idx_ar_payment_history_payment_date ON public.ar_payment_history (payment_date);

-- Enable Row Level Security
ALTER TABLE public.ar_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ar_ledger
CREATE POLICY "Users can view own AR ledger" ON public.ar_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AR ledger" ON public.ar_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AR ledger" ON public.ar_ledger
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AR ledger" ON public.ar_ledger
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ar_payment_history
CREATE POLICY "Users can view own payment history" ON public.ar_payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history" ON public.ar_payment_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment history" ON public.ar_payment_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment history" ON public.ar_payment_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_ar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER ar_ledger_updated_at
  BEFORE UPDATE ON public.ar_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ar_updated_at();

-- Function to create AR ledger entry when sale is completed
CREATE OR REPLACE FUNCTION public.create_ar_from_sale(sale_id_param UUID)
RETURNS UUID AS $$
DECLARE
  sale_record RECORD;
  ar_id UUID;
BEGIN
  -- Get sale information
  SELECT * INTO sale_record
  FROM public.sales
  WHERE id = sale_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found: %', sale_id_param;
  END IF;
  
  -- Check if AR entry already exists
  IF EXISTS (SELECT 1 FROM public.ar_ledger WHERE sale_id = sale_id_param) THEN
    RAISE EXCEPTION 'AR ledger entry already exists for sale: %', sale_id_param;
  END IF;
  
  -- Create AR ledger entry
  INSERT INTO public.ar_ledger (
    user_id,
    sale_id,
    customer_id,
    invoice_number,
    invoice_date,
    due_date,
    original_amount,
    amount_paid,
    amount_due,
    status
  )
  VALUES (
    sale_record.user_id,
    sale_record.id,
    sale_record.customer_id,
    sale_record.sale_number,
    sale_record.sale_date,
    sale_record.payment_due_date,
    sale_record.total_amount,
    sale_record.amount_paid,
    sale_record.amount_due,
    CASE 
      WHEN sale_record.amount_due <= 0 THEN 'paid'
      WHEN sale_record.amount_paid > 0 THEN 'partial'
      WHEN sale_record.payment_due_date < CURRENT_TIMESTAMP THEN 'overdue'
      ELSE 'open'
    END
  )
  RETURNING id INTO ar_id;
  
  RETURN ar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a payment
CREATE OR REPLACE FUNCTION public.record_ar_payment(
  ar_ledger_id_param UUID,
  payment_amount_param NUMERIC,
  payment_method_param TEXT DEFAULT NULL,
  reference_number_param TEXT DEFAULT NULL,
  payment_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  ar_record RECORD;
  payment_id UUID;
  new_amount_paid NUMERIC;
  new_amount_due NUMERIC;
  new_status TEXT;
BEGIN
  -- Get AR ledger record
  SELECT * INTO ar_record
  FROM public.ar_ledger
  WHERE id = ar_ledger_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AR ledger entry not found: %', ar_ledger_id_param;
  END IF;
  
  -- Validate payment amount
  IF payment_amount_param <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  
  IF payment_amount_param > ar_record.amount_due THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds amount due (%)', payment_amount_param, ar_record.amount_due;
  END IF;
  
  -- Create payment history record
  INSERT INTO public.ar_payment_history (
    ar_ledger_id,
    user_id,
    payment_date,
    payment_amount,
    payment_method,
    reference_number,
    notes,
    created_by
  )
  VALUES (
    ar_ledger_id_param,
    ar_record.user_id,
    COALESCE(payment_date_param, TIMEZONE('utc', NOW())),
    payment_amount_param,
    payment_method_param,
    reference_number_param,
    notes_param,
    auth.uid()
  )
  RETURNING id INTO payment_id;
  
  -- Calculate new amounts
  new_amount_paid := ar_record.amount_paid + payment_amount_param;
  new_amount_due := ar_record.original_amount - new_amount_paid;
  
  -- Determine new status
  IF new_amount_due <= 0 THEN
    new_status := 'paid';
  ELSIF new_amount_paid > 0 THEN
    new_status := 'partial';
  ELSIF ar_record.due_date < CURRENT_TIMESTAMP THEN
    new_status := 'overdue';
  ELSE
    new_status := 'open';
  END IF;
  
  -- Update AR ledger
  UPDATE public.ar_ledger
  SET 
    amount_paid = new_amount_paid,
    amount_due = new_amount_due,
    status = new_status,
    paid_at = CASE WHEN new_amount_due <= 0 THEN TIMEZONE('utc', NOW()) ELSE paid_at END
  WHERE id = ar_ledger_id_param;
  
  -- Update related sale record
  UPDATE public.sales
  SET 
    amount_paid = new_amount_paid,
    amount_due = new_amount_due,
    payment_status = CASE 
      WHEN new_amount_due <= 0 THEN 'paid'
      WHEN new_amount_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = ar_record.sale_id;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get AR aging summary
CREATE OR REPLACE FUNCTION public.get_ar_aging_summary(user_id_param UUID)
RETURNS TABLE(
  aging_bucket TEXT,
  count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH aging_data AS (
    SELECT 
      ar.amount_due,
      CASE
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 30 THEN 'current'
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 60 THEN '31-60'
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 90 THEN '61-90'
        ELSE 'over_90'
      END AS bucket,
      CASE
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 30 THEN 1
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 60 THEN 2
        WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ar.invoice_date)) <= 90 THEN 3
        ELSE 4
      END AS sort_order
    FROM public.ar_ledger ar
    WHERE ar.user_id = user_id_param
      AND ar.status IN ('open', 'partial', 'overdue')
  )
  SELECT 
    bucket AS aging_bucket,
    COUNT(*)::BIGINT,
    SUM(amount_due) AS total_amount
  FROM aging_data
  GROUP BY bucket, sort_order
  ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update AR status based on due dates (can be run periodically)
CREATE OR REPLACE FUNCTION public.update_ar_overdue_status()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.ar_ledger
  SET status = 'overdue'
  WHERE status IN ('open', 'partial')
    AND due_date < CURRENT_TIMESTAMP
    AND amount_due > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.ar_ledger TO authenticated;
GRANT ALL ON public.ar_payment_history TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
