import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import SubscriptionSelector from '../components/SubscriptionSelector'
import { isWebPlatform } from '../utils/platform'
import '../App.css'

const ProfileSetup = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
  const showSubscription = isWebPlatform()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.businessName.trim()) {
      setError('Business/Name is required')
      setLoading(false)
      return
    }

    if (!formData.businessType) {
      setError('Please select your business type')
      setLoading(false)
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
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Navigate to dashboard after successful profile setup
      navigate('/dashboard')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Complete Your Profile</h1>
          <p>Let's set up your account with some basic information</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <div className="form-section-header">
            <h3>Social Media & Online Presence</h3>
            <p className="form-section-description">Add your social media links to help clients find you online (optional)</p>
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          {showSubscription && (
            <>
              <div className="form-section-header">
                <h3>Subscription Plan</h3>
                <p className="form-section-description">Choose the plan that best fits your business needs</p>
              </div>

              <SubscriptionSelector
                selectedTier={formData.subscriptionTier}
                onTierChange={(tier) => setFormData(prev => ({ ...prev, subscriptionTier: tier }))}
                disabled={loading}
              />
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetup
