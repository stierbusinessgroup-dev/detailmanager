-- Migration: Create General Ledger (GL) Module
-- This creates the chart of accounts, journal entries, and integrations with AR, AP, and Sales

-- =====================================================
-- 1. Chart of Accounts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_liability')),
  account_subtype VARCHAR(100),
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  current_balance DECIMAL(15, 2) DEFAULT 0.00,
  is_system_account BOOLEAN DEFAULT false, -- System accounts cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_number)
);

-- =====================================================
-- 2. Journal Entries Table
-- =====================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number VARCHAR(50),
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- 'manual', 'ar_invoice', 'ar_payment', 'ap_bill', 'ap_payment', 'sale'
  reference_id UUID, -- Links to ar_ledger, ap_ledger, sales, etc.
  is_posted BOOLEAN DEFAULT false,
  is_reversed BOOLEAN DEFAULT false,
  reversed_by UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. Journal Entry Lines Table
-- =====================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  debit_amount DECIMAL(15, 2) DEFAULT 0.00,
  credit_amount DECIMAL(15, 2) DEFAULT 0.00,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- =====================================================
-- 4. GL Settings Table (for account mappings)
-- =====================================================
CREATE TABLE IF NOT EXISTS gl_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- AR Accounts
  ar_account_id UUID REFERENCES chart_of_accounts(id),
  sales_revenue_account_id UUID REFERENCES chart_of_accounts(id),
  sales_tax_payable_account_id UUID REFERENCES chart_of_accounts(id),
  sales_discount_account_id UUID REFERENCES chart_of_accounts(id),
  -- AP Accounts
  ap_account_id UUID REFERENCES chart_of_accounts(id),
  expense_default_account_id UUID REFERENCES chart_of_accounts(id),
  -- Cash/Bank Accounts
  cash_account_id UUID REFERENCES chart_of_accounts(id),
  -- Inventory
  inventory_account_id UUID REFERENCES chart_of_accounts(id),
  cogs_account_id UUID REFERENCES chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. Create Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_coa_user_id ON chart_of_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_coa_account_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_account_number ON chart_of_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- =====================================================
-- 6. Enable Row Level Security
-- =====================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. Create RLS Policies
-- =====================================================
-- Chart of Accounts Policies
CREATE POLICY "Users can view their own chart of accounts"
  ON chart_of_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON chart_of_accounts FOR UPDATE
  USING (auth.uid() = user_id AND is_system_account = false);

CREATE POLICY "Users can delete their own non-system accounts"
  ON chart_of_accounts FOR DELETE
  USING (auth.uid() = user_id AND is_system_account = false);

-- Journal Entries Policies
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unposted journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id AND is_posted = false);

CREATE POLICY "Users can delete their own unposted journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id AND is_posted = false);

-- Journal Entry Lines Policies
CREATE POLICY "Users can view their own journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM journal_entries 
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id 
    AND journal_entries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert journal entry lines"
  ON journal_entry_lines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM journal_entries 
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id 
    AND journal_entries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own journal entry lines"
  ON journal_entry_lines FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM journal_entries 
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id 
    AND journal_entries.user_id = auth.uid()
    AND journal_entries.is_posted = false
  ));

CREATE POLICY "Users can delete their own journal entry lines"
  ON journal_entry_lines FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM journal_entries 
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id 
    AND journal_entries.user_id = auth.uid()
    AND journal_entries.is_posted = false
  ));

-- GL Settings Policies
CREATE POLICY "Users can view their own GL settings"
  ON gl_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GL settings"
  ON gl_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GL settings"
  ON gl_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 8. Function: Initialize Default Chart of Accounts
-- =====================================================
CREATE OR REPLACE FUNCTION initialize_default_chart_of_accounts(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Assets
  INSERT INTO chart_of_accounts (user_id, account_number, account_name, account_type, normal_balance, is_system_account) VALUES
  (p_user_id, '1000', 'Cash', 'asset', 'debit', true),
  (p_user_id, '1100', 'Accounts Receivable', 'asset', 'debit', true),
  (p_user_id, '1200', 'Inventory', 'asset', 'debit', true),
  (p_user_id, '1500', 'Equipment', 'asset', 'debit', true),
  (p_user_id, '1510', 'Accumulated Depreciation - Equipment', 'contra_asset', 'credit', true);

  -- Liabilities
  INSERT INTO chart_of_accounts (user_id, account_number, account_name, account_type, normal_balance, is_system_account) VALUES
  (p_user_id, '2000', 'Accounts Payable', 'liability', 'credit', true),
  (p_user_id, '2100', 'Sales Tax Payable', 'liability', 'credit', true),
  (p_user_id, '2200', 'Credit Card Payable', 'liability', 'credit', true);

  -- Equity
  INSERT INTO chart_of_accounts (user_id, account_number, account_name, account_type, normal_balance, is_system_account) VALUES
  (p_user_id, '3000', 'Owner Equity', 'equity', 'credit', true),
  (p_user_id, '3100', 'Retained Earnings', 'equity', 'credit', true);

  -- Revenue
  INSERT INTO chart_of_accounts (user_id, account_number, account_name, account_type, normal_balance, is_system_account) VALUES
  (p_user_id, '4000', 'Sales Revenue', 'revenue', 'credit', true),
  (p_user_id, '4100', 'Service Revenue', 'revenue', 'credit', true),
  (p_user_id, '4900', 'Sales Discounts', 'revenue', 'debit', true);

  -- Expenses
  INSERT INTO chart_of_accounts (user_id, account_number, account_name, account_type, normal_balance, is_system_account) VALUES
  (p_user_id, '5000', 'Cost of Goods Sold', 'expense', 'debit', true),
  (p_user_id, '6000', 'Operating Expenses', 'expense', 'debit', true),
  (p_user_id, '6100', 'Supplies Expense', 'expense', 'debit', true),
  (p_user_id, '6200', 'Utilities Expense', 'expense', 'debit', true),
  (p_user_id, '6300', 'Rent Expense', 'expense', 'debit', true),
  (p_user_id, '6400', 'Insurance Expense', 'expense', 'debit', true),
  (p_user_id, '6500', 'Wages Expense', 'expense', 'debit', true);

  -- Initialize GL Settings with default account mappings
  INSERT INTO gl_settings (user_id, ar_account_id, ap_account_id, cash_account_id, sales_revenue_account_id, sales_tax_payable_account_id, inventory_account_id, cogs_account_id)
  SELECT 
    p_user_id,
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '1100'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '2000'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '1000'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '4000'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '2100'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '1200'),
    (SELECT id FROM chart_of_accounts WHERE user_id = p_user_id AND account_number = '5000');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Function: Post Journal Entry
