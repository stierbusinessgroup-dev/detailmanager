import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
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
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    tax_id: '',
    payment_terms_type: 'net_days',
    payment_net_days: 30,
    payment_discount_percent: '',
    payment_discount_days: '',
    payment_specific_dates: '',
    payment_terms_notes: '',
    account_number: '',
    notes: '',
    is_active: true,
    document_url: '',
    document_name: '',
    document_type: 'sellers_permit'
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
        .order('vendor_name', { ascending: true });

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

  const uploadVendorDocument = async (file) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload to vendor-documents bucket
      const { data, error } = await supabase.storage
        .from('vendor-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vendor-documents')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
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

      // Upload document if provided
      let documentUrl = formData.document_url;
      let documentName = formData.document_name;
      
      if (documentFile) {
        setUploadingDocument(true);
        const uploadResult = await uploadVendorDocument(documentFile);
        documentUrl = uploadResult.url;
        documentName = uploadResult.fileName;
      }

      const vendorData = {
        ...formData,
        user_id: user.id,
        payment_net_days: formData.payment_net_days ? parseInt(formData.payment_net_days) : 30,
        payment_discount_percent: formData.payment_discount_percent ? parseFloat(formData.payment_discount_percent) : null,
        payment_discount_days: formData.payment_discount_days ? parseInt(formData.payment_discount_days) : null,
        document_url: documentUrl || null,
        document_name: documentName || null,
        document_uploaded_at: documentFile ? new Date().toISOString() : formData.document_uploaded_at
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
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip: vendor.zip || '',
      country: vendor.country || 'USA',
      tax_id: vendor.tax_id || '',
      payment_terms_type: vendor.payment_terms_type || 'net_days',
      payment_net_days: vendor.payment_net_days || 30,
      payment_discount_percent: vendor.payment_discount_percent || '',
      payment_discount_days: vendor.payment_discount_days || '',
      payment_specific_dates: vendor.payment_specific_dates || '',
      payment_terms_notes: vendor.payment_terms_notes || '',
      account_number: vendor.account_number || '',
      notes: vendor.notes || '',
      is_active: vendor.is_active !== false,
      document_url: vendor.document_url || '',
      document_name: vendor.document_name || '',
      document_type: vendor.document_type || 'sellers_permit'
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
      vendor_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      tax_id: '',
      payment_terms_type: 'net_days',
      payment_net_days: 30,
      payment_discount_percent: '',
      payment_discount_days: '',
      payment_specific_dates: '',
      payment_terms_notes: '',
      account_number: '',
      notes: '',
      is_active: true,
      document_url: '',
      document_name: '',
      document_type: 'sellers_permit'
    });
    setEditingVendor(null);
    setDocumentFile(null);
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
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="services-container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading vendors...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
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
                    <h3>{vendor.vendor_name}</h3>
                    {!vendor.is_active && (
                      <span className="inactive-badge">Inactive</span>
                    )}
                  </div>
                  
                  {vendor.contact_person && (
                    <p className="vendor-contact">
                      <strong>Contact:</strong> {vendor.contact_person}
                    </p>
                  )}
                  
                  {vendor.phone && (
                    <p className="vendor-phone">
                      <strong>Phone:</strong> {vendor.phone}
                    </p>
                  )}
                  
                  {vendor.payment_terms_type && (
                    <p className="vendor-terms">
                      <strong>Terms:</strong> {vendor.payment_terms_type === 'net_days' ? `Net ${vendor.payment_net_days}` : vendor.payment_terms_type}
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
                {selectedVendor.contact_person && (
                  <div className="info-item">
                    <strong>Contact Person:</strong>
                    <span>{selectedVendor.contact_person}</span>
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
                
                {selectedVendor.address && (
                  <div className="info-item">
                    <strong>Address:</strong>
                    <span>
                      {selectedVendor.address}
                      {selectedVendor.city && `, ${selectedVendor.city}`}
                      {selectedVendor.state && `, ${selectedVendor.state}`}
                      {selectedVendor.zip && ` ${selectedVendor.zip}`}
                    </span>
                  </div>
                )}
                
                {selectedVendor.tax_id && (
                  <div className="info-item">
                    <strong>Tax ID:</strong>
                    <span>{selectedVendor.tax_id}</span>
                  </div>
                )}
                
                {selectedVendor.account_number && (
                  <div className="info-item">
                    <strong>Account Number:</strong>
                    <span>{selectedVendor.account_number}</span>
                  </div>
                )}
                
                {selectedVendor.payment_terms_type && (
                  <div className="info-item">
                    <strong>Payment Terms:</strong>
                    <span>
                      {selectedVendor.payment_terms_type === 'net_days' && `Net ${selectedVendor.payment_net_days} days`}
                      {selectedVendor.payment_terms_type === 'discount' && `${selectedVendor.payment_discount_percent}/${selectedVendor.payment_discount_days} Net ${selectedVendor.payment_net_days}`}
                      {selectedVendor.payment_terms_type === 'specific_dates' && selectedVendor.payment_specific_dates}
                      {selectedVendor.payment_terms_type === 'due_on_receipt' && 'Due on Receipt'}
                    </span>
                  </div>
                )}
                
                {selectedVendor.payment_terms_notes && (
                  <div className="info-item">
                    <strong>Payment Terms Notes:</strong>
                    <span>{selectedVendor.payment_terms_notes}</span>
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
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    required
                    placeholder="e.g., Chemical Guys"
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
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
                  placeholder="Street address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({...formData, zip: e.target.value})}
                    placeholder="ZIP"
                  />
                </div>
                
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tax ID</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    placeholder="Tax ID / EIN"
                  />
                </div>
                
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                    placeholder="Your account # with vendor"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Terms Type</label>
                <select
                  value={formData.payment_terms_type}
                  onChange={(e) => setFormData({...formData, payment_terms_type: e.target.value})}
                >
                  <option value="net_days">Net Days</option>
                  <option value="discount">Early Payment Discount</option>
                  <option value="specific_dates">Specific Payment Dates</option>
                  <option value="due_on_receipt">Due on Receipt</option>
                </select>
              </div>

              {formData.payment_terms_type === 'net_days' && (
                <div className="form-group">
                  <label>Net Days</label>
                  <input
                    type="number"
                    value={formData.payment_net_days}
                    onChange={(e) => setFormData({...formData, payment_net_days: e.target.value})}
                    placeholder="30"
                  />
                </div>
              )}

              {formData.payment_terms_type === 'discount' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_discount_percent}
                      onChange={(e) => setFormData({...formData, payment_discount_percent: e.target.value})}
                      placeholder="2.0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Discount Days</label>
                    <input
                      type="number"
                      value={formData.payment_discount_days}
                      onChange={(e) => setFormData({...formData, payment_discount_days: e.target.value})}
                      placeholder="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Net Days</label>
                    <input
                      type="number"
                      value={formData.payment_net_days}
                      onChange={(e) => setFormData({...formData, payment_net_days: e.target.value})}
                      placeholder="30"
                    />
                  </div>
                </div>
              )}

              {formData.payment_terms_type === 'specific_dates' && (
                <div className="form-group">
                  <label>Payment Dates (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.payment_specific_dates}
                    onChange={(e) => setFormData({...formData, payment_specific_dates: e.target.value})}
                    placeholder="e.g., 1st, 15th"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Payment Terms Notes</label>
                <textarea
                  value={formData.payment_terms_notes}
                  onChange={(e) => setFormData({...formData, payment_terms_notes: e.target.value})}
                  rows="2"
                  placeholder="Additional payment terms details..."
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

              {/* Document Upload Section */}
              <div className="form-section">
                <h3>Vendor Documents</h3>
                <p className="section-description">Upload important vendor documents (seller's permit, W-9, tax certificate, etc.)</p>
                
                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                  >
                    <option value="sellers_permit">Seller's Permit</option>
                    <option value="w9_form">W-9 Form</option>
                    <option value="tax_certificate">Tax Certificate</option>
                    <option value="business_license">Business License</option>
                    <option value="insurance_certificate">Insurance Certificate</option>
                    <option value="contract">Contract/Agreement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {formData.document_url && !documentFile && (
                  <div className="current-document">
                    <p><strong>Current Document:</strong> {formData.document_name}</p>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => window.open(formData.document_url, '_blank')}
                    >
                      📄 View Document
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>{formData.document_url ? 'Replace Document' : 'Upload Document'}</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocumentFile(e.target.files[0])}
                  />
                  <small>Accepted formats: PDF, JPG, PNG (max 10MB)</small>
                  {documentFile && (
                    <p className="file-selected">Selected: {documentFile.name}</p>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploadingDocument}>
                  {uploadingDocument ? 'Uploading...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
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
