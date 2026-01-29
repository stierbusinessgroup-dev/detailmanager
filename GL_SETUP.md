# General Ledger (GL) Module Setup Guide

## Overview
The General Ledger (GL) module is the central accounting system for DetailManager. It automatically integrates with Accounts Receivable (AR), Accounts Payable (AP), and Sales/Invoicing to maintain a complete double-entry bookkeeping system.

## Features

### Core Functionality
- **Chart of Accounts**: Manage all asset, liability, equity, revenue, and expense accounts
- **Journal Entries**: Create manual journal entries with automatic debit/credit validation
- **Trial Balance**: Real-time trial balance reporting
- **Account Ledgers**: Detailed transaction history for each account
- **Automatic Integration**: AR, AP, and Sales transactions automatically create GL entries

### Account Types Supported
- **Assets**: Cash, Accounts Receivable, Inventory, Equipment, etc.
- **Liabilities**: Accounts Payable, Sales Tax Payable, Credit Cards, etc.
- **Equity**: Owner's Equity, Retained Earnings
- **Revenue**: Sales Revenue, Service Revenue
- **Expenses**: COGS, Operating Expenses, Utilities, Rent, etc.
- **Contra Accounts**: Accumulated Depreciation, Sales Discounts

## Database Setup

### 1. Run the Migration
Execute the GL migration in your Supabase SQL Editor:

```sql
-- Run this file: migration_create_gl.sql
```

This creates:
- `chart_of_accounts` table
- `journal_entries` table
- `journal_entry_lines` table
- `gl_settings` table
- Database functions for posting entries and generating reports
- Automatic triggers for AR/AP integration

### 2. Initialize Default Chart of Accounts
The system automatically initializes a default chart of accounts when you first access the GL module. This includes:

**Assets (1000-1999)**
- 1000: Cash
- 1100: Accounts Receivable
- 1200: Inventory
- 1500: Equipment
- 1510: Accumulated Depreciation - Equipment

**Liabilities (2000-2999)**
- 2000: Accounts Payable
- 2100: Sales Tax Payable
- 2200: Credit Card Payable

**Equity (3000-3999)**
- 3000: Owner Equity
- 3100: Retained Earnings

**Revenue (4000-4999)**
- 4000: Sales Revenue
- 4100: Service Revenue
- 4900: Sales Discounts

**Expenses (5000-6999)**
- 5000: Cost of Goods Sold
- 6000: Operating Expenses
- 6100: Supplies Expense
- 6200: Utilities Expense
- 6300: Rent Expense
- 6400: Insurance Expense
- 6500: Wages Expense

## Usage Guide

### Accessing the GL Module
1. Navigate to the GL module via the navigation menu (GL link)
2. The system will automatically initialize if this is your first time
3. Three main tabs are available:
   - **Chart of Accounts**: Manage your accounts
   - **Journal Entries**: View and create journal entries
   - **Trial Balance**: View current account balances

### Managing Chart of Accounts

#### Adding a New Account
1. Click the "**+ Add Account**" button
2. Fill in the required fields:
   - **Account Number**: Unique identifier (e.g., 6600)
   - **Account Name**: Descriptive name (e.g., "Marketing Expense")
   - **Account Type**: Select from dropdown
   - **Normal Balance**: Automatically set based on type
   - **Account Subtype**: Optional categorization
   - **Description**: Optional details
   - **Active**: Check to make account active
3. Click "**Create Account**"

#### Editing an Account
1. Click the ✏️ (Edit) button next to the account
2. Modify the desired fields
3. Click "**Update Account**"

**Note**: System accounts (created during initialization) cannot be deleted to maintain data integrity.

#### Viewing Account Ledger
1. Click the 📊 (Ledger) button next to any account
2. View all transactions affecting that account
3. See running balance after each transaction

### Creating Manual Journal Entries

#### When to Create Manual Entries
- Depreciation entries
- Adjusting entries
- Corrections
- Transfers between accounts
- Any transaction not automatically created by AR/AP/Sales

