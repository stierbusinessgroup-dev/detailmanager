-- Migration: Add Document Storage to Vendors Table
-- Description: Adds fields to store vendor documents like seller's permits, tax certificates, W-9 forms, etc.

-- Add document storage fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_name TEXT,
ADD COLUMN IF NOT EXISTS document_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS document_uploaded_at TIMESTAMP;

-- Create index for faster document queries
CREATE INDEX IF NOT EXISTS idx_vendors_document_url ON vendors(document_url) WHERE document_url IS NOT NULL;

-- Add comment to document_type column for reference
COMMENT ON COLUMN vendors.document_type IS 'Type of document: sellers_permit, w9_form, tax_certificate, business_license, insurance_certificate, contract, other';
