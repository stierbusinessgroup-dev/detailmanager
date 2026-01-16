import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Services.css'; // Reusing the Services styling for consistency
import './Inventory.css'; // Additional styling
import './Vendors.css'; // Vendor-specific styles

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    rating: '',
    payment_terms: '',
    amount_owed: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    fetchVendors();
    fetchProducts();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      alert('Error loading vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchVendorProducts = async (vendorId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('vendor_id', vendorId)
        .order('name', { ascending: true });

      if (error) throw error;
      setVendorProducts(data || []);
    } catch (error) {
      console.error('Error fetching vendor products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to manage vendors');
        return;
      }

      const vendorData = {
        ...formData,
        user_id: user.id,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        amount_owed: formData.amount_owed ? parseFloat(formData.amount_owed) : 0
      };

      if (editingVendor) {
        // Update existing vendor
        const { error } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', editingVendor.id)
          .eq('user_id', user.id);

        if (error) throw error;
        alert('Vendor updated successfully!');
      } else {
        // Create new vendor
        const { error } = await supabase
          .from('vendors')
          .insert([vendorData]);

        if (error) throw error;
        alert('Vendor added successfully!');
      }

      fetchVendors();
      handleModalClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Error saving vendor. Please try again.');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      contact_name: vendor.contact_name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      website: vendor.website || '',
      rating: vendor.rating || '',
      payment_terms: vendor.payment_terms || '',
      amount_owed: vendor.amount_owed || '',
      notes: vendor.notes || '',
      is_active: vendor.is_active !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor? Products linked to this vendor will not be deleted.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      alert('Vendor deleted successfully!');
      fetchVendors();
      if (selectedVendor?.id === id) {
        setSelectedVendor(null);
        setVendorProducts([]);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Error deleting vendor. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      rating: '',
      payment_terms: '',
      amount_owed: '',
      notes: '',
      is_active: true
    });
    setEditingVendor(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleViewVendor = (vendor) => {
    setSelectedVendor(vendor);
    fetchVendorProducts(vendor.id);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_name && vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="services-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-container">
      <div className="services-header">
        <div>
          <h1>Vendor Management</h1>
          <p>Manage your suppliers and vendor relationships</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Vendor
        </button>
      </div>

      <div className="services-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="vendor-layout">
        <div className="vendor-list-section">
          <h2>Vendors ({filteredVendors.length})</h2>
          {filteredVendors.length === 0 ? (
            <div className="empty-state">
              <p>No vendors found. Add your first vendor to get started!</p>
            </div>
          ) : (
            <div className="vendor-cards">
              {filteredVendors.map((vendor) => (
                <div 
                  key={vendor.id} 
                  className={`vendor-card ${selectedVendor?.id === vendor.id ? 'selected' : ''}`}
                  onClick={() => handleViewVendor(vendor)}
                >
                  <div className="vendor-card-header">
                    <h3>{vendor.name}</h3>
                    {vendor.rating && (
                      <div className="vendor-rating">
                        ⭐ {vendor.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  {vendor.contact_name && (
                    <p className="vendor-contact">
                      <strong>Contact:</strong> {vendor.contact_name}
                    </p>
                  )}
                  
                  {vendor.phone && (
                    <p className="vendor-phone">
                      <strong>Phone:</strong> {vendor.phone}
                    </p>
                  )}
                  
                  {vendor.amount_owed > 0 && (
                    <p className="vendor-owed">
                      <strong>Amount Owed:</strong> ${vendor.amount_owed.toFixed(2)}
                    </p>
                  )}
                  
                  <div className="vendor-card-actions">
                    <button 
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(vendor);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(vendor.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedVendor && (
          <div className="vendor-details-section">
            <div className="vendor-details-header">
              <h2>{selectedVendor.name}</h2>
              <button 
                className="btn-close"
                onClick={() => {
                  setSelectedVendor(null);
                  setVendorProducts([]);
                }}
              >
                ✕
              </button>
            </div>

            <div className="vendor-info">
              <div className="info-grid">
                {selectedVendor.contact_name && (
                  <div className="info-item">
                    <strong>Contact Name:</strong>
                    <span>{selectedVendor.contact_name}</span>
                  </div>
                )}
                
                {selectedVendor.phone && (
                  <div className="info-item">
                    <strong>Phone:</strong>
                    <span>{selectedVendor.phone}</span>
                  </div>
                )}
                
                {selectedVendor.email && (
                  <div className="info-item">
                    <strong>Email:</strong>
                    <span>{selectedVendor.email}</span>
                  </div>
                )}
                
                {selectedVendor.website && (
                  <div className="info-item">
                    <strong>Website:</strong>
                    <span>
                      <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer">
                        {selectedVendor.website}
                      </a>
                    </span>
                  </div>
                )}
                
                {selectedVendor.address && (
                  <div className="info-item">
                    <strong>Address:</strong>
                    <span>{selectedVendor.address}</span>
                  </div>
                )}
                
                {selectedVendor.rating && (
                  <div className="info-item">
                    <strong>Rating:</strong>
                    <span>⭐ {selectedVendor.rating.toFixed(1)} / 5.0</span>
                  </div>
                )}
                
                {selectedVendor.payment_terms && (
                  <div className="info-item">
                    <strong>Payment Terms:</strong>
                    <span>{selectedVendor.payment_terms}</span>
                  </div>
                )}
                
                {selectedVendor.amount_owed !== null && (
                  <div className="info-item">
                    <strong>Amount Owed:</strong>
                    <span className={selectedVendor.amount_owed > 0 ? 'amount-owed' : ''}>
                      ${selectedVendor.amount_owed.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              {selectedVendor.notes && (
                <div className="vendor-notes">
                  <strong>Notes:</strong>
                  <p>{selectedVendor.notes}</p>
                </div>
              )}
            </div>

            <div className="vendor-products">
              <h3>Products from this Vendor ({vendorProducts.length})</h3>
              {vendorProducts.length === 0 ? (
                <p className="empty-products">No products linked to this vendor yet.</p>
              ) : (
                <div className="products-list">
                  {vendorProducts.map((product) => (
                    <div key={product.id} className="product-item">
                      <div className="product-info">
                        <strong>{product.name}</strong>
                        {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
                      </div>
                      <div className="product-details">
                        <span className="product-price">${product.price.toFixed(2)}</span>
                        {product.cost && (
                          <span className="product-cost">Cost: ${product.cost.toFixed(2)}</span>
                        )}
                        <span className="product-stock">Stock: {product.quantity_in_stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g., Chemical Guys"
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="Primary contact person"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full address"
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
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
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: e.target.value})}
                  placeholder="4.5"
                />
              </div>

              <div className="form-group">
                <label>Payment Terms</label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  placeholder="e.g., Net 30, COD, etc."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about this vendor..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active Vendor
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