-- =====================================================
CREATE OR REPLACE FUNCTION post_journal_entry(p_journal_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_debit_total DECIMAL(15, 2);
  v_credit_total DECIMAL(15, 2);
  v_line RECORD;
BEGIN
  -- Check if entry is already posted
  IF EXISTS (SELECT 1 FROM journal_entries WHERE id = p_journal_entry_id AND is_posted = true) THEN
    RAISE EXCEPTION 'Journal entry is already posted';
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

-- =====================================================
-- 10. Function: Create Journal Entry from AR Invoice
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

  -- Debit: Accounts Receivable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ar_account_id, 'AR Invoice ' || NEW.invoice_number, NEW.amount, 0, 1);

  -- Credit: Sales Revenue
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.sales_revenue_account_id, 'Sales Revenue', 0, NEW.amount, 2);

  -- Update account balances immediately since we're posting
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. Function: Create Journal Entry from AR Payment
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

  -- Create journal entry
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.payment_date, 'AR Payment: ' || v_ar_invoice.invoice_number, 'ar_payment', NEW.id, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Cash
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.cash_account_id, 'Payment received', NEW.amount_paid, 0, 1);

  -- Credit: Accounts Receivable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ar_account_id, 'AR Payment', 0, NEW.amount_paid, 2);

  -- Post the entry
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. Function: Create Journal Entry from AP Bill
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

  -- Generate entry number
  v_entry_number := 'AP-' || NEW.invoice_number;

  -- Create journal entry
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.invoice_date, 'AP Bill: ' || NEW.invoice_number, 'ap_bill', NEW.id, true)
  RETURNING id INTO v_journal_entry_id;

  -- Debit: Expense Account
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_expense_account_id, NEW.description, NEW.amount, 0, 1);

  -- Credit: Accounts Payable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number)
  VALUES (v_journal_entry_id, v_settings.ap_account_id, 'AP Bill ' || NEW.invoice_number, 0, NEW.amount, 2);

  -- Post the entry
  PERFORM post_journal_entry(v_journal_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. Function: Create Journal Entry from AP Payment
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

  -- Create journal entry
  INSERT INTO journal_entries (user_id, entry_number, entry_date, description, reference_type, reference_id, is_posted)
  VALUES (NEW.user_id, v_entry_number, NEW.payment_date, 'AP Payment: ' || v_ap_bill.invoice_number, 'ap_payment', NEW.id, true)
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
-- 14. Create Triggers for Automatic Journal Entries
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

-- =====================================================
-- 15. Function: Get Trial Balance
-- =====================================================
CREATE OR REPLACE FUNCTION get_trial_balance(p_user_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  account_number VARCHAR(20),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  debit_balance DECIMAL(15, 2),
  credit_balance DECIMAL(15, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.account_number,
    coa.account_name,
    coa.account_type,
    CASE WHEN coa.normal_balance = 'debit' AND coa.current_balance > 0 THEN coa.current_balance ELSE 0 END as debit_balance,
    CASE WHEN coa.normal_balance = 'credit' AND coa.current_balance > 0 THEN coa.current_balance ELSE 0 END as credit_balance
  FROM chart_of_accounts coa
  WHERE coa.user_id = p_user_id
    AND coa.is_active = true
  ORDER BY coa.account_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 16. Function: Get Account Ledger
-- =====================================================
CREATE OR REPLACE FUNCTION get_account_ledger(
  p_account_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  entry_date DATE,
  entry_number VARCHAR(50),
  description TEXT,
  debit_amount DECIMAL(15, 2),
  credit_amount DECIMAL(15, 2),
  balance DECIMAL(15, 2)
) AS $$
DECLARE
  v_running_balance DECIMAL(15, 2) := 0;
  v_normal_balance VARCHAR(10);
BEGIN
  -- Get account's normal balance
  SELECT coa.normal_balance INTO v_normal_balance
  FROM chart_of_accounts coa
  WHERE coa.id = p_account_id;

  RETURN QUERY
  SELECT 
    je.entry_date,
    je.entry_number,
    jel.description,
    jel.debit_amount,
    jel.credit_amount,
    CASE 
      WHEN v_normal_balance = 'debit' THEN 
        SUM(jel.debit_amount - jel.credit_amount) OVER (ORDER BY je.entry_date, je.entry_number)
      ELSE 
        SUM(jel.credit_amount - jel.debit_amount) OVER (ORDER BY je.entry_date, je.entry_number)
    END as balance
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.is_posted = true
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND je.entry_date <= p_end_date
  ORDER BY je.entry_date, je.entry_number;
END;
$$ LANGUAGE plpgsql;
