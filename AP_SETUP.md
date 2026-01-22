# Accounts Payable (AP) Module Setup Guide

## Overview
The Accounts Payable (AP) module allows you to manage vendor bills, track payment obligations, upload invoice documents, and maintain a complete payment history. This module integrates seamlessly with the Vendors module to provide comprehensive vendor and payables management.

## Features
- **Bill Management**: Create and track vendor bills with invoice details
- **Invoice Upload**: Upload and store invoice documents (PDF, JPG, PNG)
- **Payment Tracking**: Record payments with multiple payment methods
- **Aging Reports**: View bills by aging buckets (current, 31-60, 61-90, over 90 days)
- **Payment History**: Complete audit trail of all payments made
- **Vendor Integration**: Seamlessly connects with vendor records and payment terms
- **Overdue Tracking**: Automatic identification of overdue bills

## Database Schema

### Tables Created
1. **vendors** - Stores vendor information with payment terms
2. **ap_ledger** - Tracks all vendor bills and their payment status
3. **ap_payment_history** - Records all payments made against bills

### Database Functions
- `create_ap_entry()` - Creates a new bill in the AP ledger
- `record_ap_payment()` - Records a payment against a bill
- `get_ap_aging_summary()` - Generates aging summary report
- `update_ap_overdue_status()` - Updates overdue status for all bills

## Setup Instructions

### 1. Run Database Migration
Execute the AP migration SQL file:
```bash
# Connect to your database and run:
psql -U your_username -d your_database -f migration_create_ap.sql
```

### 2. Set Up Storage Bucket
The AP module requires a Supabase storage bucket for invoice uploads:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `ap-invoices`
3. Set bucket to **private** (recommended for security)
4. Configure policies:

