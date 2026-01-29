-- Migration: Fix GL Trigger Functions
-- This fixes the GL integration triggers to match actual AR/AP table structures

-- =====================================================
-- Fix AR Invoice Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION create_journal_entry_from_ar_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_journal_entry_id UUID;
  v_entry_number VARCHAR(50);
BEGIN
  -- Get GL settings
  SELECT * INTO v_settings FROM gl_settings WHERE user_id = NEW.user_id;
  
  IF v_settings IS NULL THEN
    RETURN NEW; -- Skip if GL not set up
  END IF;

  -- Generate entry number
  v_entry_number := 'AR-' || NEW.invoice_number;

  -- Create journal entry
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.invoice_date, 'AR Invoice: ' || NEW.invoice_number, 'ar_invoice', NEW.id, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Accounts Receivable (using original_amount from AR table)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ar_account_id, 'AR Invoice ' || NEW.invoice_number, NEW.original_amount, 0, 1);

  -- Credit: Sales Revenue
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.sales_revenue_account_id, 'Sales Revenue', 0, NEW.original_amount, 2);

  -- Update account balances immediately since we're posting
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Fix AR Payment Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION create_journal_entry_from_ar_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_journal_entry_id UUID;
  v_entry_number VARCHAR(50);
  v_ar_invoice RECORD;
BEGIN
  -- Get GL settings
  SELECT * INTO v_settings FROM gl_settings WHERE user_id = NEW.user_id;
  
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get AR invoice info
  SELECT * INTO v_ar_invoice FROM ar_ledger WHERE id = NEW.ar_ledger_id;

  -- Generate entry number
  v_entry_number := 'ARP-' || NEW.id::text;

  -- Create journal entry (using payment_amount from AR payment history)
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.payment_date, 'AR Payment: ' || v_ar_invoice.invoice_number, 'ar_payment', NEW.id, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Cash
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.cash_account_id, 'Payment received', NEW.payment_amount, 0, 1);

  -- Credit: Accounts Receivable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ar_account_id, 'AR Payment', 0, NEW.payment_amount, 2);

  -- Post the entry
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

  -- Create journal entry (using amount from AP ledger)
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.invoice_date, 'AP Bill: ' || NEW.invoice_number, 'ap_bill', NEW.id::uuid, true)
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

  -- Create journal entry (using amount_paid from AP payment history)
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.payment_date, 'AP Payment: ' || v_ap_bill.invoice_number, 'ap_payment', NEW.id::uuid, true)
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

-- =====================================================
-- Recreate Triggers (in case they need to be refreshed)
-- =====================================================
-- AR Invoice trigger
DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ar_invoice ON ar_ledger;
CREATE TRIGGER trigger_create_journal_entry_from_ar_invoice
  AFTER INSERT ON ar_ledger
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ar_invoice();

-- AR Payment trigger
DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ar_payment ON ar_payment_history;
CREATE TRIGGER trigger_create_journal_entry_from_ar_payment
  AFTER INSERT ON ar_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ar_payment();

-- AP Bill trigger
DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ap_bill ON ap_ledger;
CREATE TRIGGER trigger_create_journal_entry_from_ap_bill
  AFTER INSERT ON ap_ledger
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ap_bill();

-- AP Payment trigger
DROP TRIGGER IF EXISTS trigger_create_journal_entry_from_ap_payment ON ap_payment_history;
CREATE TRIGGER trigger_create_journal_entry_from_ap_payment
  AFTER INSERT ON ap_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION create_journal_entry_from_ap_payment();

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'GL trigger functions have been updated to match AR/AP table structures';
END $$;
