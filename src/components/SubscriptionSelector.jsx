import React from 'react'
import './SubscriptionSelector.css'

const SubscriptionSelector = ({ selectedTier, onTierChange, disabled = false }) => {
  const tiers = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 40,
      description: 'Perfect for solo detailers',
      features: [
        '1 User Account',
        'Sales Management',
        'Client Database',
        'Appointment Scheduling',
        'Mobile & Web Access'
      ]
    },
    {
      id: 'team',
      name: 'Team',
      price: 200,
      description: 'For growing detailing businesses',
      features: [
        'Unlimited Users',
        'Sales Management',
        'Client Database',
        'Appointment Scheduling',
        'Mobile & Web Access',
        'Team Collaboration',
        'Advanced Reporting'
      ],
      popular: true
    }
  ]

  return (
    <div className="subscription-selector">
      <div className="subscription-header">
        <h3>Choose Your Plan</h3>
        <p className="trial-badge">🎉 14-Day Free Trial Included</p>
      </div>
      
      <div className="subscription-tiers">
        {tiers.map(tier => (
          <div
            key={tier.id}
            className={`subscription-tier ${selectedTier === tier.id ? 'selected' : ''} ${tier.popular ? 'popular' : ''}`}
            onClick={() => !disabled && onTierChange(tier.id)}
          >
            {tier.popular && <div className="popular-badge">Most Popular</div>}
            
            <div className="tier-header">
              <h4>{tier.name}</h4>
              <div className="tier-price">
                <span className="price-amount">${tier.price}</span>
                <span className="price-period">/month</span>
              </div>
              <p className="tier-description">{tier.description}</p>
            </div>

            <ul className="tier-features">
              {tier.features.map((feature, index) => (
                <li key={index}>
                  <span className="feature-icon">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="tier-select-indicator">
              {selectedTier === tier.id ? '● Selected' : 'Select Plan'}
            </div>
          </div>
        ))}
      </div>

      <p className="subscription-note">
        * You won't be charged during your 14-day free trial. Cancel anytime.
      </p>
    </div>
  )
}

export default SubscriptionSelector