#### Creating an Entry
1. Go to the "**Journal Entries**" tab
2. Click "**+ New Journal Entry**"
3. Fill in:
   - **Entry Date**: Transaction date
   - **Description**: Purpose of the entry
   - **Notes**: Optional additional information
4. Add journal entry lines:
   - Select the **Account** from dropdown
   - Enter **Description** for the line
   - Enter either **Debit** or **Credit** amount (not both)
   - Click "**+ Add Line**" to add more lines
5. Ensure **Debits = Credits** (shown at bottom of form)
6. Click "**Create & Post Entry**"

**Important**: The system validates that total debits equal total credits before posting.

### Viewing Trial Balance
1. Go to the "**Trial Balance**" tab
2. View all active accounts with their current balances
3. Verify that total debits equal total credits
4. Click "🔄 Refresh" to update balances

## Automatic GL Integration

### AR (Accounts Receivable) Integration

#### When AR Invoice is Created
**Automatic Journal Entry:**
```
Debit:  Accounts Receivable (1100)    $XXX.XX
Credit: Sales Revenue (4000)          $XXX.XX
```

#### When AR Payment is Received
**Automatic Journal Entry:**
```
Debit:  Cash (1000)                   $XXX.XX
Credit: Accounts Receivable (1100)    $XXX.XX
```

### AP (Accounts Payable) Integration

#### When AP Bill is Created
**Automatic Journal Entry:**
```
Debit:  Expense Account (6XXX)        $XXX.XX
Credit: Accounts Payable (2000)       $XXX.XX
```

The expense account is automatically determined based on bill category:
- Supplies → 6100 (Supplies Expense)
- Utilities → 6200 (Utilities Expense)
- Rent → 6300 (Rent Expense)
- Insurance → 6400 (Insurance Expense)
- Other → 6000 (Operating Expenses)

#### When AP Payment is Made
**Automatic Journal Entry:**
```
Debit:  Accounts Payable (2000)       $XXX.XX
Credit: Cash (1000)                   $XXX.XX
```

### Sales/Invoicing Integration
Sales are integrated through the AR module. When a sale is completed:
1. AR invoice is created
2. AR invoice triggers GL entry (as shown above)

## Account Mapping Configuration

The `gl_settings` table stores account mappings used for automatic entries:
- **ar_account_id**: Accounts Receivable account
- **ap_account_id**: Accounts Payable account
- **cash_account_id**: Cash/Bank account
- **sales_revenue_account_id**: Sales Revenue account
- **sales_tax_payable_account_id**: Sales Tax Payable account
- **inventory_account_id**: Inventory account
- **cogs_account_id**: Cost of Goods Sold account
- **expense_default_account_id**: Default expense account

These are automatically configured during initialization but can be customized if needed.

## Workflow Examples

### Example 1: Recording a Sale
1. **User Action**: Complete a sale in Sales module
2. **System Action**: Creates AR invoice
3. **GL Action**: Automatically creates journal entry:
   ```
   Entry: AR-INV-001
   Debit:  Accounts Receivable    $500.00
   Credit: Sales Revenue          $500.00
   ```

### Example 2: Receiving Payment
1. **User Action**: Record payment in AR module
2. **GL Action**: Automatically creates journal entry:
   ```
   Entry: ARP-[payment-id]
   Debit:  Cash                   $500.00
   Credit: Accounts Receivable    $500.00
   ```

### Example 3: Paying a Vendor Bill
1. **User Action**: Add bill in AP module
2. **GL Action**: Creates journal entry:
   ```
   Entry: AP-BILL-001
   Debit:  Supplies Expense       $200.00
   Credit: Accounts Payable       $200.00
   ```
3. **User Action**: Record payment in AP module
4. **GL Action**: Creates journal entry:
   ```
   Entry: APP-[payment-id]
   Debit:  Accounts Payable       $200.00
   Credit: Cash                   $200.00
   ```

### Example 4: Manual Depreciation Entry
1. **User Action**: Create manual journal entry
2. **Entry Details**:
   ```
   Date: 2026-01-31
   Description: Monthly depreciation
   
   Debit:  Depreciation Expense (6XXX)              $100.00
   Credit: Accumulated Depreciation - Equipment     $100.00
   ```
