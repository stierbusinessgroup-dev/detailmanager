-- Restore GL Settings
-- This recreates the gl_settings record with proper account mappings
-- Replace YOUR_USER_ID with your actual user ID from auth.users

-- First, let's get your user_id (run this first to see your user_id)
SELECT id, email FROM auth.users;

-- Then run this with your actual user_id
-- Replace '3dc3ba2c-9399-4a5a-b2cc-6258a3221981' with your user_id if different

INSERT INTO gl_settings (
  user_id, 
  ar_account_id, 
  ap_account_id, 
  cash_account_id, 
  sales_revenue_account_id, 
  sales_tax_payable_account_id, 
  inventory_account_id, 
  cogs_account_id,
  expense_default_account_id
)
SELECT 
  '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid, -- Replace with your user_id
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '1100'), -- AR
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '2000'), -- AP
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '1000'), -- Cash
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '4000'), -- Sales Revenue
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '2100'), -- Sales Tax Payable
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '1200'), -- Inventory
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '5000'), -- COGS
  (SELECT id FROM chart_of_accounts WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid AND account_number = '6000')  -- Operating Expenses
ON CONFLICT (user_id) DO UPDATE SET
  ar_account_id = EXCLUDED.ar_account_id,
  ap_account_id = EXCLUDED.ap_account_id,
  cash_account_id = EXCLUDED.cash_account_id,
  sales_revenue_account_id = EXCLUDED.sales_revenue_account_id,
  sales_tax_payable_account_id = EXCLUDED.sales_tax_payable_account_id,
  inventory_account_id = EXCLUDED.inventory_account_id,
  cogs_account_id = EXCLUDED.cogs_account_id,
  expense_default_account_id = EXCLUDED.expense_default_account_id;

-- Verify the settings were created
SELECT * FROM gl_settings WHERE user_id = '3dc3ba2c-9399-4a5a-b2cc-6258a3221981'::uuid;
