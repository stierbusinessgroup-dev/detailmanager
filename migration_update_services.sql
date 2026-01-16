-- Migration: Update Services Table
-- Run this in your Supabase SQL Editor (Database → SQL Editor → New Query)
-- Note: This updates the existing services table with additional fields

-- Add new columns to existing services table if they don't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('basic_detail', 'premium_detail', 'interior', 'exterior', 'ceramic_coating', 'paint_correction', 'addon', 'other')) DEFAULT 'other';
ALTER TABLE services ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2); -- Cost to you (for profit tracking)
ALTER TABLE services ADD COLUMN IF NOT EXISTS sku TEXT; -- Service code/identifier

-- Rename base_price to price for consistency (if needed)
-- Note: Uncomment the next line only if you want to rename the column
-- ALTER TABLE services RENAME COLUMN base_price TO price;

-- Update existing indexes
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
