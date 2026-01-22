# Invoice Number Tracking System

This guide explains how to set up and use the invoice number tracking system in DetailManager.

## Overview

The invoice number tracking system provides:
- Customizable invoice number formats
- Automatic invoice number generation
- Sequential numbering with no duplicates
- Optional yearly reset functionality
- Real-time preview of invoice numbers

## Database Migration

### Step 1: Run the Invoice Settings Migration

Execute the `migration_add_invoice_settings.sql` file in your Supabase SQL Editor.

This migration adds the following fields to the `profiles` table:
- `invoice_prefix`: Prefix for invoice numbers (e.g., "INV", "INVOICE")
- `invoice_number_start`: Starting invoice number (e.g., 1000)
- `invoice_number_current`: Current invoice number counter
- `invoice_number_format`: Format template for invoice numbers
- `invoice_year_reset`: Whether to reset numbers each year

It also creates these database functions:
- `generate_invoice_number(user_id)`: Generates the next invoice number
- `reset_invoice_number(user_id, new_start)`: Manually resets invoice numbering
- `preview_invoice_number(prefix, format, number)`: Previews invoice format

## Configuration

### Accessing Invoice Settings

1. Navigate to **Profile Settings** page
2. Scroll to the **Invoice Settings** section
3. Configure your preferences
4. Click **Save Changes**

### Invoice Number Format Options

#### 1. PREFIX-YYYY-#### (Recommended)
**Example:** `INV-2026-0001`

**Best for:** Most businesses, provides clear year identification

**Features:**
- Includes prefix, year, and sequential number
- Easy to identify invoice year at a glance
- Automatically updates year

#### 2. PREFIX-####
**Example:** `INV-0001`

**Best for:** Simple numbering without year

**Features:**
- Shorter invoice numbers
- Continuous numbering across years
- Clean and simple

#### 3. YYYY-####
**Example:** `2026-0001`

**Best for:** Businesses that don't need a prefix

**Features:**
- Year-based numbering
- No custom prefix
- Compact format

#### 4. ####
**Example:** `0001`

**Best for:** Minimal numbering needs

**Features:**
- Simplest format
- Just sequential numbers
- No prefix or year

### Configuration Fields

#### Invoice Prefix
- **Default:** INV
- **Max Length:** 10 characters
- **Examples:** INV, INVOICE, BILL, ORDER
- **Purpose:** Identifies the document type

#### Starting Invoice Number
- **Default:** 1000
- **Min Value:** 1
- **Purpose:** First invoice number to use
- **Note:** Can be set to any number (e.g., 5000 if migrating from another system)

#### Current Invoice Number
- **Default:** Same as starting number
- **Purpose:** Next invoice number that will be assigned
- **Note:** Automatically increments with each invoice

#### Reset Numbers Each Year
- **Default:** Enabled
- **Purpose:** Start numbering from beginning each year
- **Example:** INV-2026-0001, INV-2027-0001, etc.

## How It Works

### Invoice Number Generation

When a sale is completed and an AR entry is created:

1. System calls `generate_invoice_number(user_id)` function
2. Function checks if year reset is enabled
3. If year reset is enabled and it's a new year, starts from beginning
4. Otherwise, uses the current counter
5. Formats the number according to your chosen format
6. Increments the counter for next invoice
7. Returns the formatted invoice number

### Year Reset Logic

If **Reset Numbers Each Year** is enabled:
- At the start of each new year, numbering resets to your starting number
- Example: Last invoice of 2026 is `INV-2026-1250`, first of 2027 is `INV-2027-1000`

If **Reset Numbers Each Year** is disabled:
- Numbering continues sequentially regardless of year
- Example: `INV-2026-1250`, `INV-2027-1251`, `INV-2027-1252`

### Preview Feature

The settings page shows a real-time preview of how your invoice numbers will look:
- Updates instantly as you change settings
- Shows the next invoice number that will be generated
- Helps you visualize the format before saving

## Setup Examples

### Example 1: Standard Business Setup
```
Invoice Prefix: INV
Format: PREFIX-YYYY-####
Starting Number: 1000
Year Reset: Enabled

Result: INV-2026-1000, INV-2026-1001, INV-2026-1002...
```

### Example 2: Simple Sequential
```
Invoice Prefix: INVOICE
Format: PREFIX-####
Starting Number: 1
Year Reset: Disabled

Result: INVOICE-0001, INVOICE-0002, INVOICE-0003...
```

### Example 3: Year-Based Only
```
Invoice Prefix: (not used)
Format: YYYY-####
Starting Number: 100
Year Reset: Enabled

Result: 2026-0100, 2026-0101, 2026-0102...
```

