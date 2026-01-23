# Customer Table Consolidation Guide

## Overview
This guide explains the consolidation of the `clients`, `customers`, and `crm_contacts` tables into a single unified `customers` table. This consolidation eliminates data duplication, simplifies relationships, and provides a single source of truth for all contact/customer data.

## What Changed

### Before Consolidation
You had **three separate tables** storing similar data:

1. **`clients`** - Basic contact info (name, email, phone, vehicle)
2. **`customers`** - Enhanced contact info (split names, address, payment terms)
3. **`crm_contacts`** - CRM-specific data (lead tracking, tags, social media)

This caused:
- ❌ Data duplication
- ❌ Synchronization issues
- ❌ Complex queries across multiple tables
- ❌ Confusion about which table to use

### After Consolidation
Now you have **one unified table**:

**`customers`** - Complete contact/customer/lead information including:
- ✅ Basic contact info (name, email, phone, mobile)
- ✅ Company details (company, position, website, industry)
- ✅ Full address (address, city, state, zip, country)
- ✅ Vehicle information
- ✅ Payment terms
- ✅ CRM fields (status, lead source, lead score, tags)
- ✅ Financial tracking (lifetime value, purchase history)
- ✅ Follow-up tracking
- ✅ Social media links
- ✅ Notes and preferences

**`crm_interactions`** - Separate table for interaction history
- Tracks all calls, emails, meetings, notes, and tasks
- Links to `customers` table via `customer_id`

## Migration Steps

### Step 1: Run the Migration SQL
Execute `migration_consolidate_customers.sql` in your Supabase SQL Editor:

```sql
-- This migration will:
-- 1. Add CRM fields to customers table
-- 2. Migrate data from clients to customers
-- 3. Update all foreign key references (client_id → customer_id)
-- 4. Create crm_interactions table
-- 5. Create database functions for CRM
-- 6. Drop old tables (clients, crm_contacts, crm_tags)
```

### Step 2: Verify the Migration
After running the migration, verify:

1. **Check customers table has new fields:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'customers' 
   ORDER BY ordinal_position;
   ```

2. **Verify data was migrated:**
   ```sql
   SELECT COUNT(*) FROM customers;
   -- Should show combined count from old clients + customers
   ```

3. **Check sales table references customers:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'sales' AND column_name = 'customer_id';
   -- Should return customer_id (not client_id)
   ```

