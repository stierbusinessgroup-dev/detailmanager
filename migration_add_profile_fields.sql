-- Migration: Add business_type, profile_completed, social media, and subscription fields to profiles table
-- Run this in your Supabase SQL Editor if you already have the profiles table created

-- Add business_type column with constraint
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('store', 'solo'));

-- Add profile_completed column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add social media and website URL columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS website_url TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Add subscription tier columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('monthly', 'team')) DEFAULT 'monthly';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')) DEFAULT 'trial';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to set profile_completed to false if NULL
UPDATE profiles 
SET profile_completed = false 
WHERE profile_completed IS NULL;

-- Set trial_ends_at for existing profiles (14 days from now)
UPDATE profiles 
SET trial_ends_at = TIMEZONE('utc', NOW()) + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

-- Set default subscription status for existing profiles
UPDATE profiles 
SET subscription_status = 'trial'
WHERE subscription_status IS NULL;

-- Set default subscription tier for existing profiles
UPDATE profiles 
SET subscription_tier = 'monthly'
WHERE subscription_tier IS NULL;
