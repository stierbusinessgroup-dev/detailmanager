# Invoice System Documentation

## Overview

The DetailManager invoice system allows you to create professional, printable invoices from completed sales. Invoices can be viewed on-screen, printed directly, or exported as PDF files for email or record-keeping.

## Features

### 📄 Professional Invoice Design
- Clean, professional layout optimized for printing
- Company branding with business name, address, and contact info
- Customer billing information
- Itemized line items with quantities and pricing
- Automatic calculation of subtotals, taxes, discounts, and totals
- Payment terms and due dates
- Custom notes section

### 🖨️ Multiple Export Options
- **Print**: Direct printing via browser print dialog
- **PDF Download**: Export as PDF file for emailing or archiving
- **On-Screen Preview**: View invoice before printing/exporting

### 🎨 Print-Optimized Styling
- Professional fonts and spacing
- High-contrast colors for clarity
- Proper page breaks for multi-page invoices
- Print-safe color adjustments
- Responsive design for different screen sizes

## How to Use

### 1. Complete a Sale

Before you can create an invoice, you need to have a completed sale:

1. Navigate to **Sales** page
2. Click **+ New Sale**
3. Fill in customer information and add line items
4. Click **Save as Draft**
5. Click **Complete Sale** button in the Actions column

### 2. View Invoice

Once a sale is completed:

1. Find the completed sale in the sales list
2. Click the **📄 View Invoice** button in the Actions column
3. The invoice viewer will open in a modal overlay

### 3. Print or Export

From the invoice viewer, you have three options:

#### Print Invoice
1. Click the **🖨️ Print** button
2. Your browser's print dialog will open
3. Select your printer or "Save as PDF" option
4. Adjust print settings if needed
5. Click Print

#### Download as PDF
1. Click the **📄 Download PDF** button
2. Wait for the PDF to generate (a few seconds)
3. The PDF will automatically download to your Downloads folder
4. File name format: `Invoice-[INVOICE_NUMBER].pdf`

#### Close Viewer
- Click the **✕** button to close without printing
- Click outside the modal to close

## Invoice Data Structure

### Invoice Information
- **Invoice Number**: Automatically generated from sale number
- **Invoice Date**: Date of the sale
- **Due Date**: Payment due date (if specified)
- **Status**: Current status (Draft, Completed, Paid, etc.)

### Business Information
The invoice pulls your business information from your profile:
- Business Name
- Phone Number
- Address
- Email Address

**To update business info:**
1. Go to your Profile/Settings page
2. Update business_name, phone, and address fields
3. Changes will appear on all future invoices

### Customer Information
- Customer Name
- Company (if applicable)
- Address
- City, State, ZIP
- Email
- Phone

### Line Items
Each line item includes:
- Description (Service or Product name)
- Details (Service/Product type)
- Quantity
- Unit Price
- Total Amount

### Financial Summary
- **Subtotal**: Sum of all line items
- **Discount**: Any discount applied
- **Tax**: Tax amount based on tax rate
- **Total**: Final amount due

## Technical Details

### Components

#### Invoice.jsx
The main invoice component that renders the invoice layout:
- Displays all invoice information
- Formats currency and dates
- Handles responsive design
- Optimized for print media

#### InvoiceViewer.jsx
Modal wrapper for the invoice with export controls:
- Manages print functionality via `react-to-print`
- Handles PDF generation via `jspdf` and `html2canvas`
- Provides user controls (Print, Download, Close)
- Shows loading states during PDF generation

### Dependencies

The invoice system uses the following libraries:

```json
{
  "react-to-print": "Print functionality",
  "jspdf": "PDF generation",
  "html2canvas": "HTML to canvas conversion for PDF"
}
```

### Database Integration

Invoices are generated from completed sales data:
- Sale information from `sales` table
- Line items from `sale_items` table
- Customer data from `customers` table
- Business info from `profiles` table

No separate invoice table is needed - invoices are generated on-demand from existing sale data.