4. **Verify old tables are gone:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name IN ('clients', 'crm_contacts', 'crm_tags');
   -- Should return no results
   ```

### Step 3: Frontend Already Updated
The CRM component (`src/pages/CRM.jsx`) has been automatically updated to:
- Use `customers` table instead of `crm_contacts`
- Use `get_crm_summary()` instead of `get_contacts_summary()`
- Use `get_customer_details()` instead of `get_contact_details()`
- Reference `customer_id` in interactions table

## New Database Schema

### Customers Table
```sql
customers (
  -- Identity
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  
  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  
  -- Company Info
  company TEXT,
  position TEXT,
  website TEXT,
  industry TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Vehicle Info
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  license_plate TEXT,
  
  -- CRM Fields
  contact_status TEXT DEFAULT 'customer',
    -- Values: lead, prospect, customer, vip, inactive, lost
  lead_source TEXT,
  lead_score INTEGER DEFAULT 0,
  tags TEXT[],
  preferred_contact_method TEXT DEFAULT 'email',
  assigned_to UUID REFERENCES auth.users,
  
  -- Financial (auto-calculated)
  lifetime_value DECIMAL(10,2) DEFAULT 0.00,
  last_purchase_date DATE,
  total_purchases INTEGER DEFAULT 0,
  
  -- Follow-up
  last_contact_date DATE,
  next_follow_up_date DATE,
  
  -- Social Media
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  
  -- Payment Terms
  payment_terms_type TEXT DEFAULT 'net_days',
  payment_net_days INTEGER DEFAULT 30,
  payment_discount_percent NUMERIC(5,2) DEFAULT 0,
  payment_discount_days INTEGER DEFAULT 0,
  payment_specific_dates TEXT,
  payment_terms_notes TEXT,
  
  -- Other
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### CRM Interactions Table
```sql
crm_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  customer_id UUID REFERENCES customers,
  
  interaction_type TEXT NOT NULL,
    -- Values: call, email, meeting, note, task, sale
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Database Functions

### get_crm_summary(p_user_id UUID)
Returns CRM dashboard statistics:
```json
{
  "total_contacts": 150,
  "leads": 25,
  "prospects": 30,
  "customers": 80,
  "vips": 15,
  "inactive": 0,
  "total_lifetime_value": 125000.00,
  "avg_lifetime_value": 833.33,
  "contacts_needing_follow_up": 12
}
```

### get_customer_details(p_customer_id UUID, p_user_id UUID)
Returns complete customer information:
```json
{
  "customer": { /* full customer record */ },
  "interactions": [ /* array of interactions */ ],
  "purchases": [ /* array of completed sales */ ],
  "upcoming_events": [ /* array of future calendar events */ ]
}
```

### sync_customer_purchase_data()
Trigger function that automatically updates customer when sales are completed:
- Updates `lifetime_value`
- Updates `last_purchase_date`
- Updates `total_purchases`
- Changes status from lead/prospect → customer

## Contact Status Workflow

The unified `customers` table supports the complete customer lifecycle:

1. **Lead** → New potential customer
2. **Prospect** → Qualified lead being actively pursued
3. **Customer** → Active paying customer (auto-set on first purchase)
4. **VIP** → High-value customer requiring special attention
5. **Inactive** → Customer with no recent activity
6. **Lost** → Opportunity that didn't convert

## Using the CRM Module

### Adding a Contact
1. Navigate to CRM module
2. Click "+ Add Contact"
3. Fill in all relevant fields
4. Set initial status (usually "Lead" or "Customer")
5. Add tags for organization
6. Set follow-up date if needed

### Organizing Contacts
- **By Status**: Use status dropdown to filter
- **By Tags**: Create custom tags and filter by them
- **By Search**: Search name, email, company, or phone

### Tracking Interactions
1. Open contact detail view
2. Click "+ Add Interaction"
3. Select type (call, email, meeting, note, task)
4. Add details and outcome
5. Set next action date

### Purchase History
- Automatically populated from Sales module
- Shows all completed sales
- Displays lifetime value and total purchases
- Updates in real-time when sales are completed

## Integration with Other Modules

### Sales Module
- References `customers.id` via `customer_id`
- Completing a sale automatically updates customer's:
  - `lifetime_value`
  - `last_purchase_date`
  - `total_purchases`
  - `contact_status` (lead/prospect → customer)

### Calendar Module
- Links events to customers via `customer_id`
- Upcoming events appear in customer detail view

### Accounts Receivable
- Links invoices to customers via `customer_id`
- Customer payment terms automatically apply to invoices

### Accounts Payable
- Separate from customers (uses vendors table)

## Benefits of Consolidation

### Data Integrity
- ✅ Single source of truth
- ✅ No duplicate records
- ✅ Consistent data across all modules
- ✅ Automatic synchronization

### Simplified Queries
- ✅ One table to query instead of three
- ✅ All customer data in one place
- ✅ Easier to maintain and update

### Better Relationships
- ✅ Clear foreign key relationships
- ✅ Sales → Customers
- ✅ Calendar Events → Customers
- ✅ AR Invoices → Customers
- ✅ Interactions → Customers

### Enhanced Features
- ✅ Complete customer lifecycle tracking
- ✅ Lead scoring and source tracking
- ✅ Custom tags for organization
- ✅ Social media integration
- ✅ Follow-up management
- ✅ Interaction history

## Troubleshooting

### Migration Failed
**Problem**: Error running migration SQL

**Solutions**:
1. Check for syntax errors in SQL
2. Ensure you have proper permissions
3. Verify no active connections to tables being dropped
4. Run migration in parts if needed

### Data Not Migrated
**Problem**: Old client data not showing in customers table

**Solutions**:
1. Check if clients table had data before migration
2. Verify email/phone matching logic worked
3. Manually check for duplicate prevention
4. Review migration logs for errors

### Foreign Key Errors
**Problem**: Sales or other tables still reference client_id

**Solutions**:
1. Verify migration updated all foreign keys
2. Check for custom tables not covered by migration
3. Manually update any remaining client_id references

### CRM Not Loading
**Problem**: CRM page shows errors

**Solutions**:
1. Verify migration completed successfully
2. Check browser console for specific errors
3. Ensure `get_crm_summary` and `get_customer_details` functions exist
4. Verify RLS policies are correct

### Interactions Not Saving
**Problem**: Cannot add interactions to customers

**Solutions**:
1. Verify `crm_interactions` table exists
2. Check RLS policies on interactions table
3. Ensure `customer_id` is valid UUID
4. Check browser console for errors

## Best Practices

### Data Entry
- Always use proper contact status for new entries
- Add tags immediately for better organization
- Set follow-up dates to stay on top of leads
- Use consistent naming conventions

### Lead Management
- Start new contacts as "Lead"
- Move to "Prospect" when qualified
- System auto-updates to "Customer" on first sale
- Manually set "VIP" for high-value customers

### Interaction Logging
- Log all meaningful interactions immediately
- Be specific in descriptions
- Always set next action dates
- Use consistent interaction types

### Data Maintenance
- Regularly review and update contact statuses
- Clean up inactive contacts
- Update tags as needed
- Verify contact information periodically

## Summary

The consolidation of `clients`, `customers`, and `crm_contacts` into a single `customers` table provides:

- **Simplified Architecture**: One table instead of three
- **Better Data Integrity**: No duplication or sync issues
- **Enhanced Features**: Full CRM capabilities for all contacts
- **Easier Maintenance**: Single point of updates
- **Complete Lifecycle**: Track from lead to VIP customer
- **Automatic Sync**: Purchase data updates automatically
- **Flexible Organization**: Tags, statuses, and custom fields

Your DetailManager application now has a powerful, unified customer management system that handles everything from initial leads to long-term customer relationships! 🎉