3. **GL Action**: Posts entry and updates account balances

## Reports and Analysis

### Trial Balance
- Shows all accounts with debit/credit balances
- Verifies accounting equation: Assets = Liabilities + Equity
- Use for month-end verification

### Account Ledger
- Detailed transaction history for any account
- Shows running balance
- Useful for account reconciliation

### Future Enhancements (Planned)
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- Account reconciliation tools
- Budget vs. Actual reporting
- Multi-period comparisons

## Best Practices

### 1. Regular Reconciliation
- Review trial balance monthly
- Reconcile cash accounts with bank statements
- Verify AR and AP balances match subsidiary ledgers

### 2. Consistent Account Usage
- Use the same accounts for similar transactions
- Don't create duplicate accounts
- Follow standard account numbering conventions

### 3. Descriptive Entries
- Always include clear descriptions
- Reference source documents
- Add notes for unusual transactions

### 4. Period-End Procedures
- Create adjusting entries before closing period
- Review all account balances
- Ensure trial balance balances

### 5. Backup and Audit Trail
- All entries are automatically timestamped
- Posted entries cannot be modified (create reversing entry instead)
- System maintains complete audit trail

## Troubleshooting

### Trial Balance Doesn't Balance
**Cause**: Unposted journal entries or data corruption
**Solution**: 
1. Check for unposted entries
2. Verify all automatic integrations are working
3. Review recent manual entries

### Account Balance Incorrect
**Cause**: Missing or duplicate transactions
**Solution**:
1. View account ledger
2. Compare with source documents (AR, AP, Sales)
3. Create adjusting entry if needed

### Cannot Delete Account
**Cause**: Account is a system account or has transactions
**Solution**:
- System accounts cannot be deleted
- Mark account as inactive instead
- Create new account if needed

### Automatic Entries Not Creating
**Cause**: GL settings not configured or triggers disabled
**Solution**:
1. Check gl_settings table has mappings
2. Verify triggers are enabled in database
3. Re-run initialization if needed

### Debits Don't Equal Credits Error
**Cause**: Journal entry lines don't balance
**Solution**:
1. Review all line amounts
2. Ensure each line has either debit OR credit (not both)
3. Verify totals match before posting

## Integration Points

### Complete Data Flow
```
Sales → AR Invoice → GL Entry (DR: AR, CR: Revenue)
AR Payment → GL Entry (DR: Cash, CR: AR)
AP Bill → GL Entry (DR: Expense, CR: AP)
AP Payment → GL Entry (DR: AP, CR: Cash)
Manual Entry → GL Entry (User-defined)
```

### Database Tables Involved
- `sales` → `ar_ledger` → `journal_entries` → `journal_entry_lines` → `chart_of_accounts`
- `ap_ledger` → `journal_entries` → `journal_entry_lines` → `chart_of_accounts`
- `ar_payment_history` → `journal_entries` → `journal_entry_lines` → `chart_of_accounts`
- `ap_payment_history` → `journal_entries` → `journal_entry_lines` → `chart_of_accounts`

## Security and Permissions

### Row Level Security (RLS)
- All GL tables have RLS enabled
- Users can only view/edit their own data
- System accounts protected from deletion

### Data Integrity
- Posted entries cannot be modified
- Account balances automatically calculated
- Debit/credit validation enforced
- Referential integrity maintained

## Support and Maintenance

### Regular Tasks
- Monthly trial balance review
- Quarterly account reconciliation
- Annual closing procedures
- Periodic backup verification

### Future Development
- Financial statement generation
- Budget management
- Multi-currency support
- Advanced reporting and analytics
- Account reconciliation module
- Automated closing procedures

## Conclusion

The General Ledger module provides a complete double-entry accounting system integrated seamlessly with your AR, AP, and Sales operations. All transactions are automatically recorded, maintaining accurate financial records with minimal manual intervention.

For questions or issues, refer to this guide or check the application logs for detailed error messages.
