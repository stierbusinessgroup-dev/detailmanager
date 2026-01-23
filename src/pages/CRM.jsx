import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import './CRM.css';

function CRM() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [summary, setSummary] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showInteractionForm, setShowInteractionForm] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    position: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    preferred_contact_method: 'email',
    contact_status: 'lead',
    lead_source: '',
    lead_score: 0,
    tags: [],
    industry: '',
    notes: '',
    next_follow_up_date: '',
    linkedin_url: '',
    facebook_url: '',
    twitter_url: '',
    instagram_url: ''
  });

  const [interactionData, setInteractionData] = useState({
    interaction_type: 'note',
    subject: '',
    description: '',
    outcome: '',
    next_action: '',
    next_action_date: ''
  });

  const contactStatuses = [
    { value: 'lead', label: 'Lead', color: '#6366f1' },
    { value: 'prospect', label: 'Prospect', color: '#8b5cf6' },
    { value: 'customer', label: 'Customer', color: '#10b981' },
    { value: 'vip', label: 'VIP', color: '#f59e0b' },
    { value: 'inactive', label: 'Inactive', color: '#6b7280' },
    { value: 'lost', label: 'Lost', color: '#ef4444' }
  ];

  const leadSources = [
    'Referral', 'Website', 'Social Media', 'Advertising', 
    'Trade Show', 'Cold Call', 'Email Campaign', 'Other'
  ];

  const interactionTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'note', label: 'Note' },
    { value: 'task', label: 'Task' }
  ];

  useEffect(() => {
    fetchContacts();
    fetchSummary();
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, filterStatus, filterTag]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      alert('Error loading contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .rpc('get_crm_summary', { p_user_id: user.id });

      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all unique tags from contacts
      const { data, error } = await supabase
        .from('customers')
        .select('tags')
        .eq('user_id', user.id);

      if (error) throw error;

      const allTags = new Set();
      data.forEach(contact => {
        if (contact.tags) {
          contact.tags.forEach(tag => allTags.add(tag));
        }
      });

      setAvailableTags(Array.from(allTags));
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchContactDetails = async (contactId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .rpc('get_customer_details', { 
          p_customer_id: contactId, 
          p_user_id: user.id 
        });

      if (error) throw error;

      setInteractions(data.interactions || []);
      setPurchases(data.purchases || []);
      setUpcomingEvents(data.upcoming_events || []);
    } catch (error) {
      console.error('Error fetching contact details:', error);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.first_name?.toLowerCase().includes(term) ||
        contact.last_name?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.company?.toLowerCase().includes(term) ||
        contact.phone?.includes(term)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(contact => contact.contact_status === filterStatus);
    }

    // Filter by tag
    if (filterTag !== 'all') {
      filtered = filtered.filter(contact => 
        contact.tags && contact.tags.includes(filterTag)
      );
    }

    setFilteredContacts(filtered);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleAddCustomTag = () => {
    const customTag = prompt('Enter custom tag:');
    if (customTag && customTag.trim()) {
      const tag = customTag.trim();
      if (!formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        if (!availableTags.includes(tag)) {
          setAvailableTags(prev => [...prev, tag]);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (selectedContact) {
        // Update existing contact
        const { error } = await supabase
          .from('customers')
          .update({
            ...formData,
            user_id: user.id
          })
          .eq('id', selectedContact.id);

        if (error) throw error;
        alert('Contact updated successfully!');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('customers')
          .insert([{
            ...formData,
            user_id: user.id
          }]);

        if (error) throw error;
        alert('Contact created successfully!');
      }

      setShowForm(false);
      resetForm();
      fetchContacts();
      fetchSummary();
      fetchAvailableTags();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Error saving contact: ' + error.message);
    }
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      company: contact.company || '',
      position: contact.position || '',
      website: contact.website || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zip || '',
      country: contact.country || 'USA',
      preferred_contact_method: contact.preferred_contact_method || 'email',
      contact_status: contact.contact_status || 'lead',
      lead_source: contact.lead_source || '',
      lead_score: contact.lead_score || 0,
      tags: contact.tags || [],
      industry: contact.industry || '',
      notes: contact.notes || '',
      next_follow_up_date: contact.next_follow_up_date || '',
      linkedin_url: contact.linkedin_url || '',
      facebook_url: contact.facebook_url || '',
      twitter_url: contact.twitter_url || '',
      instagram_url: contact.instagram_url || ''
    });
    setShowForm(true);
  };

  const handleViewDetails = async (contact) => {
    setSelectedContact(contact);
    await fetchContactDetails(contact.id);
    setShowDetail(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Contact deleted successfully!');
      fetchContacts();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Error deleting contact');
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('crm_interactions')
        .insert([{
          ...interactionData,
          customer_id: selectedContact.id,
          user_id: user.id,
          interaction_date: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update last contact date
      await supabase
        .from('customers')
        .update({ last_contact_date: new Date().toISOString().split('T')[0] })
        .eq('id', selectedContact.id);

      alert('Interaction added successfully!');
      setShowInteractionForm(false);
      setInteractionData({
        interaction_type: 'note',
        subject: '',
        description: '',
        outcome: '',
        next_action: '',
        next_action_date: ''
      });
      
      // Refresh contact details
      await fetchContactDetails(selectedContact.id);
      fetchContacts();
    } catch (error) {
      console.error('Error adding interaction:', error);
      alert('Error adding interaction');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      company: '',
      position: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      preferred_contact_method: 'email',
      contact_status: 'lead',
      lead_source: '',
      lead_score: 0,
      tags: [],
      industry: '',
      notes: '',
      next_follow_up_date: '',
      linkedin_url: '',
      facebook_url: '',
      twitter_url: '',
      instagram_url: ''
    });
    setSelectedContact(null);
  };

  const getStatusColor = (status) => {
    const statusObj = contactStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : '#6b7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="crm-container"><div className="loading">Loading contacts...</div></div>;
  }

  return (
    <div className="crm-container">
      <Navigation />
      
      <main className="main-content">
      <div className="crm-header">
        <h1>CRM - Contact Management</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Contact
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="crm-summary">
          <div className="summary-card">
            <div className="summary-label">Total Contacts</div>
            <div className="summary-value">{summary.total_contacts}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Leads</div>
            <div className="summary-value" style={{ color: '#6366f1' }}>{summary.leads}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Customers</div>
            <div className="summary-value" style={{ color: '#10b981' }}>{summary.customers}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">VIPs</div>
            <div className="summary-value" style={{ color: '#f59e0b' }}>{summary.vips}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Lifetime Value</div>
            <div className="summary-value">{formatCurrency(summary.total_lifetime_value)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Need Follow-up</div>
            <div className="summary-value" style={{ color: '#ef4444' }}>{summary.contacts_needing_follow_up}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="crm-filters">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          {contactStatuses.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>

        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="filter-select">
          <option value="all">All Tags</option>
          {availableTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Contacts List */}
      <div className="contacts-grid">
        {filteredContacts.length === 0 ? (
          <div className="no-contacts">
            <p>No contacts found. Add your first contact to get started!</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-card-header">
                <div className="contact-name">
                  {contact.first_name} {contact.last_name}
                </div>
                <span 
                  className="contact-status-badge" 
                  style={{ backgroundColor: getStatusColor(contact.contact_status) }}
                >
                  {contact.contact_status}
                </span>
              </div>
              
              <div className="contact-card-body">
                {contact.company && <div className="contact-info">🏢 {contact.company}</div>}
                {contact.position && <div className="contact-info">💼 {contact.position}</div>}
                {contact.email && <div className="contact-info">📧 {contact.email}</div>}
                {contact.phone && <div className="contact-info">📞 {contact.phone}</div>}
                
                {contact.tags && contact.tags.length > 0 && (
                  <div className="contact-tags">
                    {contact.tags.map(tag => (
                      <span key={tag} className="tag-badge">{tag}</span>
                    ))}
                  </div>
                )}

                {contact.lifetime_value > 0 && (
                  <div className="contact-value">
                    💰 Lifetime Value: {formatCurrency(contact.lifetime_value)}
                  </div>
                )}

                {contact.next_follow_up_date && (
                  <div className="contact-follow-up">
                    📅 Follow-up: {formatDate(contact.next_follow_up_date)}
                  </div>
                )}
              </div>

              <div className="contact-card-actions">
                <button onClick={() => handleViewDetails(contact)} className="btn-view">
                  View Details
                </button>
                <button onClick={() => handleEdit(contact)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDelete(contact.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedContact ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Preferred Contact Method</label>
                    <select name="preferred_contact_method" value={formData.preferred_contact_method} onChange={handleChange}>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="mobile">Mobile</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Company Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
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
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>CRM Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Status</label>
                    <select name="contact_status" value={formData.contact_status} onChange={handleChange}>
                      {contactStatuses.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Lead Source</label>
                    <select name="lead_source" value={formData.lead_source} onChange={handleChange}>
                      <option value="">Select source...</option>
                      {leadSources.map(source => (
                        <option key={source} value={source.toLowerCase().replace(' ', '_')}>{source}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Lead Score (0-100)</label>
                    <input
                      type="number"
                      name="lead_score"
                      min="0"
                      max="100"
                      value={formData.lead_score}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Next Follow-up Date</label>
                    <input
                      type="date"
                      name="next_follow_up_date"
                      value={formData.next_follow_up_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Tags</label>
                  <div className="tags-selector">
                    {availableTags.map(tag => (
                      <label key={tag} className="tag-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.tags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                        />
                        <span>{tag}</span>
                      </label>
                    ))}
                    <button type="button" onClick={handleAddCustomTag} className="btn-add-tag">
                      + Add Custom Tag
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Social Media</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input
                      type="url"
                      name="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Facebook URL</label>
                    <input
                      type="url"
                      name="facebook_url"
                      value={formData.facebook_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Twitter URL</label>
                    <input
                      type="url"
                      name="twitter_url"
                      value={formData.twitter_url}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Instagram URL</label>
                    <input
                      type="url"
                      name="instagram_url"
                      value={formData.instagram_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Notes</h3>
                <div className="form-group">
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Add any additional notes about this contact..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showDetail && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedContact.first_name} {selectedContact.last_name}</h2>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>

            <div className="contact-detail">
              <div className="detail-section">
                <h3>Contact Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <span 
                      className="contact-status-badge" 
                      style={{ backgroundColor: getStatusColor(selectedContact.contact_status) }}
                    >
                      {selectedContact.contact_status}
                    </span>
                  </div>
                  {selectedContact.email && (
                    <div className="detail-item">
                      <strong>Email:</strong> <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="detail-item">
                      <strong>Phone:</strong> <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>
                    </div>
                  )}
                  {selectedContact.mobile && (
                    <div className="detail-item">
                      <strong>Mobile:</strong> <a href={`tel:${selectedContact.mobile}`}>{selectedContact.mobile}</a>
                    </div>
                  )}
                  {selectedContact.company && (
                    <div className="detail-item">
                      <strong>Company:</strong> {selectedContact.company}
                    </div>
                  )}
                  {selectedContact.position && (
                    <div className="detail-item">
                      <strong>Position:</strong> {selectedContact.position}
                    </div>
                  )}
                  {selectedContact.lead_source && (
                    <div className="detail-item">
                      <strong>Lead Source:</strong> {selectedContact.lead_source}
                    </div>
                  )}
                  {selectedContact.lead_score > 0 && (
                    <div className="detail-item">
                      <strong>Lead Score:</strong> {selectedContact.lead_score}/100
                    </div>
                  )}
                </div>

                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div className="detail-tags">
                    <strong>Tags:</strong>
                    <div className="contact-tags">
                      {selectedContact.tags.map(tag => (
                        <span key={tag} className="tag-badge">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Financial Summary</h3>
                <div className="financial-summary">
                  <div className="financial-item">
                    <div className="financial-label">Lifetime Value</div>
                    <div className="financial-value">{formatCurrency(selectedContact.lifetime_value)}</div>
                  </div>
                  <div className="financial-item">
                    <div className="financial-label">Total Purchases</div>
                    <div className="financial-value">{selectedContact.total_purchases || 0}</div>
                  </div>
                  <div className="financial-item">
                    <div className="financial-label">Last Purchase</div>
                    <div className="financial-value">{formatDate(selectedContact.last_purchase_date)}</div>
                  </div>
                </div>
              </div>

              {purchases.length > 0 && (
                <div className="detail-section">
                  <h3>Purchase History</h3>
                  <div className="purchases-list">
                    {purchases.map(purchase => (
                      <div key={purchase.id} className="purchase-item">
                        <div className="purchase-date">{formatDate(purchase.sale_date)}</div>
                        <div className="purchase-amount">{formatCurrency(purchase.total_amount)}</div>
                        <div className="purchase-status">{purchase.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcomingEvents.length > 0 && (
                <div className="detail-section">
                  <h3>Upcoming Events</h3>
                  <div className="events-list">
                    {upcomingEvents.map(event => (
                      <div key={event.id} className="event-item">
                        <div className="event-date">{formatDate(event.event_date)}</div>
                        <div className="event-title">{event.title}</div>
                        <div className="event-type">{event.event_type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <div className="section-header">
                  <h3>Interactions</h3>
                  <button 
                    className="btn-primary btn-small" 
                    onClick={() => setShowInteractionForm(true)}
                  >
                    + Add Interaction
                  </button>
                </div>

                {showInteractionForm && (
                  <form onSubmit={handleAddInteraction} className="interaction-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Type</label>
                        <select 
                          value={interactionData.interaction_type}
                          onChange={(e) => setInteractionData(prev => ({ ...prev, interaction_type: e.target.value }))}
                          required
                        >
                          {interactionTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Subject</label>
                        <input
                          type="text"
                          value={interactionData.subject}
                          onChange={(e) => setInteractionData(prev => ({ ...prev, subject: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={interactionData.description}
                        onChange={(e) => setInteractionData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Outcome</label>
                        <input
                          type="text"
                          value={interactionData.outcome}
                          onChange={(e) => setInteractionData(prev => ({ ...prev, outcome: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Next Action Date</label>
                        <input
                          type="date"
                          value={interactionData.next_action_date}
                          onChange={(e) => setInteractionData(prev => ({ ...prev, next_action_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" onClick={() => setShowInteractionForm(false)} className="btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Add Interaction
                      </button>
                    </div>
                  </form>
                )}

                <div className="interactions-list">
                  {interactions.length === 0 ? (
                    <p className="no-data">No interactions recorded yet.</p>
                  ) : (
                    interactions.map(interaction => (
                      <div key={interaction.id} className="interaction-item">
                        <div className="interaction-header">
                          <span className="interaction-type">{interaction.interaction_type}</span>
                          <span className="interaction-date">{formatDate(interaction.interaction_date)}</span>
                        </div>
                        <div className="interaction-subject">{interaction.subject}</div>
                        {interaction.description && (
                          <div className="interaction-description">{interaction.description}</div>
                        )}
                        {interaction.outcome && (
                          <div className="interaction-outcome">Outcome: {interaction.outcome}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedContact.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <div className="notes-content">{selectedContact.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default CRM;
