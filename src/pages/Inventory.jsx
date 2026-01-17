import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import './Services.css'; // Reusing the Services styling for consistency
import './Inventory.css'; // Additional inventory-specific styles

const CATEGORIES = [
  { value: 'detail_package', label: 'Detail Package' },
  { value: 'wax', label: 'Wax' },
  { value: 'coating', label: 'Coating' },
  { value: 'polish', label: 'Polish' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'addon', label: 'Add-on' },
  { value: 'other', label: 'Other' }
];

const UNITS = [
  { value: '', label: 'Select Unit' },
  { value: 'oz', label: 'Ounce (oz)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'l', label: 'Liter (L)' },
  { value: 'gal', label: 'Gallon (gal)' },
  { value: 'qt', label: 'Quart (qt)' },
  { value: 'pt', label: 'Pint (pt)' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'unit', label: 'Unit' },
  { value: 'pack', label: 'Pack' },
  { value: 'case', label: 'Case' },
  { value: 'box', label: 'Box' }
];

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    rating: '',
    payment_terms: '',
    notes: '',
    is_active: true
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    price: '',
    cost: '',
    sku: '',
    vendor: '',
    vendor_id: '',
    size: '',
    size_amount: '',
    size_unit: '',
    quantity_in_stock: 0,
    low_stock_threshold: 10,
    is_active: true
  });

  useEffect(() => {
    fetchProducts();
    fetchVendors();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error loading inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleQuickAddVendor = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to add vendors');
        return;
      }

      const vendorData = {
        ...vendorFormData,
        user_id: user.id,
        rating: vendorFormData.rating ? parseFloat(vendorFormData.rating) : null,
        amount_owed: 0
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert([vendorData])
        .select();

      if (error) throw error;
      
      alert('Vendor added successfully!');
      
      // Refresh vendors list
      await fetchVendors();
      
      // Auto-select the new vendor in the product form
      if (data && data[0]) {
        setFormData({
          ...formData,
          vendor_id: data[0].id,
          vendor: data[0].name
        });
      }
      
      // Close modal and reset form
      setShowVendorModal(false);
      resetVendorForm();
    } catch (error) {
      console.error('Error adding vendor:', error);
      alert('Error adding vendor. Please try again.');
    }
  };

  const resetVendorForm = () => {
    setVendorFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      rating: '',
      payment_terms: '',
      notes: '',
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to manage inventory');
        return;
      }

      // Combine size_amount and size_unit into size field
      const sizeValue = formData.size_amount && formData.size_unit 
        ? `${formData.size_amount} ${formData.size_unit}`.trim()
        : '';

      const productData = {
        ...formData,
        size: sizeValue,
        user_id: user.id,
        price: parseFloat(formData.price) || 0,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        vendor_id: formData.vendor_id || null
      };
      
      // Remove the temporary fields
      delete productData.size_amount;
      delete productData.size_unit;

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Log inventory adjustment if quantity changed
        if (productData.quantity_in_stock !== editingProduct.quantity_in_stock) {
          await logInventoryTransaction(
            editingProduct.id,
            user.id,
            'adjustment',
            productData.quantity_in_stock - editingProduct.quantity_in_stock,
            productData.quantity_in_stock,
            'Manual adjustment'
          );
        }
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) throw error;
        
        // Log initial inventory
        if (productData.quantity_in_stock > 0) {
          await logInventoryTransaction(
            newProduct.id,
            user.id,
            'purchase',
            productData.quantity_in_stock,
            productData.quantity_in_stock,
            'Initial stock'
          );
        }
      }

      await fetchProducts();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const logInventoryTransaction = async (productId, userId, type, quantityChange, quantityAfter, notes) => {
    try {
      const { error } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          user_id: userId,
          transaction_type: type,
          quantity_change: quantityChange,
          quantity_after: quantityAfter,
          notes: notes
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging inventory transaction:', error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    // Parse size into amount and unit if it exists
    let sizeAmount = '';
    let sizeUnit = '';
    if (product.size) {
      const sizeMatch = product.size.match(/^([\d.]+)\s*(.*)$/);
      if (sizeMatch) {
        sizeAmount = sizeMatch[1];
        sizeUnit = sizeMatch[2];
      }
    }
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || 'other',
      price: product.price || '',
      cost: product.cost || '',
      sku: product.sku || '',
      vendor: product.vendor || '',
      vendor_id: product.vendor_id || '',
      size: product.size || '',
      size_amount: sizeAmount,
      size_unit: sizeUnit,
      quantity_in_stock: product.quantity_in_stock || 0,
      low_stock_threshold: product.low_stock_threshold || 10,
      is_active: product.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'other',
      price: '',
      cost: '',
      sku: '',
      vendor: '',
      vendor_id: '',
      size: '',
      size_amount: '',
      size_unit: '',
      quantity_in_stock: 0,
      low_stock_threshold: 10,
      is_active: true
    });
    setEditingProduct(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.vendor && product.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLowStock = !showLowStock || (product.quantity_in_stock <= product.low_stock_threshold);
    
    return matchesCategory && matchesSearch && matchesLowStock;
  });

  const totalInventoryValue = products.reduce((sum, product) => {
    return sum + (product.cost || 0) * product.quantity_in_stock;
  }, 0);

  const lowStockCount = products.filter(p => p.quantity_in_stock <= p.low_stock_threshold).length;

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="loading">Loading inventory...</div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="services-container">
      <div className="services-header">
        <div>
          <h1>Inventory Management</h1>
          <p className="services-subtitle">Track your products and stock levels</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Products</div>
          <div className="summary-value">{products.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Inventory Value</div>
          <div className="summary-value">${totalInventoryValue.toFixed(2)}</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-label">Low Stock Items</div>
          <div className="summary-value">{lowStockCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Active Products</div>
          <div className="summary-value">{products.filter(p => p.is_active).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="services-filters">
        <input
          type="text"
          placeholder="Search by name, SKU, or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
          />
          Show Low Stock Only
        </label>
      </div>

      {/* Products Grid */}
      <div className="services-grid">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>No products found. Add your first product to get started!</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className={`service-card ${!product.is_active ? 'inactive' : ''}`}>
              <div className="service-card-header">
                <h3>{product.name}</h3>
                {product.quantity_in_stock <= product.low_stock_threshold && (
                  <span className="badge badge-warning">Low Stock</span>
                )}
                {!product.is_active && (
                  <span className="badge badge-inactive">Inactive</span>
                )}
              </div>
              
              <div className="service-details">
                {product.description && (
                  <p className="service-description">{product.description}</p>
                )}
                
                <div className="product-info-grid">
                  <div className="info-item">
                    <span className="info-label">Category:</span>
                    <span className="info-value">
                      {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                    </span>
                  </div>
                  
                  {product.sku && (
                    <div className="info-item">
                      <span className="info-label">SKU:</span>
                      <span className="info-value">{product.sku}</span>
                    </div>
                  )}
                  
                  {product.vendor && (
                    <div className="info-item">
                      <span className="info-label">Vendor:</span>
                      <span className="info-value">{product.vendor}</span>
                    </div>
                  )}
                  
                  {product.size && (
                    <div className="info-item">
                      <span className="info-label">Size:</span>
                      <span className="info-value">{product.size}</span>
                    </div>
                  )}
                  
                  <div className="info-item">
                    <span className="info-label">Price:</span>
                    <span className="info-value price">${parseFloat(product.price).toFixed(2)}</span>
                  </div>
                  
                  {product.cost && (
                    <div className="info-item">
                      <span className="info-label">Cost:</span>
                      <span className="info-value">${parseFloat(product.cost).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="info-item highlight">
                    <span className="info-label">In Stock:</span>
                    <span className="info-value stock-quantity">{product.quantity_in_stock}</span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">Low Stock Alert:</span>
                    <span className="info-value">{product.low_stock_threshold}</span>
                  </div>
                </div>
              </div>
              
              <div className="service-card-actions">
                <button className="btn-secondary" onClick={() => handleEdit(product)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => handleDelete(product.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={handleModalClose}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="e.g., WAX-001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => {
                      const selectedVendor = vendors.find(v => v.id === e.target.value);
                      setFormData({
                        ...formData, 
                        vendor_id: e.target.value,
                        vendor: selectedVendor ? selectedVendor.name : ''
                      });
                    }}
                  >
                    <option value="">Select a vendor (optional)</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                  <small style={{display: 'block', marginTop: '0.25rem', color: '#6b7280'}}>
                    Don't see your vendor? <a href="#" style={{color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline'}} onClick={(e) => {
                      e.preventDefault();
                      setShowVendorModal(true);
                    }}>Quick Add Vendor</a>
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Size Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.size_amount}
                    onChange={(e) => setFormData({...formData, size_amount: e.target.value})}
                    placeholder="e.g., 16"
                  />
                </div>
                
                <div className="form-group">
                  <label>Size Unit</label>
                  <select
                    value={formData.size_unit}
                    onChange={(e) => setFormData({...formData, size_unit: e.target.value})}
                  >
                    {UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    placeholder="Your cost"
                  />
                </div>
                
                <div className="form-group">
                  <label>Quantity in Stock *</label>
                  <input
                    type="number"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({...formData, quantity_in_stock: e.target.value})}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    />
                    Active Product
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Modal */}
      {showVendorModal && (
        <div className="modal-overlay" style={{zIndex: 1100}} onClick={() => {
          setShowVendorModal(false);
          resetVendorForm();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quick Add Vendor</h2>
              <button className="modal-close" onClick={() => {
                setShowVendorModal(false);
                resetVendorForm();
              }}>×</button>
            </div>

            <form onSubmit={handleQuickAddVendor}>
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    value={vendorFormData.name}
                    onChange={(e) => setVendorFormData({...vendorFormData, name: e.target.value})}
                    required
                    placeholder="e.g., Chemical Guys"
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={vendorFormData.contact_name}
                    onChange={(e) => setVendorFormData({...vendorFormData, contact_name: e.target.value})}
                    placeholder="Primary contact person"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({...vendorFormData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({...vendorFormData, email: e.target.value})}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={vendorFormData.address}
                  onChange={(e) => setVendorFormData({...vendorFormData, address: e.target.value})}
                  placeholder="Full address"
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={vendorFormData.website}
                  onChange={(e) => setVendorFormData({...vendorFormData, website: e.target.value})}
                  placeholder="https://www.vendor.com"
                />
              </div>

              <div className="form-group">
                <label>Rating (0-5)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={vendorFormData.rating}
                  onChange={(e) => setVendorFormData({...vendorFormData, rating: e.target.value})}
                  placeholder="4.5"
                />
              </div>

              <div className="form-group">
                <label>Payment Terms</label>
                <input
                  type="text"
                  value={vendorFormData.payment_terms}
                  onChange={(e) => setVendorFormData({...vendorFormData, payment_terms: e.target.value})}
                  placeholder="e.g., Net 30, COD, etc."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={vendorFormData.notes}
                  onChange={(e) => setVendorFormData({...vendorFormData, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about this vendor..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={vendorFormData.is_active}
                    onChange={(e) => setVendorFormData({...vendorFormData, is_active: e.target.checked})}
                  />
                  Active Vendor
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowVendorModal(false);
                  resetVendorForm();
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
