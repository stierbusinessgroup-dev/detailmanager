# Inventory Module Setup Guide

## Overview
The Inventory module allows you to track products, stock levels, vendors, and inventory costs for your detailing business.

## Database Schema

### Products Table
The `products` table includes the following fields:

- **id**: Unique identifier (UUID)
- **user_id**: Reference to the user who owns the product
- **name**: Product name (required)
- **description**: Product description
- **category**: Product category (detail_package, wax, coating, polish, interior, exterior, addon, other)
- **price**: Selling price (required)
- **cost**: Your cost for the product
- **sku**: Stock Keeping Unit (product code)
- **vendor**: Vendor/supplier name
- **size**: Product size (e.g., "16 oz", "1 gallon")
- **quantity_in_stock**: Current inventory quantity (required, default: 0)
- **low_stock_threshold**: Alert threshold for low stock (default: 10)
- **is_active**: Whether the product is active (default: true)
- **created_at**: Timestamp when created
- **updated_at**: Timestamp when last updated

### Inventory Transactions Table
The `inventory_transactions` table tracks all stock changes:

- **id**: Unique identifier (UUID)
- **product_id**: Reference to the product
- **user_id**: Reference to the user
- **transaction_type**: Type of transaction (purchase, sale, adjustment, return)
- **quantity_change**: Change in quantity (positive or negative)
- **quantity_after**: Quantity after the transaction
- **notes**: Optional notes about the transaction
- **created_at**: Timestamp when created

## Setup Instructions

### 1. Run the Migration
Execute the SQL migration in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard → SQL Editor → New Query
# Copy and paste the contents of migration_create_products.sql
# Click "Run" to execute
```

### 2. Verify Tables
After running the migration, verify that both tables were created:
- `public.products`
- `public.inventory_transactions`

### 3. Check Row Level Security
Ensure RLS policies are enabled and working:
- Users can only view/edit their own products
- Users can only view their own inventory transactions

## Features

### Product Management
- **Add Products**: Create new products with all relevant details
- **Edit Products**: Update product information and stock levels
- **Delete Products**: Remove products (also deletes transaction history)
- **Active/Inactive**: Toggle product availability without deletion

### Inventory Tracking
- **Stock Levels**: Track current quantity for each product
- **Low Stock Alerts**: Visual warnings when stock falls below threshold
- **Inventory Value**: Calculate total inventory value based on cost
- **Transaction History**: Automatic logging of all stock changes

### Search & Filter
- **Search**: Find products by name, SKU, or vendor
- **Category Filter**: Filter by product category
- **Low Stock Filter**: Show only items needing restock

### Dashboard Metrics
- Total Products count
- Total Inventory Value (based on cost × quantity)
- Low Stock Items count
- Active Products count

## Usage Tips

1. **Set Realistic Thresholds**: Adjust `low_stock_threshold` based on your usage patterns
2. **Track Costs**: Enter product costs to monitor inventory value and profit margins
3. **Use SKUs**: Assign unique SKUs for easier product identification
4. **Regular Updates**: Update stock levels after purchases and sales
5. **Vendor Tracking**: Record vendor information for easy reordering

## Integration Points

### Future Enhancements
- Link products to services (e.g., which products are used in each service)
- Automatic inventory deduction when services are completed
- Purchase order management
- Vendor management system
- Inventory reports and analytics
- Barcode scanning for mobile app

## Troubleshooting

### Products Not Showing
- Verify you're logged in
- Check that RLS policies are properly set
- Ensure products have your user_id

### Cannot Update Stock
- Verify the product exists
- Check that you own the product (user_id matches)
- Ensure quantity is not negative

### Low Stock Alerts Not Working
- Check that `low_stock_threshold` is set
- Verify `quantity_in_stock` is less than or equal to threshold
- Ensure product is active

## API Reference

### Supabase Queries Used

```javascript
// Fetch all products
supabase
  .from('products')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// Insert new product
supabase
  .from('products')
  .insert([productData])
  .select()

// Update product
supabase
  .from('products')
  .update(productData)
  .eq('id', productId)
  .eq('user_id', user.id)

// Delete product
supabase
  .from('products')
  .delete()
  .eq('id', productId)
  .eq('user_id', user.id)

// Log inventory transaction
supabase
  .from('inventory_transactions')
  .insert([transactionData])
```

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- All queries include user_id filtering
- Cascading deletes protect data integrity
