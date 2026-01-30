import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import './Services.css'; // Reusing the Services styling for consistency
import './Inventory.css'; // Additional styling
import './Customers.css'; // Customer-specific styles

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    notes: '',
    referral_source: '',
    is_active: true,
    payment_terms_type: 'net_days',
    payment_net_days: 30,
    payment_discount_percent: 0,
    payment_discount_days: 0,
    payment_specific_dates: '',
    payment_terms_notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to manage customers');
        return;
      }

      const customerData = {
        ...formData,
        user_id: user.id,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null
      };

      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id)
          .eq('user_id', user.id);

        if (error) throw error;
        alert('Customer updated successfully!');
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        alert('Customer added successfully!');
      }

      fetchCustomers();
      handleModalClose();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      vehicle_make: customer.vehicle_make || '',
      vehicle_model: customer.vehicle_model || '',
      vehicle_year: customer.vehicle_year || '',
      vehicle_color: customer.vehicle_color || '',
      license_plate: customer.license_plate || '',
      notes: customer.notes || '',
      referral_source: customer.referral_source || '',
      is_active: customer.is_active !== undefined ? customer.is_active : true,
      payment_terms_type: customer.payment_terms_type || 'net_days',
      payment_net_days: customer.payment_net_days || 30,
      payment_discount_percent: customer.payment_discount_percent || 0,
      payment_discount_days: customer.payment_discount_days || 0,
      payment_specific_dates: customer.payment_specific_dates || '',
      payment_terms_notes: customer.payment_terms_notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      alert('Customer deleted successfully!');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_color: '',
      license_plate: '',
      notes: '',
      referral_source: '',
      is_active: true,
      payment_terms_type: 'net_days',
      payment_net_days: 30,
      payment_discount_percent: 0,
      payment_discount_days: 0,
      payment_specific_dates: '',
      payment_terms_notes: ''
    });
    setEditingCustomer(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.first_name?.toLowerCase().includes(searchLower) ||
      customer.last_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.vehicle_make?.toLowerCase().includes(searchLower) ||
      customer.vehicle_model?.toLowerCase().includes(searchLower) ||
      customer.license_plate?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1>Customer Management</h1>
          <button 
            className="btn-primary" 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Add Customer
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search customers by name, email, phone, or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading customers...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Vehicle</th>
                  <th>License Plate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {searchTerm ? 'No customers found matching your search.' : 'No customers yet. Add your first customer!'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="customer-name">
                          <strong>{customer.first_name} {customer.last_name}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.phone && <div>{customer.phone}</div>}
                        </div>
                      </td>
                      <td>
                        {customer.vehicle_year || customer.vehicle_make || customer.vehicle_model ? (
                          <div className="vehicle-info">
                            {customer.vehicle_year} {customer.vehicle_make} {customer.vehicle_model}
                            {customer.vehicle_color && <div className="vehicle-color">({customer.vehicle_color})</div>}
                          </div>
                        ) : (
                          <span className="text-muted">No vehicle info</span>
                        )}
                      </td>
                      <td>{customer.license_plate || '-'}</td>
                      <td>
                        <span className={`status-badge ${customer.is_active ? 'status-active' : 'status-inactive'}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-view"
                            onClick={() => handleViewCustomer(customer)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEdit(customer)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDelete(customer.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Customer Details</h2>
                <button className="modal-close" onClick={() => setSelectedCustomer(null)}>×</button>
              </div>
              <div className="customer-details">
                <div className="details-section">
                  <h3>Personal Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Phone:</label>
                      <span>{selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`status-badge ${selectedCustomer.is_active ? 'status-active' : 'status-inactive'}`}>
                        {selectedCustomer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Referral Source:</label>
                      <span>{selectedCustomer.referral_source || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Address</h3>
                  <div className="details-grid">
                    <div className="detail-item full-width">
                      <label>Street:</label>
                      <span>{selectedCustomer.address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>City:</label>
                      <span>{selectedCustomer.city || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>State:</label>
                      <span>{selectedCustomer.state || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>ZIP Code:</label>
                      <span>{selectedCustomer.zip_code || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Vehicle Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Make:</label>
                      <span>{selectedCustomer.vehicle_make || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Model:</label>
                      <span>{selectedCustomer.vehicle_model || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Year:</label>
                      <span>{selectedCustomer.vehicle_year || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Color:</label>
                      <span>{selectedCustomer.vehicle_color || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>License Plate:</label>
                      <span>{selectedCustomer.license_plate || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="details-section">
                    <h3>Notes</h3>
                    <p className="notes-text">{selectedCustomer.notes}</p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedCustomer(null)}>
                  Close
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    handleEdit(selectedCustomer);
                    setSelectedCustomer(null);
                  }}
                >
                  Edit Customer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Customer Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleModalClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
                <button className="modal-close" onClick={handleModalClose}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3>Personal Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        placeholder="John"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Address</h3>
                  <div className="form-group">
                    <label>Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        placeholder="Los Angeles"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        placeholder="CA"
                        maxLength="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                        placeholder="90210"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Vehicle Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Make</label>
                      <input
                        type="text"
                        value={formData.vehicle_make}
                        onChange={(e) => setFormData({...formData, vehicle_make: e.target.value})}
                        placeholder="Toyota"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Model</label>
                      <input
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                        placeholder="Camry"
                      />
                    </div>

                    <div className="form-group">
                      <label>Year</label>
                      <input
                        type="number"
                        value={formData.vehicle_year}
                        onChange={(e) => setFormData({...formData, vehicle_year: e.target.value})}
                        placeholder="2023"
                        min="1900"
                        max="2100"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Color</label>
                      <input
                        type="text"
                        value={formData.vehicle_color}
                        onChange={(e) => setFormData({...formData, vehicle_color: e.target.value})}
                        placeholder="Silver"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>License Plate</label>
                      <input
                        type="text"
                        value={formData.license_plate}
                        onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                        placeholder="ABC1234"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Payment Terms</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Terms Type</label>
                      <select
                        value={formData.payment_terms_type}
                        onChange={(e) => setFormData({...formData, payment_terms_type: e.target.value})}
                      >
                        <option value="net_days">Net Days (e.g., Net 30)</option>
                        <option value="discount">Early Payment Discount (e.g., 2/10 Net 30)</option>
                        <option value="specific_dates">Specific Payment Dates</option>
                        <option value="due_on_receipt">Due on Receipt</option>
                      </select>
                    </div>
                  </div>

                  {formData.payment_terms_type === 'net_days' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Net Days</label>
                        <input
                          type="number"
                          value={formData.payment_net_days}
                          onChange={(e) => setFormData({...formData, payment_net_days: e.target.value})}
                          placeholder="30"
                          min="0"
                        />
                        <small>Number of days until payment is due</small>
                      </div>
                    </div>
                  )}

                  {formData.payment_terms_type === 'discount' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Discount Percent (%)</label>
                        <input
                          type="number"
                          value={formData.payment_discount_percent}
                          onChange={(e) => setFormData({...formData, payment_discount_percent: e.target.value})}
                          placeholder="2"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        <small>Discount percentage for early payment</small>
                      </div>
                      <div className="form-group">
                        <label>Discount Days</label>
                        <input
                          type="number"
                          value={formData.payment_discount_days}
                          onChange={(e) => setFormData({...formData, payment_discount_days: e.target.value})}
                          placeholder="10"
                          min="0"
                        />
                        <small>Days to receive discount</small>
                      </div>
                      <div className="form-group">
                        <label>Net Days</label>
                        <input
                          type="number"
                          value={formData.payment_net_days}
                          onChange={(e) => setFormData({...formData, payment_net_days: e.target.value})}
                          placeholder="30"
                          min="0"
                        />
                        <small>Total days until payment is due</small>
                      </div>
                    </div>
                  )}

                  {formData.payment_terms_type === 'specific_dates' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Payment Dates (comma-separated)</label>
                        <input
                          type="text"
                          value={formData.payment_specific_dates}
                          onChange={(e) => setFormData({...formData, payment_specific_dates: e.target.value})}
                          placeholder="1, 15 (for 1st and 15th of each month)"
                        />
                        <small>Enter day numbers of the month (e.g., 1, 15)</small>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Payment Terms Notes</label>
                    <textarea
                      value={formData.payment_terms_notes}
                      onChange={(e) => setFormData({...formData, payment_terms_notes: e.target.value})}
                      rows="2"
                      placeholder="Additional payment terms or special instructions..."
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Additional Information</h3>
                  <div className="form-group">
                    <label>How did they find us?</label>
                    <select
                      value={formData.referral_source}
                      onChange={(e) => setFormData({...formData, referral_source: e.target.value})}
                    >
                      <option value="">Select...</option>
                      <option value="Google">Google</option>
                      <option value="Referral">Referral</option>
                      <option value="Yelp">Yelp</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Drive-by">Drive-by</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows="3"
                      placeholder="Additional notes about this customer..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      />
                      Active Customer
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleModalClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
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
