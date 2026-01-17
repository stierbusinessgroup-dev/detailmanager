-- Create customers table
-- This table stores customer information including contact details and vehicle information

-- Drop the table if it exists (for development purposes)
DROP TABLE IF EXISTS customers;

-- Create the customers table
CREATE TABLE customers (
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
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_last_name ON customers(last_name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_license_plate ON customers(license_plate);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Users can only see their own customers
CREATE POLICY "Users can view their own customers"
  ON customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own customers
CREATE POLICY "Users can insert their own customers"
  ON customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own customers
CREATE POLICY "Users can update their own customers"
  ON customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own customers
CREATE POLICY "Users can delete their own customers"
  ON customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before updates
CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Add some helpful comments
COMMENT ON TABLE customers IS 'Stores customer information including contact details and vehicle information';
COMMENT ON COLUMN customers.user_id IS 'Reference to the user who owns this customer record';
COMMENT ON COLUMN customers.first_name IS 'Customer first name';
COMMENT ON COLUMN customers.last_name IS 'Customer last name';
COMMENT ON COLUMN customers.email IS 'Customer email address';
COMMENT ON COLUMN customers.phone IS 'Customer phone number';
COMMENT ON COLUMN customers.address IS 'Customer street address';
COMMENT ON COLUMN customers.city IS 'Customer city';
COMMENT ON COLUMN customers.state IS 'Customer state (2-letter code)';
COMMENT ON COLUMN customers.zip_code IS 'Customer ZIP code';
COMMENT ON COLUMN customers.vehicle_make IS 'Customer vehicle make (e.g., Toyota, Honda)';
COMMENT ON COLUMN customers.vehicle_model IS 'Customer vehicle model (e.g., Camry, Accord)';
COMMENT ON COLUMN customers.vehicle_year IS 'Customer vehicle year';
COMMENT ON COLUMN customers.vehicle_color IS 'Customer vehicle color';
COMMENT ON COLUMN customers.license_plate IS 'Customer vehicle license plate number';
COMMENT ON COLUMN customers.notes IS 'Additional notes about the customer';
COMMENT ON COLUMN customers.is_active IS 'Whether the customer is currently active';
