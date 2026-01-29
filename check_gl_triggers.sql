-- Diagnostic: Check if GL triggers and settings are properly configured

-- 1. Check if GL settings exist
SELECT 'GL Settings Check' as check_type, 
       CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status,
       COUNT(*) as count
FROM gl_settings;

-- 2. Check if triggers exist on ar_payment_history
SELECT 'AR Payment Trigger Check' as check_type,
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_create_journal_entry_from_ar_payment';

-- 3. Check if triggers exist on ap_payment_history
SELECT 'AP Payment Trigger Check' as check_type,
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_create_journal_entry_from_ap_payment';

-- 4. Check if triggers exist on ar_ledger
SELECT 'AR Invoice Trigger Check' as check_type,
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_create_journal_entry_from_ar_invoice';

-- 5. Check if triggers exist on ap_ledger
SELECT 'AP Bill Trigger Check' as check_type,
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_create_journal_entry_from_ap_bill';

-- 6. Check recent AR payment history entries
SELECT 'Recent AR Payments' as check_type,
       id,
       payment_date,
       payment_amount,
       created_at
FROM ar_payment_history
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check recent journal entries
SELECT 'Recent Journal Entries' as check_type,
       entry_number,
       entry_date,
       description,
       reference_type,
       is_posted,
       created_at
FROM journal_entries
ORDER BY created_at DESC
LIMIT 10;

-- 8. Check if chart of accounts has data
SELECT 'Chart of Accounts Check' as check_type,
       COUNT(*) as account_count
FROM chart_of_accounts;

-- 9. Verify GL settings account mappings
SELECT 'GL Settings Account Mappings' as check_type,
       (SELECT account_number FROM chart_of_accounts WHERE id = ar_account_id) as ar_account,
       (SELECT account_number FROM chart_of_accounts WHERE id = ap_account_id) as ap_account,
       (SELECT account_number FROM chart_of_accounts WHERE id = cash_account_id) as cash_account,
       (SELECT account_number FROM chart_of_accounts WHERE id = sales_revenue_account_id) as revenue_account
FROM gl_settings
LIMIT 1;
