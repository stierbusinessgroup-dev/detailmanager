-- Check if AP payment created a GL entry

-- 1. Check if the AP payment trigger exists and is enabled
SELECT 
  'AP Payment Trigger Status' as check_type,
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'trigger_create_journal_entry_from_ap_payment';

-- 2. Check the recent AP payment (ID 4)
SELECT 
  'AP Payment Record' as check_type,
  id,
  ap_ledger_id,
  payment_date,
  amount_paid,
  created_at
FROM ap_payment_history
WHERE id = 4;

-- 3. Check if a journal entry was created for this payment
SELECT 
  'Journal Entry for AP Payment' as check_type,
  id,
  entry_number,
  entry_date,
  description,
  reference_type,
  reference_id,
  is_posted,
  created_at
FROM journal_entries
WHERE reference_type = 'ap_payment'
  AND reference_id = '4';

-- 4. If journal entry exists, show the lines
SELECT 
  'Journal Entry Lines' as check_type,
  jel.id,
  coa.account_number,
  coa.account_name,
  jel.description,
  jel.debit_amount,
  jel.credit_amount
FROM journal_entry_lines jel
JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE jel.journal_entry_id IN (
  SELECT id FROM journal_entries 
  WHERE reference_type = 'ap_payment' 
  AND reference_id = '4'
);

-- 5. Check all journal entries created today
SELECT 
  'All Journal Entries Today' as check_type,
  entry_number,
  entry_date,
  description,
  reference_type,
  reference_id,
  is_posted,
  created_at
FROM journal_entries
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 6. Check current account balances
SELECT 
  'Current Account Balances' as check_type,
  account_number,
  account_name,
  current_balance
FROM chart_of_accounts
WHERE account_number IN ('1000', '2000')
ORDER BY account_number;
