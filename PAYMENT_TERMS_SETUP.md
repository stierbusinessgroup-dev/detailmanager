# Payment Terms Setup Guide

This guide explains how to use the enhanced payment terms feature that connects customers, invoices, and accounts receivable.

## Overview

The payment terms feature allows you to:
- Set flexible payment terms for each customer
- Automatically display payment terms on invoices
- View invoices directly from the AR module
- Track customer payment preferences and history

## Database Migration

### Step 1: Run the Payment Terms Migration

Execute the `migration_add_payment_terms.sql` file in your Supabase SQL Editor:

```sql
-- This adds payment terms columns to the customers table
```

This migration adds the following fields to the `customers` table:
- `payment_terms_type`: Type of payment terms (net_days, discount, specific_dates, due_on_receipt)
- `payment_net_days`: Number of days until payment is due
- `payment_discount_percent`: Discount percentage for early payment
- `payment_discount_days`: Days to receive discount
- `payment_specific_dates`: Specific dates of month for payment (comma-separated)
- `payment_terms_notes`: Additional notes about payment terms

## Payment Terms Types

### 1. Net Days (Default)
Standard payment terms where payment is due within a specified number of days.

**Example:** Net 30 - Payment due within 30 days

**Settings:**
- Payment Terms Type: `Net Days`
- Net Days: `30`

### 2. Early Payment Discount
Offers a discount if paid within a certain number of days, otherwise due in full by net days.

**Example:** 2/10 Net 30 - 2% discount if paid within 10 days, otherwise due in 30 days

**Settings:**
- Payment Terms Type: `Early Payment Discount`
- Discount Percent: `2`
- Discount Days: `10`
- Net Days: `30`

### 3. Specific Payment Dates
Payment is due on specific dates of each month.

**Example:** Payment due on the 1st and 15th of each month

**Settings:**
- Payment Terms Type: `Specific Payment Dates`
- Payment Dates: `1, 15`

### 4. Due on Receipt
Payment is due immediately upon receipt of invoice.

**Settings:**
- Payment Terms Type: `Due on Receipt`

## Using Payment Terms

### Setting Payment Terms for a Customer

1. Navigate to the **Customers** page
2. Click **Add Customer** or edit an existing customer
3. Scroll to the **Payment Terms** section
4. Select the appropriate payment terms type
5. Fill in the required fields based on the type selected
6. Optionally add payment terms notes for special instructions
7. Click **Save**

### Viewing Payment Terms on Invoices

Payment terms are automatically displayed on invoices:

1. Complete a sale in the **Sales** module
2. Click **View Invoice** for the completed sale
3. The invoice will display the customer's payment terms in the footer section
4. If the customer has payment terms notes, they will appear below the main terms

### Viewing Invoices from AR Module

You can now view invoices directly from the Accounts Receivable module:

1. Navigate to the **AR** (Accounts Receivable) page
2. Find the invoice you want to view in the AR ledger table
3. Click the **📄 Invoice** button in the Actions column
4. The invoice will open in a modal viewer
5. From the viewer, you can:
   - **Print** the invoice using your browser's print dialog
   - **Download PDF** to save a copy
   - **Close** to return to the AR list

## Workflow Examples

### Example 1: Standard Net 30 Customer

**Customer Setup:**
- Name: John's Auto Shop
- Payment Terms Type: Net Days
- Net Days: 30

**Invoice Display:**
```
Payment Terms:
Net 30 - Payment due within 30 days
```

### Example 2: Early Payment Discount Customer

**Customer Setup:**
- Name: Quick Pay Motors
- Payment Terms Type: Early Payment Discount
- Discount Percent: 2
- Discount Days: 10
- Net Days: 30

**Invoice Display:**
```
Payment Terms:
2/10 Net 30 - 2% discount if paid within 10 days, otherwise due in 30 days
```

### Example 3: Specific Payment Dates Customer

