-- Create customers table
-- This table stores customer information including contact details and vehicle information

-- Drop the table if it exists (for development purposes)
DROP TABLE IF EXISTS public.customers;

-- Create the customers table
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Address Information
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Vehicle Information
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  license_plate TEXT,
  
  -- Additional Information
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON public.customers(last_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_license_plate ON public.customers(license_plate);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

-- Create policies for Row Level Security
-- Users can only see their own customers
CREATE POLICY "Users can view their own customers"
  ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own customers
CREATE POLICY "Users can insert their own customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own customers
CREATE POLICY "Users can update their own customers"
  ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own customers
CREATE POLICY "Users can delete their own customers"
  ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS customers_updated_at_trigger ON public.customers;

-- Create a trigger to call the function before updates
CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customers_updated_at();

-- Add some helpful comments
COMMENT ON TABLE public.customers IS 'Stores customer information including contact details and vehicle information';
COMMENT ON COLUMN public.customers.user_id IS 'Reference to the user who owns this customer record';
COMMENT ON COLUMN public.customers.first_name IS 'Customer first name';
COMMENT ON COLUMN public.customers.last_name IS 'Customer last name';
COMMENT ON COLUMN public.customers.email IS 'Customer email address';
COMMENT ON COLUMN public.customers.phone IS 'Customer phone number';
COMMENT ON COLUMN public.customers.address IS 'Customer street address';
COMMENT ON COLUMN public.customers.city IS 'Customer city';
COMMENT ON COLUMN public.customers.state IS 'Customer state (2-letter code)';
COMMENT ON COLUMN public.customers.zip_code IS 'Customer ZIP code';
COMMENT ON COLUMN public.customers.vehicle_make IS 'Customer vehicle make (e.g., Toyota, Honda)';
COMMENT ON COLUMN public.customers.vehicle_model IS 'Customer vehicle model (e.g., Camry, Accord)';
COMMENT ON COLUMN public.customers.vehicle_year IS 'Customer vehicle year';
COMMENT ON COLUMN public.customers.vehicle_color IS 'Customer vehicle color';
COMMENT ON COLUMN public.customers.license_plate IS 'Customer vehicle license plate number';
COMMENT ON COLUMN public.customers.notes IS 'Additional notes about the customer';
COMMENT ON COLUMN public.customers.is_active IS 'Whether the customer is currently active';

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
