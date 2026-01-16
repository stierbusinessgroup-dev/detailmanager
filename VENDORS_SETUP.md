# Vendors Module Setup Guide

## Overview
The Vendors module has been successfully integrated into your DetailManager application. This module allows you to manage your suppliers and vendor relationships, track vendor information, and link products to specific vendors.

## Features Implemented

### Vendor Management
- **Add/Edit/Delete Vendors**: Full CRUD operations for vendor management
- **Vendor Information Tracking**:
  - Basic Info: Name, contact person, phone, email, address, website
  - Business Details: Payment terms, amounts owed
  - Quality Metrics: Vendor rating (0-5 stars)
  - Notes: Additional vendor-specific information
  - Active/Inactive status

### Product-Vendor Integration
- **Vendor Dropdown in Inventory**: Products can now be linked to vendors via a dropdown selector
- **Vendor Products View**: See all products associated with each vendor
- **Product Details**: View pricing, cost, and stock levels for vendor products

### User Interface
- **Vendors Page**: Dedicated page for managing all vendors
- **Split View Layout**: 
  - Left panel: List of all vendors with key information
  - Right panel: Detailed vendor information and associated products
- **Navigation**: New "Vendors" link added to the main navigation menu

## Setup Instructions

### Step 1: Run Database Migration
You need to run the database migration to create the vendors table and update the products table.

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Open and run the migration file: `migration_create_vendors.sql`

This migration will:
- Create the `vendors` table with all necessary fields
- Add `vendor_id` foreign key to the `products` table
- Set up Row Level Security (RLS) policies
- Create appropriate indexes for performance

### Step 2: Verify the Setup
After running the migration, verify that:
- The `vendors` table exists in your database
- The `products` table has a new `vendor_id` column
- RLS policies are enabled and working

### Step 3: Start Using the Module
1. Navigate to the **Vendors** section from the main navigation
2. Click **"+ Add Vendor"** to create your first vendor
3. Fill in the vendor information (only name is required)
4. Save the vendor

### Step 4: Link Products to Vendors
1. Go to the **Inventory** section
2. When adding or editing a product, you'll now see a **Vendor** dropdown
3. Select a vendor from the dropdown to link the product
4. The vendor name will be stored for reference

## Usage Guide

### Adding a New Vendor
1. Click **"+ Add Vendor"** button
2. Fill in the required and optional fields:
   - **Required**: Vendor Name
   - **Optional**: Contact name, phone, email, address, website, rating, payment terms, amount owed, notes
3. Check/uncheck "Active Vendor" to set status
4. Click **"Add Vendor"**

### Viewing Vendor Details
1. Click on any vendor card in the list
2. The right panel will display:
   - Complete vendor information
   - List of all products from that vendor
   - Product details (price, cost, stock levels)

### Editing a Vendor
1. Click the **"Edit"** button on a vendor card
2. Update the information in the modal
3. Click **"Update Vendor"**

### Deleting a Vendor
1. Click the **"Delete"** button on a vendor card
2. Confirm the deletion
3. Note: Products linked to this vendor will NOT be deleted, but their `vendor_id` will be set to NULL

### Linking Products to Vendors
1. In the Inventory section, add or edit a product
2. Use the **Vendor** dropdown to select a vendor
3. If you don't see your vendor, add it in the Vendors section first
4. Save the product

## Database Schema

### Vendors Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- name (TEXT, Required)
- contact_name (TEXT)
- phone (TEXT)
- email (TEXT)
- address (TEXT)
- website (TEXT)
- rating (NUMERIC 0-5)
- payment_terms (TEXT)
- amount_owed (NUMERIC)
- notes (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Products Table Updates
```sql
- vendor_id (UUID, Foreign Key to vendors.id)
  - Links products to vendors
  - SET NULL on vendor deletion
```

## File Structure

### New Files Created
- `src/pages/Vendors.jsx` - Main vendors page component
- `src/pages/Vendors.css` - Vendors page styling
- `migration_create_vendors.sql` - Database migration script
- `VENDORS_SETUP.md` - This setup guide

### Modified Files
- `src/pages/Inventory.jsx` - Added vendor dropdown and vendor fetching
- `src/App.jsx` - Added vendors route
- `src/components/Navigation.jsx` - Added vendors navigation link

## Features Breakdown

### Vendor Card Display
Each vendor card shows:
- Vendor name
- Star rating (if provided)
- Contact person
- Phone number
- Amount owed (highlighted in red if > 0)
- Edit and Delete buttons

### Vendor Details Panel
Shows comprehensive information:
- All contact details
- Business information (payment terms, amounts owed)
- Rating with star display
- Notes section
- Complete list of products from that vendor

### Search and Filter
- Search vendors by name or contact person
- Real-time filtering as you type

## Best Practices

1. **Add Vendors First**: Create your vendors before adding products to ensure proper linking
2. **Keep Vendor Info Updated**: Regularly update contact information and payment terms
3. **Use Ratings**: Rate your vendors to track quality and reliability
4. **Track Amounts Owed**: Keep the amount owed field updated for better financial tracking
5. **Use Notes**: Add important information about each vendor in the notes field

## Troubleshooting

### Vendors Not Showing in Dropdown
- Ensure the vendor is marked as "Active"
- Refresh the page to reload vendor data
- Check that the vendor was successfully saved to the database

### Products Not Showing for Vendor
- Verify the product has the correct `vendor_id` set
- Check that both the product and vendor belong to the same user
- Ensure RLS policies are correctly configured

### Migration Errors
- Ensure you're running the migration in the Supabase SQL Editor
- Check that you have the necessary permissions
- Verify that the `products` table exists before running the migration

## Next Steps

Consider these enhancements for the future:
- Purchase order management linked to vendors
- Vendor performance analytics
- Automatic reorder points based on vendor lead times
- Vendor payment history tracking
- Multi-currency support for international vendors

## Support

If you encounter any issues or have questions about the vendors module, please review:
1. This setup guide
2. The database migration file
3. The Supabase dashboard for any RLS policy issues
4. Browser console for any JavaScript errors
