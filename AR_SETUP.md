# Accounts Receivable (AR) Module Setup Guide

## Overview
The Accounts Receivable module tracks outstanding invoices, manages payment collection, and provides aging reports for your detailing business. It integrates seamlessly with the Sales module to automatically create receivables when sales are completed.

## Database Setup

### 1. Run the AR Migration
Execute the AR migration SQL script in your Supabase SQL Editor:

```sql
-- File: migration_create_ar.sql
```

This creates the following tables:
- **ar_ledger**: Main receivables tracking table
- **ar_payment_history**: Payment transaction history

### 2. Key Features of AR Tables

#### AR Ledger Table
- Tracks invoice numbers, dates, and amounts
- Automatically calculates days outstanding
- Generates aging buckets (Current, 31-60, 61-90, Over 90 days)
- Links to sales and customers
- Supports multiple statuses: open, partial, paid, overdue, written_off, cancelled

#### AR Payment History Table
- Records all payments received
- Tracks payment method, reference numbers, and dates
- Maintains complete audit trail

### 3. Database Functions

The migration includes several helpful functions:

- **create_ar_from_sale(sale_id)**: Automatically creates AR entry when sale is completed
- **record_ar_payment()**: Records payments and updates balances
- **get_ar_aging_summary()**: Generates aging report
- **update_ar_overdue_status()**: Updates overdue invoices (can be scheduled)

## Integration with Sales Module

### How It Works

1. **Create a Sale**: Use the Sales module to create a new sale (saved as draft)
2. **Complete the Sale**: Click "Complete Sale" button in the sales list
3. **Automatic AR Creation**: The system automatically:
   - Updates sale status to "completed"
   - Commits inventory (deducts from stock)
   - Creates an AR ledger entry
   - Sets payment status based on amount due

### Sale Completion Flow

```javascript
// When you click "Complete Sale":
1. Sale status → 'completed'
2. Inventory → Deducted from stock
3. AR Ledger → New entry created
4. Payment tracking → Enabled
```

## Using the AR Module

### Viewing Receivables

Navigate to **AR** in the main menu to view:

- **Total Outstanding**: Sum of all unpaid invoices
- **Overdue Amount**: Invoices past due date
- **Total Collected**: All paid invoices
- **Aging Summary**: Breakdown by aging bucket

### Filtering Invoices

Use the filter buttons to view:
- **All**: All invoices
- **Open**: Unpaid and partially paid invoices
- **Overdue**: Past due date invoices
- **Paid**: Fully paid invoices

### Recording Payments

1. Click **"Record Payment"** on any open invoice
2. Enter payment details:
   - Payment amount (cannot exceed amount due)
   - Payment method (cash, check, credit card, etc.)
   - Reference number (check #, transaction ID)
   - Payment date
   - Notes (optional)
3. Click **"Record Payment"**

The system automatically:
- Updates the AR ledger balance
- Updates the related sale payment status
- Records payment in history
- Adjusts invoice status (partial/paid)

### Payment History

View complete payment history for any invoice by clicking:
- **"Record Payment"** for open invoices
- **"View History"** for paid invoices

## AR Status Definitions

| Status | Description |
|--------|-------------|
| **Open** | Invoice unpaid, not yet due or within due date |
| **Partial** | Some payment received, balance remaining |
| **Paid** | Fully paid, no balance due |
| **Overdue** | Past due date with outstanding balance |
| **Written Off** | Bad debt, not collectible |
| **Cancelled** | Invoice cancelled |

## Aging Buckets

| Bucket | Days Outstanding | Color Code |
|--------|-----------------|------------|
| **Current** | 0-30 days | Blue |
| **31-60** | 31-60 days | Yellow |
| **61-90** | 61-90 days | Orange |
| **Over 90** | 90+ days | Red |

## Best Practices

### 1. Set Payment Due Dates
When creating sales, always set a payment due date to enable proper aging tracking.

### 2. Regular Payment Recording
Record payments as soon as they're received to maintain accurate AR balances.

### 3. Monitor Aging Report
Review the aging summary regularly to identify overdue accounts.

### 4. Follow Up on Overdue Invoices
Contact customers with overdue balances promptly.

### 5. Use Reference Numbers
Always record check numbers or transaction IDs for payment tracking.

## Workflow Example

### Complete Sale and Collect Payment

1. **Create Sale**
   - Add customer, items, set payment due date
   - Save as draft

2. **Complete Sale**
   - Click "Complete Sale" in sales list
   - AR entry automatically created
   - Inventory deducted

3. **Receive Payment**
   - Navigate to AR module
   - Find invoice in list
   - Click "Record Payment"
   - Enter payment details
   - Submit

4. **Track Status**
   - View payment history
   - Monitor aging if partially paid
   - Invoice marked as paid when fully collected

## Reporting

### Available Reports

1. **Aging Summary**: Breakdown of receivables by age
2. **Outstanding Balance**: Total amount due by customer
3. **Payment History**: Complete transaction log
4. **Days Outstanding**: Average collection period

### Exporting Data

All AR data can be exported from Supabase for:
- Financial reporting
- Tax preparation
- Accounting software integration
- Custom analytics

## Troubleshooting

### AR Entry Not Created
- Ensure sale status is "completed"
- Check that sale has a valid customer
- Verify migration ran successfully

### Payment Not Recording
- Verify payment amount doesn't exceed amount due
- Check that AR ledger entry exists
- Ensure user has proper permissions

### Aging Not Updating
- Aging is calculated automatically based on invoice date
- Run `update_ar_overdue_status()` function to refresh overdue status

## Future Enhancements

Potential features to add:
- Email invoice reminders
- Automated overdue notifications
- Payment plans and installments
- Credit memos and adjustments
- Customer payment portals
- Integration with accounting software
- Batch payment processing
- Custom aging buckets

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify RLS policies are enabled
3. Ensure all migrations ran successfully
4. Review browser console for frontend errors

## Database Schema Reference

### AR Ledger Fields
- `id`: Unique identifier
- `user_id`: Owner of the record
- `sale_id`: Related sale
- `customer_id`: Related customer
- `invoice_number`: From sale_number
- `invoice_date`: From sale_date
- `due_date`: Payment due date
- `original_amount`: Total invoice amount
- `amount_paid`: Total payments received
- `amount_due`: Remaining balance
- `status`: Current status
- `days_outstanding`: Auto-calculated
- `aging_bucket`: Auto-calculated

### Payment History Fields
- `id`: Unique identifier
- `ar_ledger_id`: Related AR entry
- `user_id`: Owner of the record
- `payment_date`: When payment received
- `payment_amount`: Amount received
- `payment_method`: How paid
- `reference_number`: Check #, transaction ID
- `notes`: Additional information

---

**Version**: 1.0  
**Last Updated**: 2026-01-17  
**Module**: Accounts Receivable
