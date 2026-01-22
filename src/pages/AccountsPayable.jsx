import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import './AccountsPayable.css';

export default function AccountsPayable() {
  const [apLedger, setApLedger] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAP, setSelectedAP] = useState(null);
  const [selectedAPForUpload, setSelectedAPForUpload] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [agingSummary, setAgingSummary] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const [vendorFormData, setVendorFormData] = useState({
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
    is_active: true
  });

  const [formData, setFormData] = useState({
    vendor_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    description: '',
    category: '',
    payment_terms: '',
    notes: '',
    invoice_file: null
  });

  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_method: 'check',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
    fetchAPLedger();
    fetchAgingSummary();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('vendor_name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchAPLedger = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update overdue status first
      const { error: updateError } = await supabase.rpc('update_ap_overdue_status', {
        p_user_id: user.id
      });

      if (updateError) {
        console.error('Error updating overdue status:', updateError);
      } else {
        console.log('Successfully updated AP overdue status');
      }

      // Fetch AP ledger with vendor information
      const { data, error } = await supabase
        .from('ap_ledger')
        .select(`
          *,
          vendors (
            vendor_name,
            contact_person,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setApLedger(data || []);
    } catch (error) {
      console.error('Error fetching AP ledger:', error);
      alert('Error loading AP ledger. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgingSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_ap_aging_summary', {
        p_user_id: user.id
      });

      if (error) throw error;
      if (data && data.length > 0) {
        console.log('Aging summary data:', data[0]);
        setAgingSummary(data[0]);
      } else {
        console.log('No aging summary data returned');
      }
    } catch (error) {
      console.error('Error fetching aging summary:', error);
    }
  };

  const uploadInvoiceFile = async (file) => {
    try {
      setUploadingFile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ap-invoices')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ap-invoices')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      let invoiceFileUrl = null;
      let invoiceFileName = null;

      // Upload file if provided
      if (formData.invoice_file) {
        const uploadResult = await uploadInvoiceFile(formData.invoice_file);
        invoiceFileUrl = uploadResult.url;
        invoiceFileName = uploadResult.fileName;
      }

      // Create AP entry using database function
      const { data, error } = await supabase.rpc('create_ap_entry', {
        p_user_id: user.id,
        p_vendor_id: formData.vendor_id,
        p_invoice_number: formData.invoice_number,
        p_invoice_date: formData.invoice_date,
        p_due_date: formData.due_date,
        p_amount: parseFloat(formData.amount),
        p_description: formData.description || null,
        p_category: formData.category || null,
        p_invoice_file_url: invoiceFileUrl,
        p_invoice_file_name: invoiceFileName,
        p_payment_terms: formData.payment_terms || null,
        p_notes: formData.notes || null
      });

      if (error) throw error;

      alert('Bill added successfully!');
      fetchAPLedger();
      fetchAgingSummary();
      handleModalClose();
    } catch (error) {
      console.error('Error creating AP entry:', error);
      alert('Error adding bill. Please try again.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('record_ap_payment', {
        p_user_id: user.id,
        p_ap_ledger_id: selectedAP.id,
        p_payment_date: paymentData.payment_date,
        p_amount_paid: parseFloat(paymentData.amount_paid),
        p_payment_method: paymentData.payment_method,
        p_reference_number: paymentData.reference_number || null,
        p_notes: paymentData.notes || null
      });

      if (error) throw error;

      alert('Payment recorded successfully!');
      fetchAPLedger();
      fetchAgingSummary();
      setShowPaymentModal(false);
      setPaymentData({
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: '',
        payment_method: 'check',
        reference_number: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      const vendorData = {
        ...vendorFormData,
        user_id: user.id,
        payment_net_days: vendorFormData.payment_net_days ? parseInt(vendorFormData.payment_net_days) : 30,
        payment_discount_percent: vendorFormData.payment_discount_percent ? parseFloat(vendorFormData.payment_discount_percent) : null,
        payment_discount_days: vendorFormData.payment_discount_days ? parseInt(vendorFormData.payment_discount_days) : null
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert([vendorData])
        .select();

      if (error) throw error;

      alert('Vendor added successfully!');
      
      // Refresh vendors list
      await fetchVendors();
      
      // Set the newly created vendor as selected
      if (data && data.length > 0) {
        setFormData({ ...formData, vendor_id: data[0].id });
      }
      
      // Close vendor modal and reset form
      setShowVendorModal(false);
      setVendorFormData({
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
        is_active: true
      });
    } catch (error) {
      console.error('Error adding vendor:', error);
      alert('Error adding vendor. Please try again.');
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();

    try {
      if (!uploadFile) {
        alert('Please select a file to upload');
        return;
      }

      setUploadingFile(true);

      // Upload the file
      const uploadResult = await uploadInvoiceFile(uploadFile);

      // Update the AP ledger entry with the file info
      const { error } = await supabase
        .from('ap_ledger')
        .update({
          invoice_file_url: uploadResult.url,
          invoice_file_name: uploadResult.fileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAPForUpload.id);

      if (error) throw error;

      alert('Document uploaded successfully!');
      
      // Refresh the AP ledger
      await fetchAPLedger();
      
      // Close modal and reset
      setShowUploadModal(false);
      setSelectedAPForUpload(null);
      setUploadFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleViewPaymentHistory = async (ap) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ap_payment_history')
        .select('*')
        .eq('ap_ledger_id', ap.id)
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      setPaymentHistory(data || []);
      setSelectedAP(ap);
      setShowPaymentHistory(true);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      alert('Error loading payment history.');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setFormData({
      vendor_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      amount: '',
      description: '',
      category: '',
      payment_terms: '',
      notes: '',
      invoice_file: null
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setFormData({ ...formData, invoice_file: file });
    }
  };

  const handleDownloadInvoice = (url, fileName) => {
    window.open(url, '_blank');
  };

  const filteredAPLedger = apLedger.filter(ap => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'open') return ap.status === 'open' || ap.status === 'partial';
    if (filterStatus === 'overdue') return ap.is_overdue;
    if (filterStatus === 'paid') return ap.status === 'paid';
    return true;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (ap) => {
    if (ap.status === 'paid') return <span className="status-badge status-paid">Paid</span>;
    if (ap.is_overdue) return <span className="status-badge status-overdue">Overdue</span>;
    if (ap.status === 'partial') return <span className="status-badge status-partial">Partial</span>;
    return <span className="status-badge status-open">Open</span>;
  };

  return (
    <>
      <Navigation />
      <div className="ap-container">
        <div className="ap-header">
          <h1>Accounts Payable</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add Bill
          </button>
        </div>

        {/* Aging Summary */}
        {agingSummary && (
          <div className="aging-summary">
            <div className="summary-card">
              <h3>Total Outstanding</h3>
              <p className="amount">{formatCurrency(agingSummary.total_outstanding)}</p>
            </div>
            <div className="summary-card">
              <h3>Current</h3>
              <p className="amount">{formatCurrency(agingSummary.current_amount)}</p>
            </div>
            <div className="summary-card">
              <h3>1-30 Days</h3>
              <p className="amount">{formatCurrency(agingSummary.days_1_30)}</p>
            </div>
            <div className="summary-card">
              <h3>31-60 Days</h3>
              <p className="amount">{formatCurrency(agingSummary.days_31_60)}</p>
            </div>
            <div className="summary-card">
              <h3>61-90 Days</h3>
              <p className="amount">{formatCurrency(agingSummary.days_61_90)}</p>
            </div>
            <div className="summary-card">
              <h3>Over 90 Days</h3>
              <p className="amount">{formatCurrency(agingSummary.over_90_days)}</p>
            </div>
            <div className="summary-card overdue">
              <h3>Total Overdue</h3>
              <p className="amount">{formatCurrency(agingSummary.total_overdue)}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            All Bills
          </button>
          <button
            className={filterStatus === 'open' ? 'active' : ''}
            onClick={() => setFilterStatus('open')}
          >
            Open
          </button>
          <button
            className={filterStatus === 'overdue' ? 'active' : ''}
            onClick={() => setFilterStatus('overdue')}
          >
            Overdue
          </button>
          <button
            className={filterStatus === 'paid' ? 'active' : ''}
            onClick={() => setFilterStatus('paid')}
          >
            Paid
          </button>
        </div>

        {/* AP Ledger Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-container">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>File</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAPLedger.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center' }}>
                      No bills found
                    </td>
                  </tr>
                ) : (
                  filteredAPLedger.map((ap) => (
                    <tr key={ap.id}>
                      <td>
                        <strong>{ap.vendors?.vendor_name}</strong>
                        {ap.description && (
                          <div className="description">{ap.description}</div>
                        )}
                      </td>
                      <td>{ap.invoice_number}</td>
                      <td>{formatDate(ap.invoice_date)}</td>
                      <td>
                        {formatDate(ap.due_date)}
                        {ap.is_overdue && (
                          <div className="overdue-text">
                            {ap.days_overdue} days overdue
                          </div>
                        )}
                      </td>
                      <td>{formatCurrency(ap.amount)}</td>
                      <td>{formatCurrency(ap.amount_paid)}</td>
                      <td>{formatCurrency(ap.amount_remaining)}</td>
                      <td>{getStatusBadge(ap)}</td>
                      <td>
                        {ap.invoice_file_url ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              className="btn-link"
                              onClick={() => handleDownloadInvoice(ap.invoice_file_url, ap.invoice_file_name)}
                              title={ap.invoice_file_name}
                            >
                              📄 View
                            </button>
                            <button
                              className="btn-link"
                              onClick={() => {
                                setSelectedAPForUpload(ap);
                                setShowUploadModal(true);
                              }}
                              title="Replace document"
                            >
                              🔄
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-link"
                            onClick={() => {
                              setSelectedAPForUpload(ap);
                              setShowUploadModal(true);
                            }}
                          >
                            📎 Upload
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {ap.status !== 'paid' && (
                            <button
                              className="btn-small btn-primary"
                              onClick={() => {
                                setSelectedAP(ap);
                                setPaymentData({
                                  ...paymentData,
                                  amount_paid: ap.amount_remaining
                                });
                                setShowPaymentModal(true);
                              }}
                            >
                              💰 Pay
                            </button>
                          )}
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => handleViewPaymentHistory(ap)}
                          >
                            📋 History
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

        {/* Add Bill Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleModalClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Bill</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    required
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-link add-vendor-link"
                    onClick={() => setShowVendorModal(true)}
                  >
                    + Add New Vendor
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Invoice Number *</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Invoice Date *</label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the bill"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select category</option>
                      <option value="supplies">Supplies</option>
                      <option value="inventory">Inventory</option>
                      <option value="utilities">Utilities</option>
                      <option value="rent">Rent</option>
                      <option value="insurance">Insurance</option>
                      <option value="equipment">Equipment</option>
                      <option value="services">Services</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Terms</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload Invoice (PDF, JPG, PNG - Max 10MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  {formData.invoice_file && (
                    <div className="file-info">
                      Selected: {formData.invoice_file.name}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleModalClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={uploadingFile}>
                    {uploadingFile ? 'Uploading...' : 'Add Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedAP && (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Record Payment</h2>
              <div className="payment-info">
                <p><strong>Vendor:</strong> {selectedAP.vendors?.vendor_name}</p>
                <p><strong>Invoice:</strong> {selectedAP.invoice_number}</p>
                <p><strong>Amount Due:</strong> {formatCurrency(selectedAP.amount_remaining)}</p>
              </div>
              <form onSubmit={handleRecordPayment}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentData.amount_paid}
                      onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
                      max={selectedAP.amount_remaining}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method *</label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                      required
                    >
                      <option value="check">Check</option>
                      <option value="ach">ACH/Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="cash">Cash</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={paymentData.reference_number}
                      onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows="2"
                    placeholder="Payment notes..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistory && selectedAP && (
          <div className="modal-overlay" onClick={() => setShowPaymentHistory(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Payment History</h2>
              <div className="payment-info">
                <p><strong>Vendor:</strong> {selectedAP.vendors?.vendor_name}</p>
                <p><strong>Invoice:</strong> {selectedAP.invoice_number}</p>
                <p><strong>Total Amount:</strong> {formatCurrency(selectedAP.amount)}</p>
                <p><strong>Amount Paid:</strong> {formatCurrency(selectedAP.amount_paid)}</p>
                <p><strong>Remaining:</strong> {formatCurrency(selectedAP.amount_remaining)}</p>
              </div>
              <div className="payment-history-list">
                {paymentHistory.length === 0 ? (
                  <p>No payments recorded yet.</p>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td>{formatCurrency(payment.amount_paid)}</td>
                          <td>{payment.payment_method}</td>
                          <td>{payment.reference_number || '-'}</td>
                          <td>{payment.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowPaymentHistory(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vendor Modal */}
        {showVendorModal && (
          <div className="modal-overlay" onClick={() => setShowVendorModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Add New Vendor</h2>
              <form onSubmit={handleAddVendor}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vendor Name *</label>
                    <input
                      type="text"
                      value={vendorFormData.vendor_name}
                      onChange={(e) => setVendorFormData({...vendorFormData, vendor_name: e.target.value})}
                      required
                      placeholder="e.g., ABC Supplies"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={vendorFormData.contact_person}
                      onChange={(e) => setVendorFormData({...vendorFormData, contact_person: e.target.value})}
                      placeholder="Primary contact"
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
                    placeholder="Street address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={vendorFormData.city}
                      onChange={(e) => setVendorFormData({...vendorFormData, city: e.target.value})}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={vendorFormData.state}
                      onChange={(e) => setVendorFormData({...vendorFormData, state: e.target.value})}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Terms Type</label>
                    <select
                      value={vendorFormData.payment_terms_type}
                      onChange={(e) => setVendorFormData({...vendorFormData, payment_terms_type: e.target.value})}
                    >
                      <option value="net_days">Net Days</option>
                      <option value="discount">Early Payment Discount</option>
                      <option value="specific_dates">Specific Payment Dates</option>
                      <option value="due_on_receipt">Due on Receipt</option>
                    </select>
                  </div>
                  {vendorFormData.payment_terms_type === 'net_days' && (
                    <div className="form-group">
                      <label>Net Days</label>
                      <input
                        type="number"
                        value={vendorFormData.payment_net_days}
                        onChange={(e) => setVendorFormData({...vendorFormData, payment_net_days: e.target.value})}
                        placeholder="30"
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={vendorFormData.notes}
                    onChange={(e) => setVendorFormData({...vendorFormData, notes: e.target.value})}
                    rows="2"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowVendorModal(false)}>
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

        {/* Upload Document Modal */}
        {showUploadModal && selectedAPForUpload && (
          <div className="modal-overlay" onClick={() => {
            setShowUploadModal(false);
            setSelectedAPForUpload(null);
            setUploadFile(null);
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedAPForUpload.invoice_file_url ? 'Replace' : 'Upload'} Invoice Document</h2>
              <div className="upload-info">
                <p><strong>Vendor:</strong> {selectedAPForUpload.vendors?.vendor_name}</p>
                <p><strong>Invoice:</strong> {selectedAPForUpload.invoice_number}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedAPForUpload.amount)}</p>
                {selectedAPForUpload.invoice_file_name && (
                  <p><strong>Current File:</strong> {selectedAPForUpload.invoice_file_name}</p>
                )}
              </div>
              <form onSubmit={handleUploadDocument}>
                <div className="form-group">
                  <label>Select Invoice File *</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                  />
                  <small>Accepted formats: PDF, JPG, PNG (max 10MB)</small>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedAPForUpload(null);
                      setUploadFile(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? 'Uploading...' : selectedAPForUpload.invoice_file_url ? 'Replace Document' : 'Upload Document'}
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