**Customer Setup:**
- Name: Fleet Services Inc
- Payment Terms Type: Specific Payment Dates
- Payment Dates: 1, 15
- Payment Terms Notes: Please reference invoice number on payment

**Invoice Display:**
```
Payment Terms:
Payment due on the 1, 15 of each month
Please reference invoice number on payment
```

## Integration with AR Module

### How It Works

1. **Sale Completion**: When you complete a sale, an AR entry is automatically created
2. **Customer Data**: The AR entry includes all customer information, including payment terms
3. **Invoice Generation**: When viewing an invoice from AR, the system:
   - Fetches the sale details and line items
   - Retrieves customer information with payment terms
   - Loads business profile information
   - Generates a complete invoice with all data

### AR Invoice Viewing Features

- **Real-time Data**: Invoices show current payment status and amounts
- **Complete Information**: All line items, taxes, discounts, and totals
- **Payment Terms**: Automatically formatted based on customer settings
- **Print & PDF**: Full functionality for printing and downloading
- **Payment History**: Track all payments made against the invoice

## Best Practices

### 1. Set Payment Terms Early
Configure payment terms when creating a new customer to ensure they appear on the first invoice.

### 2. Be Consistent
Use standard payment terms (Net 30, Net 15, etc.) for most customers to simplify accounting.

### 3. Document Special Terms
Use the Payment Terms Notes field to document any special arrangements or requirements.

### 4. Review Regularly
Periodically review customer payment terms and adjust based on payment history and relationship.

### 5. Communicate Clearly
Ensure customers understand their payment terms by:
- Reviewing terms when creating the customer account
- Highlighting terms on invoices
- Following up before due dates

## Troubleshooting

### Payment Terms Not Showing on Invoice

**Problem**: Invoice doesn't display payment terms
**Solution**: 
- Check that the customer has payment terms configured
- Verify the customer is properly linked to the sale
- Ensure you've run the payment terms migration

### Invoice Button Not Appearing in AR

**Problem**: Can't see the Invoice button in AR module
**Solution**:
- Refresh the page to load the updated component
- Check that the AR entry has a valid sale_id
- Verify the sale has associated line items

### Payment Terms Not Saving

**Problem**: Payment terms reset when editing customer
**Solution**:
- Ensure you've run the migration to add payment terms columns
- Check browser console for any errors
- Verify you have proper permissions in Supabase

### Invoice Data Missing

**Problem**: Invoice shows incomplete information
**Solution**:
- Verify the sale has line items (services or products)
- Check that customer information is complete
- Ensure business profile is configured in Settings

## Technical Details

### Database Schema

The payment terms are stored in the `customers` table with the following structure:

```sql
payment_terms_type TEXT DEFAULT 'net_days'
payment_net_days INTEGER DEFAULT 30
payment_discount_percent NUMERIC(5, 2) DEFAULT 0
payment_discount_days INTEGER DEFAULT 0
payment_specific_dates TEXT
payment_terms_notes TEXT
```

### Invoice Data Flow

1. AR Module → Click "View Invoice"
2. Fetch sale data with line items
3. Fetch customer data with payment terms
4. Fetch business profile information
5. Generate invoice data object
6. Render Invoice component with InvoiceViewer
7. Format payment terms based on customer settings

### Components Modified

- **Customers.jsx**: Added payment terms form fields
- **Invoice.jsx**: Added formatPaymentTerms() function
- **AccountsReceivable.jsx**: Added invoice viewing capability
- **InvoiceViewer.jsx**: Reused existing component

## Future Enhancements

Potential improvements to consider:
- Automatic due date calculation based on payment terms
- Payment term templates for quick setup
- Bulk update payment terms for multiple customers
- Payment terms history tracking
- Automated reminders based on payment terms
- Integration with payment processing

## Support

For issues or questions:
1. Check this documentation
2. Review the browser console for errors
3. Verify database migrations are complete
4. Check Supabase logs for backend errors

---

**Last Updated**: January 2026
**Version**: 1.0
