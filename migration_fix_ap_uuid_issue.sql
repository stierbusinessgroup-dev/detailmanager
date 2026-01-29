-- Migration: Fix AP UUID Casting Issue
-- The ap_ledger and ap_payment_history tables use INTEGER IDs (SERIAL)
-- But journal_entries.reference_id is UUID
-- We need to either change reference_id to TEXT or generate UUIDs for AP tables

-- Option 1: Change journal_entries.reference_id to TEXT (simpler, recommended)
-- This allows storing both UUIDs (for AR) and integers (for AP)

ALTER TABLE journal_entries 
ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;

-- Now update the GL trigger functions to use TEXT instead of UUID casting

-- =====================================================
-- Fix AP Bill Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION create_journal_entry_from_ap_bill()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_journal_entry_id UUID;
  v_entry_number VARCHAR(50);
  v_expense_account_id UUID;
BEGIN
  -- Get GL settings
  SELECT * INTO v_settings FROM gl_settings WHERE user_id = NEW.user_id;
  
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine expense account based on category
  v_expense_account_id := CASE NEW.category
    WHEN 'supplies' THEN (SELECT id FROM chart_of_accounts WHERE user_id = NEW.user_id AND account_number = '6100')
    WHEN 'utilities' THEN (SELECT id FROM chart_of_accounts WHERE user_id = NEW.user_id AND account_number = '6200')
    WHEN 'rent' THEN (SELECT id FROM chart_of_accounts WHERE user_id = NEW.user_id AND account_number = '6300')
    WHEN 'insurance' THEN (SELECT id FROM chart_of_accounts WHERE user_id = NEW.user_id AND account_number = '6400')
    ELSE v_settings.expense_default_account_id
  END;

  -- If no specific account found, use default
  IF v_expense_account_id IS NULL THEN
    v_expense_account_id := v_settings.expense_default_account_id;
  END IF;

  -- Generate entry number
  v_entry_number := 'AP-' || NEW.invoice_number;

  -- Create journal entry (using TEXT for reference_id)
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.invoice_date, 'AP Bill: ' || NEW.invoice_number, 'ap_bill', NEW.id::text, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Expense Account
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_expense_account_id, COALESCE(NEW.description, 'Vendor expense'), NEW.amount, 0, 1);

  -- Credit: Accounts Payable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ap_account_id, 'AP Bill ' || NEW.invoice_number, 0, NEW.amount, 2);

  -- Post the entry
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Fix AP Payment Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION create_journal_entry_from_ap_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_journal_entry_id UUID;
  v_entry_number VARCHAR(50);
  v_ap_bill RECORD;
BEGIN
  -- Get GL settings
  SELECT * INTO v_settings FROM gl_settings WHERE user_id = NEW.user_id;
  
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get AP bill info
  SELECT * INTO v_ap_bill FROM ap_ledger WHERE id = NEW.ap_ledger_id;

  -- Generate entry number
  v_entry_number := 'APP-' || NEW.id::text;

  -- Create journal entry (using TEXT for reference_id)
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.payment_date, 'AP Payment: ' || v_ap_bill.invoice_number, 'ap_payment', NEW.id::text, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Accounts Payable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ap_account_id, 'AP Payment', NEW.amount_paid, 0, 1);

  -- Credit: Cash
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.cash_account_id, 'Payment made', 0, NEW.amount_paid, 2);

  -- Post the entry
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ap_bill ON ap_ledger;
CREATE TRIGGER trigger_create_journal_entry_from_ap_bill
  AFTER INSERT ON ap_ledger
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ap_bill();

DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ap_payment ON ap_payment_history;
CREATE TRIGGER trigger_create_journal_entry_from_ap_payment
  AFTER INSERT ON ap_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ap_payment();

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'AP UUID casting issue fixed - reference_id changed to TEXT';
END $$;