### Example 4: Migrating from Another System
```
Invoice Prefix: INV
Format: PREFIX-YYYY-####
Starting Number: 5000
Current Number: 5247
Year Reset: Enabled

Result: Next invoice will be INV-2026-5247
```

## Integration with Sales and AR

### Automatic Invoice Number Assignment

Invoice numbers are automatically generated when:
1. A sale is completed in the Sales module
2. An AR (Accounts Receivable) entry is created
3. The `create_ar_from_sale()` function is called

### Where Invoice Numbers Appear

Invoice numbers are displayed in:
- **Sales Module**: Sale records show associated invoice numbers
- **AR Module**: AR ledger displays invoice numbers
- **Invoices**: Printed/PDF invoices show the invoice number
- **Reports**: Invoice numbers used for tracking and reporting

## Best Practices

### 1. Set Up Before First Sale
Configure invoice settings before creating your first sale to ensure consistent numbering from the start.

### 2. Choose Appropriate Starting Number
- New business: Start at 1000 or 1001 (looks more established)
- Migrating: Set to your last invoice number + 1
- Testing: Use a high number (e.g., 9000) to distinguish test invoices

### 3. Use Year Reset for Better Organization
Enable year reset to:
- Easily identify invoice year
- Organize records by year
- Simplify year-end accounting

### 4. Keep Prefix Short and Clear
- Use 3-5 character prefixes
- Make it recognizable (INV, BILL, ORDER)
- Avoid special characters

### 5. Don't Change Format Mid-Year
Once you start using a format, stick with it for consistency. Change formats only at year-end if needed.

## Troubleshooting

### Invoice Numbers Not Generating

**Problem:** New sales don't have invoice numbers
**Solutions:**
- Ensure migration has been run
- Check that profile has invoice settings configured
- Verify `generate_invoice_number()` function exists in database

### Duplicate Invoice Numbers

**Problem:** Multiple invoices have the same number
**Solutions:**
- This should not happen with the automatic system
- Check if invoices were created manually
- Verify database function is working correctly

### Wrong Invoice Number Format

**Problem:** Invoice numbers don't match expected format
**Solutions:**
- Check Profile Settings → Invoice Settings
- Verify format selection matches desired output
- Save changes after modifying settings

### Year Not Resetting

**Problem:** New year but numbers didn't reset
**Solutions:**
- Verify "Reset Numbers Each Year" is enabled
- Check that year reset logic is working in database function
- First invoice of new year should reset automatically

## Manual Reset

If you need to manually reset invoice numbering:

### Option 1: Through Profile Settings
1. Go to Profile Settings
2. Change "Current Invoice Number" to desired number
3. Click Save Changes

### Option 2: Through Database (Advanced)
```sql
-- Reset to specific number
SELECT reset_invoice_number('your-user-id', 1000);
```

## Technical Details

### Database Schema

```sql
-- Profile table columns
invoice_prefix TEXT DEFAULT 'INV'
invoice_number_start INTEGER DEFAULT 1000
invoice_number_current INTEGER DEFAULT 1000
invoice_number_format TEXT DEFAULT 'PREFIX-YYYY-####'
invoice_year_reset BOOLEAN DEFAULT true
```

### Function Signatures

```sql
-- Generate next invoice number
generate_invoice_number(user_id UUID) RETURNS TEXT

-- Reset invoice numbering
reset_invoice_number(user_id UUID, new_start INTEGER) RETURNS BOOLEAN

-- Preview invoice format
preview_invoice_number(prefix TEXT, format TEXT, number INTEGER) RETURNS TEXT
```

### Integration Points

1. **Sales Completion**: When sale status changes to 'completed'
2. **AR Creation**: `create_ar_from_sale()` calls `generate_invoice_number()`
3. **Invoice Display**: AR and Sales modules display the generated number

## Migration from Other Systems

If migrating from another invoicing system:

1. **Determine Last Invoice Number**
   - Find your last invoice number from old system
   - Example: Last invoice was INV-2025-1247

2. **Configure Settings**
   - Set Starting Number: 1248 (or 1000 if resetting)
   - Set Current Number: 1248
   - Choose matching format
   - Enable/disable year reset as needed

3. **Test First Invoice**
   - Create a test sale
   - Complete it and check invoice number
   - Verify it matches expectations

4. **Adjust if Needed**
   - Go back to Profile Settings
   - Modify Current Number if necessary
   - Save and test again

## Support

For issues or questions:
1. Check this documentation
2. Verify database migration is complete
3. Check Profile Settings configuration
4. Review browser console for errors
5. Check Supabase logs for database errors

---

**Last Updated**: January 2026
**Version**: 1.0
