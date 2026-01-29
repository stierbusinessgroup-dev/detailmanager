-- Migration: Fix post_journal_entry to handle already-posted entries gracefully
-- This prevents the "Journal entry is already posted" error

CREATE OR REPLACE FUNCTION post_journal_entry(p_journal_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_debit_total DECIMAL(15, 2);
  v_credit_total DECIMAL(15, 2);
  v_line RECORD;
BEGIN
  -- Check if entry is already posted - if so, just return (don't throw error)
  IF EXISTS (SELECT 1 FROM journal_entries WHERE id = p_journal_entry_id AND is_posted = true) THEN
    RETURN; -- Entry already posted, nothing to do
  END IF;

  -- Validate that debits equal credits
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO v_debit_total, v_credit_total
  FROM journal_entry_lines
  WHERE journal_entry_id = p_journal_entry_id;

  IF v_debit_total != v_credit_total THEN
    RAISE EXCEPTION 'Debits (%) do not equal credits (%)', v_debit_total, v_credit_total;
  END IF;

  -- Update account balances
  FOR v_line IN 
    SELECT account_id, debit_amount, credit_amount
    FROM journal_entry_lines
    WHERE journal_entry_id = p_journal_entry_id
  LOOP
    UPDATE chart_of_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN normal_balance = 'debit' THEN v_line.debit_amount - v_line.credit_amount
        ELSE v_line.credit_amount - v_line.debit_amount
      END,
      updated_at = NOW()
    WHERE id = v_line.account_id;
  END LOOP;

  -- Mark entry as posted
  UPDATE journal_entries
  SET is_posted = true, updated_at = NOW()
  WHERE id = p_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'post_journal_entry function updated to handle already-posted entries gracefully';
END $$;
