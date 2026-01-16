import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Navigation from '../components/Navigation'
import './Services.css'

const Services = () => {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'basic_detail',
    base_price: '',
    duration_minutes: '',
    cost: '',
    sku: '',
    is_active: true
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const categories = [
    { value: 'basic_detail', label: 'Basic Detail' },
    { value: 'premium_detail', label: 'Premium Detail' },
    { value: 'interior', label: 'Interior Detailing' },
    { value: 'exterior', label: 'Exterior Detailing' },
    { value: 'ceramic_coating', label: 'Ceramic Coating' },
    { value: 'paint_correction', label: 'Paint Correction' },
    { value: 'addon', label: 'Add-on Service' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    fetchServices()
  }, [user])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setError('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'basic_detail',
      base_price: '',
      duration_minutes: '',
      cost: '',
      sku: '',
      is_active: true
    })
    setEditingService(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.name.trim()) {
      setError('Service name is required')
      return
    }
    if (!formData.base_price || parseFloat(formData.base_price) < 0) {
      setError('Valid price is required')
      return
    }

    try {
      const serviceData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        sku: formData.sku.trim() || null,
        is_active: formData.is_active
      }

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
          .eq('user_id', user.id)

        if (error) throw error
        setSuccess('Service updated successfully!')
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert([serviceData])

        if (error) throw error
        setSuccess('Service added successfully!')
      }

      await fetchServices()
      resetForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving service:', error)
      setError(error.message || 'Failed to save service')
    }
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category || 'basic_detail',
      base_price: service.base_price.toString(),
      duration_minutes: service.duration_minutes ? service.duration_minutes.toString() : '',
      cost: service.cost ? service.cost.toString() : '',
      sku: service.sku || '',
      is_active: service.is_active
    })
    setShowForm(true)
    setError('')
  }

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('user_id', user.id)

      if (error) throw error
      setSuccess('Service deleted successfully!')
      await fetchServices()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting service:', error)
      setError('Failed to delete service')
    }
  }

  const toggleActive = async (service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchServices()
    } catch (error) {
      console.error('Error toggling service status:', error)
      setError('Failed to update service status')
    }
  }

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue)
    return category ? category.label : categoryValue
  }

  const calculateProfit = (price, cost) => {
    if (!cost) return null
    const profit = price - cost
    const margin = ((profit / price) * 100).toFixed(1)
    return { profit, margin }
  }

  if (loading) {
    return (
      <div className="services-page">
        <Navigation />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="services-page">
      <Navigation />
      <div className="services-container">
        <div className="services-header">
          <h1>Services</h1>
          <button 
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Service'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {showForm && (
          <div className="service-form-card">
            <h2>{editingService ? 'Edit Service' : 'Add New Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Service Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Basic Detail, Elite Detail"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what's included in this service..."
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="base_price">Price ($) *</label>
                  <input
                    type="number"
                    id="base_price"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="duration_minutes">Duration (minutes)</label>
                  <input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    placeholder="e.g., 60"
                    min="0"
                  />
                  <small>Estimated time to complete</small>
                </div>

                <div className="form-group">
                  <label htmlFor="cost">Cost ($)</label>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <small>Your cost (for profit tracking)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sku">Service Code</label>
                  <input
                    type="text"
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Optional service code"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span>Active (available for sale)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="services-list">
          {services.length === 0 ? (
            <div className="empty-state">
              <h3>No services yet</h3>
              <p>Add your first service to get started!</p>
            </div>
          ) : (
            <div className="services-grid">
              {services.map(service => {
                const profitData = calculateProfit(service.base_price, service.cost)
                return (
                  <div key={service.id} className={`service-card ${!service.is_active ? 'inactive' : ''}`}>
                    <div className="service-header">
                      <div>
                        <h3>{service.name}</h3>
                        {service.category && (
                          <span className="service-category">{getCategoryLabel(service.category)}</span>
                        )}
                      </div>
                      <div className="service-status">
                        <button
                          className={`status-badge ${service.is_active ? 'active' : 'inactive'}`}
                          onClick={() => toggleActive(service)}
                          title="Click to toggle status"
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>

                    {service.description && (
                      <p className="service-description">{service.description}</p>
                    )}

                    <div className="service-details">
                      <div className="detail-row">
                        <span className="label">Price:</span>
                        <span className="value price">${service.base_price.toFixed(2)}</span>
                      </div>
                      {service.duration_minutes && (
                        <div className="detail-row">
                          <span className="label">Duration:</span>
                          <span className="value">{service.duration_minutes} min</span>
                        </div>
                      )}
                      {service.cost && (
                        <>
                          <div className="detail-row">
                            <span className="label">Cost:</span>
                            <span className="value">${service.cost.toFixed(2)}</span>
                          </div>
                          {profitData && (
                            <div className="detail-row profit">
                              <span className="label">Profit:</span>
                              <span className="value">
                                ${profitData.profit.toFixed(2)} ({profitData.margin}%)
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {service.sku && (
                        <div className="detail-row">
                          <span className="label">Code:</span>
                          <span className="value">{service.sku}</span>
                        </div>
                      )}
                    </div>

                    <div className="service-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(service.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Services
