import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import SubscriptionSelector from '../components/SubscriptionSelector'
import { isWebPlatform } from '../utils/platform'

const Profile = () => {
  const { user, profile, fetchProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const showSubscription = isWebPlatform()
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    phone: '',
    address: '',
    websiteUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    subscriptionTier: 'monthly'
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.business_name || '',
        businessType: profile.business_type || '',
        phone: profile.phone || '',
        address: profile.address || '',
        websiteUrl: profile.website_url || '',
        facebookUrl: profile.facebook_url || '',
        instagramUrl: profile.instagram_url || '',
        tiktokUrl: profile.tiktok_url || '',
        subscriptionTier: profile.subscription_tier || 'monthly'
      })
    }
  }, [profile])

  // Calculate trial days remaining
  const getTrialDaysRemaining = () => {
    if (!profile?.trial_ends_at) return 0
    const trialEnd = new Date(profile.trial_ends_at)
    const now = new Date()
    const diffTime = trialEnd - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getSubscriptionStatusText = () => {
    if (!profile) return 'Loading...'
    
    const status = profile.subscription_status
    const daysRemaining = getTrialDaysRemaining()
    
    if (status === 'trial') {
      return `Free Trial (${daysRemaining} days remaining)`
    } else if (status === 'active') {
      return 'Active'
    } else if (status === 'expired') {
      return 'Expired'
    } else if (status === 'cancelled') {
      return 'Cancelled'
    }
    return status
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear messages when user starts typing
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    // Validation
    if (!formData.businessName.trim()) {
      setError('Business/Name is required')
      setSaving(false)
      return
    }

    if (!formData.businessType) {
      setError('Please select your business type')
      setSaving(false)
      return
    }

    try {
      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          business_name: formData.businessName,
          business_type: formData.businessType,
          phone: formData.phone || null,
          address: formData.address || null,
          website_url: formData.websiteUrl || null,
          facebook_url: formData.facebookUrl || null,
          instagram_url: formData.instagramUrl || null,
          tiktok_url: formData.tiktokUrl || null,
          subscription_tier: formData.subscriptionTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Refresh profile data
      await fetchProfile(user.id)
      
      setSuccess('Profile updated successfully!')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-container">
      <Navigation />

      <main className="main-content">
        <div className="page-header">
          <h1>Profile Settings</h1>
          <p>Manage your business information and preferences</p>
        </div>

        <div className="card">
          <h2>Business Information</h2>
          
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" style={{ marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="businessName">
                Business Name / Your Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter your business or personal name"
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="businessType">
                Business Type <span className="required">*</span>
              </label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                required
                disabled={saving}
              >
                <option value="">Select your business type</option>
                <option value="store">Store / Shop</option>
                <option value="solo">Solo Detailer</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Business Address</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your business address"
                rows="3"
                disabled={saving}
              />
            </div>

            <div className="form-section-header">
              <h3>Social Media & Online Presence</h3>
              <p className="form-section-description">Add your social media links to help clients find you online</p>
            </div>

            <div className="form-group">
              <label htmlFor="websiteUrl">Website</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="https://www.yourwebsite.com"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="facebookUrl">Facebook</label>
              <input
                type="url"
                id="facebookUrl"
                name="facebookUrl"
                value={formData.facebookUrl}
                onChange={handleChange}
                placeholder="https://www.facebook.com/yourpage"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="instagramUrl">Instagram</label>
              <input
                type="url"
                id="instagramUrl"
                name="instagramUrl"
                value={formData.instagramUrl}
                onChange={handleChange}
                placeholder="https://www.instagram.com/youraccount"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tiktokUrl">TikTok</label>
              <input
                type="url"
                id="tiktokUrl"
                name="tiktokUrl"
                value={formData.tiktokUrl}
                onChange={handleChange}
                placeholder="https://www.tiktok.com/@youraccount"
                disabled={saving}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {showSubscription && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2>Subscription Management</h2>
            <div className="info-row">
              <span className="info-label">Current Plan:</span>
              <span className="info-value">
                {formData.subscriptionTier === 'monthly' ? 'Monthly ($40/month)' : 'Team ($200/month)'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">{getSubscriptionStatusText()}</span>
            </div>
            {profile?.subscription_status === 'trial' && (
              <div className="info-row">
                <span className="info-label">Trial Ends:</span>
                <span className="info-value">
                  {profile?.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Change Plan</h3>
              <SubscriptionSelector
                selectedTier={formData.subscriptionTier}
                onTierChange={(tier) => setFormData(prev => ({ ...prev, subscriptionTier: tier }))}
                disabled={saving}
              />
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2>Account Information</h2>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Created:</span>
            <span className="info-value">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
