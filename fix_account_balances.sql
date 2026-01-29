-- Fix: Recalculate all account balances from journal entries
-- This will update the current_balance field for all accounts based on posted journal entries

-- First, let's see what journal entries exist
SELECT 
  je.entry_number,
  je.entry_date,
  je.description,
  je.is_posted,
  jel.account_id,
  coa.account_number,
  coa.account_name,
  jel.debit_amount,
  jel.credit_amount
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON coa.id = jel.account_id
ORDER BY je.created_at DESC
LIMIT 20;

-- Check current account balances
SELECT 
  account_number,
  account_name,
  account_type,
  normal_balance,
  current_balance
FROM chart_of_accounts
ORDER BY account_number;

-- Now let's recalculate all balances from scratch
-- This function will reset and recalculate all account balances

DO $$
DECLARE
  v_account RECORD;
  v_balance DECIMAL(15, 2);
BEGIN
  -- For each account, calculate balance from journal entries
  FOR v_account IN 
    SELECT id, account_number, account_name, normal_balance 
    FROM chart_of_accounts
  LOOP
    -- Calculate balance based on normal balance type
    IF v_account.normal_balance = 'debit' THEN
      -- Debit accounts: debits increase, credits decrease
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
      INTO v_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_account.id
        AND je.is_posted = true;
    ELSE
      -- Credit accounts: credits increase, debits decrease
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      INTO v_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_account.id
        AND je.is_posted = true;
    END IF;
    
    -- Update the account balance
    UPDATE chart_of_accounts
    SET current_balance = v_balance,
        updated_at = NOW()
    WHERE id = v_account.id;
    
    RAISE NOTICE 'Updated % (%) - Balance: %', v_account.account_number, v_account.account_name, v_balance;
  END LOOP;
  
  RAISE NOTICE 'All account balances recalculated successfully!';
END $$;

-- Verify the updated balances
SELECT 
  account_number,
  account_name,
  account_type,
  normal_balance,
  current_balance
FROM chart_of_accounts
WHERE current_balance != 0
ORDER BY account_number;

-- Show trial balance
SELECT * FROM get_trial_balance(auth.uid());
