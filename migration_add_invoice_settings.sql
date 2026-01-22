-- Migration: Add Invoice Number Settings and Tracking
-- Run this in your Supabase SQL Editor
-- This adds invoice number configuration and tracking to the profiles table

-- Add invoice settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
ADD COLUMN IF NOT EXISTS invoice_number_start INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS invoice_number_current INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS invoice_number_format TEXT DEFAULT 'PREFIX-YYYY-####' CHECK (
  invoice_number_format IN ('PREFIX-YYYY-####', 'PREFIX-####', 'YYYY-####', '####')
),
ADD COLUMN IF NOT EXISTS invoice_year_reset BOOLEAN DEFAULT true;

-- Add helpful comments
COMMENT ON COLUMN public.profiles.invoice_prefix IS 'Prefix for invoice numbers (e.g., INV, INVOICE)';
COMMENT ON COLUMN public.profiles.invoice_number_start IS 'Starting invoice number (e.g., 1000)';
COMMENT ON COLUMN public.profiles.invoice_number_current IS 'Current invoice number counter';
COMMENT ON COLUMN public.profiles.invoice_number_format IS 'Format for invoice numbers: PREFIX-YYYY-####, PREFIX-####, YYYY-####, or ####';
COMMENT ON COLUMN public.profiles.invoice_year_reset IS 'Whether to reset invoice numbers each year';

-- Create function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  profile_record RECORD;
  next_number INTEGER;
  invoice_number TEXT;
  current_year TEXT;
BEGIN
  -- Get user's invoice settings
  SELECT 
    invoice_prefix,
    invoice_number_current,
    invoice_number_format,
    invoice_year_reset
  INTO profile_record
  FROM public.profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id_param;
  END IF;

  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Check if we need to reset for new year
  IF profile_record.invoice_year_reset THEN
    -- Check if there are any invoices from this year
    DECLARE
      year_invoice_count INTEGER;
    BEGIN
      SELECT COUNT(*)
      INTO year_invoice_count
      FROM public.ar_ledger
      WHERE user_id = user_id_param
        AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE);
      
      -- If no invoices this year, reset to start number
      IF year_invoice_count = 0 THEN
        next_number := profile_record.invoice_number_current;
      ELSE
        -- Get the highest number used this year and increment
        SELECT COALESCE(MAX(
          CAST(
            REGEXP_REPLACE(
              invoice_number, 
              '[^0-9]', 
              '', 
              'g'
            ) AS INTEGER
          )
        ), profile_record.invoice_number_current - 1) + 1
        INTO next_number
        FROM public.ar_ledger
        WHERE user_id = user_id_param
          AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE);
      END IF;
    END;
  ELSE
    -- No year reset, just increment
    next_number := profile_record.invoice_number_current;
  END IF;

  -- Format invoice number based on format setting
  CASE profile_record.invoice_number_format
    WHEN 'PREFIX-YYYY-####' THEN
      invoice_number := profile_record.invoice_prefix || '-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    WHEN 'PREFIX-####' THEN
      invoice_number := profile_record.invoice_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    WHEN 'YYYY-####' THEN
      invoice_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    WHEN '####' THEN
      invoice_number := LPAD(next_number::TEXT, 4, '0');
    ELSE
      invoice_number := profile_record.invoice_prefix || '-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  END CASE;

  -- Update the current invoice number in profile
  UPDATE public.profiles
  SET invoice_number_current = next_number + 1
  WHERE id = user_id_param;

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset invoice number (for manual resets)
CREATE OR REPLACE FUNCTION public.reset_invoice_number(
  user_id_param UUID,
  new_start_number INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles
  SET 
    invoice_number_current = new_start_number,
    invoice_number_start = new_start_number
  WHERE id = user_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to preview invoice number format
CREATE OR REPLACE FUNCTION public.preview_invoice_number(
  prefix_param TEXT,
  format_param TEXT,
  number_param INTEGER
)
RETURNS TEXT AS $$
DECLARE
  invoice_number TEXT;
  current_year TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  CASE format_param
    WHEN 'PREFIX-YYYY-####' THEN
      invoice_number := prefix_param || '-' || current_year || '-' || LPAD(number_param::TEXT, 4, '0');
    WHEN 'PREFIX-####' THEN
      invoice_number := prefix_param || '-' || LPAD(number_param::TEXT, 4, '0');
    WHEN 'YYYY-####' THEN
      invoice_number := current_year || '-' || LPAD(number_param::TEXT, 4, '0');
    WHEN '####' THEN
      invoice_number := LPAD(number_param::TEXT, 4, '0');
    ELSE
      invoice_number := prefix_param || '-' || current_year || '-' || LPAD(number_param::TEXT, 4, '0');
  END CASE;

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_invoice_number(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_invoice_number(TEXT, TEXT, INTEGER) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