## Customization

### Styling

Invoice styles are defined in `src/components/Invoice.css`:

- **Colors**: Modify color scheme by changing hex values
- **Fonts**: Update font-family properties
- **Spacing**: Adjust padding and margins
- **Logo**: Add company logo by modifying the header section

### Layout

To customize the invoice layout:

1. Edit `src/components/Invoice.jsx`
2. Modify the JSX structure
3. Update corresponding CSS in `Invoice.css`
4. Test print output to ensure changes look good

### Payment Terms

Default payment terms can be customized:
- Edit the `paymentTerms` logic in `Sales.jsx` `handleViewInvoice` function
- Add custom payment terms field to sale form
- Store custom terms in the sales table

## Best Practices

### For Best Print Quality

1. **Use Chrome or Edge**: These browsers have the best print rendering
2. **Check Print Preview**: Always preview before printing
3. **Adjust Margins**: Use browser print settings to adjust margins if needed
4. **Print to PDF First**: Generate PDF first to verify layout before physical printing

### For Professional Invoices

1. **Complete Business Profile**: Ensure all business information is filled out
2. **Add Payment Terms**: Specify clear payment due dates
3. **Include Notes**: Add relevant notes for customers
4. **Use Consistent Numbering**: Sale numbers become invoice numbers

### For Record Keeping

1. **Download PDFs**: Save PDF copies of all invoices
2. **Organize by Date**: Use invoice date for filing
3. **Link to AR**: Invoices are automatically linked to AR ledger entries
4. **Track Payments**: Use AR module to track invoice payments

## Troubleshooting

### PDF Generation Issues

**Problem**: PDF download fails or looks incorrect

**Solutions**:
- Use the Print option instead and save as PDF from print dialog
- Ensure browser is up to date
- Try a different browser (Chrome recommended)
- Check browser console for errors

### Missing Business Information

**Problem**: Business info shows as "Your Business" or is blank

**Solution**:
- Update your profile with business_name, phone, and address
- Refresh the page after updating profile
- Check that profile fields are saved in database

### Invoice Not Showing

**Problem**: "View Invoice" button doesn't appear

**Solution**:
- Ensure sale status is "completed" (not "draft")
- Complete the sale using the "Complete Sale" button
- Refresh the sales list

### Print Layout Issues

**Problem**: Invoice doesn't fit on one page or has layout issues

**Solutions**:
- Adjust browser print settings (margins, scale)
- Use landscape orientation for wide invoices
- Modify CSS print styles in `Invoice.css`
- Reduce font sizes or padding in print media query

## Workflow Example

### Complete Sales-to-Invoice Workflow

1. **Create Sale**
   - Add customer
   - Add services/products
   - Set tax rate and discount
   - Add payment due date
   - Save as draft

2. **Complete Sale**
   - Review sale details
   - Click "Complete Sale"
   - Inventory is committed
   - AR entry is created
   - Sale status changes to "completed"

3. **Generate Invoice**
   - Click "View Invoice" button
   - Review invoice details
   - Download PDF or print

4. **Send to Customer**
   - Email PDF to customer
   - Or print and mail physical copy

5. **Track Payment**
   - Go to Accounts Receivable page
   - Find invoice in AR ledger
   - Record payments as received
   - Invoice status updates automatically

## Future Enhancements

Potential features for future development:

- [ ] Custom invoice templates
- [ ] Company logo upload
- [ ] Email invoice directly to customer
- [ ] Invoice customization settings
- [ ] Multiple currency support
- [ ] Invoice history and archive
- [ ] Batch invoice generation
- [ ] Invoice reminders and notifications
- [ ] Custom invoice numbering schemes
- [ ] Multi-page invoice support

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check browser console for errors
4. Verify database data is correct

## Related Documentation

- [AR_SETUP.md](./AR_SETUP.md) - Accounts Receivable setup and usage
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database configuration
- [README.md](./README.md) - General application overview
