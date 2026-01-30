# Referral Source Tracking Setup Guide

## Overview
The referral source feature allows you to track how customers found your business. This helps you understand which marketing channels are most effective.

## Features
- **Dropdown Selection**: Choose from predefined options (Google, Referral, Yelp, Social Media, Drive-by, Other)
- **Add Customer Form**: Track referral source when adding new customers
- **Edit Customer Form**: Update referral source when editing existing customers
- **Customer Details View**: View referral source in the customer details modal
- **Database Indexing**: Optimized for reporting and analytics

## Setup Instructions

### 1. Run the Database Migration

You need to add the `referral_source` column to your customers table:

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migration_add_referral_source.sql`
4. Click "Run" to execute the migration

**Migration File**: `migration_add_referral_source.sql`

```sql
-- Add referral_source field to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS referral_source TEXT;

COMMENT ON COLUMN public.customers.referral_source IS 'How the customer found the business (Google, Referral, Yelp, Social Media, Drive-by, Other)';

CREATE INDEX IF NOT EXISTS idx_customers_referral_source ON public.customers(referral_source);

NOTIFY pgrst, 'reload schema';
```

### 2. Verify the Migration

After running the migration, verify it was successful:

```sql
-- Check if the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'referral_source';
```

### 3. Test the Feature

1. Start your development server (if not already running):
   ```bash
   npm run dev
   ```

2. Navigate to the Customers page
3. Click "Add Customer"
4. Fill out the form and select a referral source from the dropdown
5. Save the customer
6. Edit the customer and verify the referral source is pre-filled
7. View customer details and verify the referral source is displayed

## Usage

### Adding a New Customer
1. Click the "Add Customer" button
2. Fill in the customer information
3. In the "Additional Information" section, select "How did they find us?" from the dropdown
4. Choose from: Google, Referral, Yelp, Social Media, Drive-by, or Other
5. Click "Add Customer" to save

### Editing an Existing Customer
1. Click the Edit (✏️) button on any customer
2. The form will open with all current data pre-filled, including the referral source
3. Modify the referral source if needed
4. Click "Update Customer" to save changes

### Viewing Customer Details
1. Click the View (👁️) button on any customer
2. The referral source will be displayed in the "Personal Information" section
3. If no referral source was set, it will show "N/A"

## Referral Source Options

| Option | Description |
|--------|-------------|
| **Google** | Customer found you through Google search or Google Maps |
| **Referral** | Customer was referred by another customer or business |
| **Yelp** | Customer found you on Yelp |
| **Social Media** | Customer found you on Facebook, Instagram, TikTok, etc. |
| **Drive-by** | Customer saw your location while driving by |
| **Other** | Any other source not listed above |

## Analytics & Reporting

You can use this data for marketing analytics:

```sql
-- Count customers by referral source
SELECT 
  referral_source,
  COUNT(*) as customer_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM customers
WHERE referral_source IS NOT NULL
GROUP BY referral_source
ORDER BY customer_count DESC;
```

```sql
-- Track referral sources over time
SELECT 
  DATE_TRUNC('month', created_at) as month,
  referral_source,
  COUNT(*) as customer_count
FROM customers
WHERE referral_source IS NOT NULL
GROUP BY month, referral_source
ORDER BY month DESC, customer_count DESC;
```

## Future Enhancements

Consider these potential improvements:
- Add a "Referral Details" text field for more specific information
- Create a dashboard widget showing referral source breakdown
- Track referral source effectiveness by revenue
- Add custom referral sources specific to your business
- Link referrals to specific referring customers for referral programs

## Troubleshooting

### Dropdown not showing
- Verify the migration was run successfully
- Check browser console for errors
- Clear browser cache and reload

### Data not saving
- Check Supabase logs for errors
- Verify RLS policies allow updates to the referral_source column
- Ensure you're logged in with a valid user account

### Existing customers show "N/A"
- This is expected for customers added before the migration
- Edit each customer and set their referral source manually
- Or run a bulk update query to set a default value

## Integration Points

The referral source feature integrates with:
- **Customer Management**: Add/Edit/View customer forms
- **Database**: customers table with indexed referral_source column
- **Future Analytics**: Can be used for marketing ROI analysis

## Database Schema

```sql
-- customers table (relevant fields)
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  -- ... other fields ...
  referral_source TEXT,  -- NEW FIELD
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_customers_referral_source ON public.customers(referral_source);
```

## Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify the migration was applied correctly
4. Ensure your user has proper permissions

---

**Last Updated**: January 29, 2026
**Version**: 1.0