```sql
-- Allow authenticated users to upload their own invoices
CREATE POLICY "Users can upload their own invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ap-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own invoices
CREATE POLICY "Users can view their own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ap-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Configure Vendors
Before creating bills, set up your vendors:

1. Navigate to **Vendors** page
2. Click **+ Add Vendor**
3. Fill in vendor details:
   - Vendor name (required)
   - Contact information
   - Address details
   - Tax ID and account number
   - Payment terms (Net Days, Discount, etc.)
4. Save the vendor

## Using the AP Module

### Adding a New Bill

1. Navigate to **AP** (Accounts Payable) page
2. Click **+ Add Bill**
3. Fill in bill details:
   - **Vendor**: Select from dropdown
   - **Invoice Number**: Vendor's invoice number
   - **Amount**: Total bill amount
   - **Invoice Date**: Date on the invoice
   - **Due Date**: Payment due date
   - **Description**: Brief description (optional)
   - **Category**: Bill category (supplies, inventory, utilities, etc.)
   - **Payment Terms**: Terms for this specific bill (optional)
   - **Upload Invoice**: Attach invoice document (PDF, JPG, PNG - max 10MB)
   - **Notes**: Additional notes (optional)
4. Click **Add Bill**

### Recording a Payment

1. Find the bill in the AP ledger
2. Click **💰 Pay** button
3. Enter payment details:
   - **Payment Date**: Date payment was made
   - **Amount**: Payment amount (defaults to full remaining balance)
   - **Payment Method**: Check, ACH, Credit Card, etc.
   - **Reference Number**: Check number, transaction ID, etc.
   - **Notes**: Payment notes (optional)
4. Click **Record Payment**

The system will:
- Update the bill status (paid, partial, or open)
- Calculate remaining balance
- Record payment in history
- Update aging summary

### Viewing Payment History

1. Find the bill in the AP ledger
2. Click **📋 History** button
3. View all payments made against this bill:
   - Payment dates
   - Amounts paid
   - Payment methods
   - Reference numbers
   - Notes

### Viewing Invoice Documents

1. Find the bill with an uploaded invoice
2. Click **📄 View** in the File column
3. Invoice opens in a new browser tab

### Filtering Bills

Use the filter tabs to view specific bill types:
- **All Bills**: Shows all bills
- **Open**: Bills with outstanding balance (open or partial)
- **Overdue**: Bills past their due date
- **Paid**: Fully paid bills

### Understanding the Aging Summary

The aging summary dashboard shows:
- **Total Outstanding**: All unpaid bills
- **Current**: Bills not yet overdue
- **31-60 Days**: Bills 31-60 days past due
- **61-90 Days**: Bills 61-90 days past due
- **Over 90 Days**: Bills more than 90 days past due
- **Total Overdue**: Sum of all overdue bills

## Payment Terms Integration

The AP module integrates with vendor payment terms:

### Net Days
Example: Net 30
- Payment due 30 days after invoice date
- System automatically calculates due date

### Early Payment Discount
Example: 2/10 Net 30
- 2% discount if paid within 10 days
- Otherwise due in 30 days
- Displayed on bill for reference

### Specific Dates
Example: 1st, 15th
- Payment due on specific dates of the month
- Useful for vendors with set payment schedules

### Due on Receipt
- Payment due immediately upon receipt
- Due date same as invoice date

## Bill Categories

Organize bills by category:
- **Supplies**: Office and operational supplies
- **Inventory**: Product inventory purchases
- **Utilities**: Electricity, water, internet, etc.
- **Rent**: Facility rent payments
- **Insurance**: Insurance premiums
- **Equipment**: Equipment purchases or leases
- **Services**: Professional services
- **Other**: Miscellaneous expenses

## Payment Methods

Track how payments are made:
- **Check**: Paper check payments
- **ACH/Bank Transfer**: Electronic bank transfers
- **Credit Card**: Credit card payments
- **Debit Card**: Debit card payments
- **Cash**: Cash payments
- **Wire Transfer**: Wire transfers
- **Other**: Other payment methods

## Workflow Examples

### Example 1: Simple Bill Payment
1. Receive invoice from vendor for $500
2. Add bill: Vendor = "ABC Supplies", Amount = $500, Due Date = 30 days out
3. Upload invoice PDF
4. When ready to pay, click Pay button
5. Record payment: Amount = $500, Method = Check, Reference = Check #1234
6. Bill marked as paid

### Example 2: Partial Payment
1. Receive invoice for $1,000
2. Add bill with full amount
3. Make partial payment of $400
4. Bill status changes to "Partial"
5. Remaining balance shows $600
6. Later, pay remaining $600
7. Bill marked as paid

### Example 3: Early Payment Discount
1. Vendor offers 2/10 Net 30 terms
2. Add bill with payment terms noted
3. If paid within 10 days, manually calculate 2% discount
4. Record payment with discount amount
5. Add note explaining early payment discount taken

## Best Practices

### Bill Entry
- Enter bills as soon as invoices are received
- Always upload invoice documents for audit trail
- Use consistent invoice numbering from vendors
- Add descriptions to help identify bills later
- Categorize bills for better expense tracking

### Payment Recording
- Record payments promptly after making them
- Always include reference numbers (check #, transaction ID)
- Add notes for any special circumstances
- Verify amounts before recording
- Keep payment method information accurate

### Document Management
- Upload clear, readable invoice images
- Use PDF format when possible for best quality
- Keep file sizes reasonable (under 10MB)
- Name files consistently before upload
- Store original paper invoices as backup

### Vendor Management
- Keep vendor contact information current
- Update payment terms when they change
- Maintain accurate tax ID information
- Note account numbers for easy reference
- Mark inactive vendors to keep list clean

### Regular Maintenance
- Review aging report weekly
- Follow up on overdue bills
- Reconcile with accounting system monthly
- Archive paid bills periodically
- Update vendor information as needed

## Troubleshooting

### Invoice Upload Fails
- Check file size (must be under 10MB)
- Verify file format (PDF, JPG, PNG only)
- Ensure stable internet connection
- Try compressing large PDF files
- Check Supabase storage bucket configuration

### Payment Not Recording
- Verify bill is not already fully paid
- Check payment amount doesn't exceed remaining balance
- Ensure all required fields are filled
- Check database connection
- Review browser console for errors

### Aging Summary Not Updating
- Refresh the page
- Check that due dates are set correctly
- Verify database function is running
- Review bill statuses
- Check for database errors

### Vendor Not Appearing in Dropdown
- Verify vendor is marked as active
- Check vendor was saved successfully
- Refresh the page
- Verify user_id matches
- Check database connection

## Integration with Other Modules

### Vendors Module
- AP bills link to vendor records
- Payment terms flow from vendor to bills
- Vendor contact info available in AP
- Vendor status affects bill creation

### Future Integrations
- **Inventory**: Link bills to inventory purchases
- **Reporting**: Generate expense reports by category
- **Cash Flow**: Integrate with cash flow forecasting
- **Accounting**: Export to accounting software

## Security Considerations

- Invoice documents stored securely in private bucket
- User-specific access controls on all data
- Payment information encrypted in transit
- Audit trail maintained for all transactions
- Regular backups recommended

## Support and Maintenance

### Regular Tasks
- Weekly: Review aging report and overdue bills
- Monthly: Reconcile with bank statements
- Quarterly: Review vendor list and update as needed
- Annually: Archive old paid bills

### Data Backup
- Database automatically backed up by Supabase
- Download invoice documents periodically
- Export payment history for records
- Keep offline backup of critical bills

## Additional Resources

- Vendor Management Guide: See Vendors module documentation
- Payment Terms Guide: PAYMENT_TERMS_SETUP.md
- Database Schema: migration_create_ap.sql
- Component Code: AccountsPayable.jsx

## Conclusion

The AP module provides comprehensive accounts payable management with invoice upload capability, payment tracking, and vendor integration. By following this guide and best practices, you can maintain accurate records of all vendor bills and payments while keeping your payables organized and up-to-date.
