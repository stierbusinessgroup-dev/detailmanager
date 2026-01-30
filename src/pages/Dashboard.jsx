import React, { useState, useEffect } from 'react'
import Navigation from '../components/Navigation'
import './Dashboard.css'

function Dashboard() {
  const [time, setTime] = useState(new Date())
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    setTimeout(() => setStatsLoaded(true), 100)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="dashboard-container cod-theme">
      <Navigation />

      <main className="main-content cod-main">
        {/* Header */}
        <div className="cod-header">
          <div className="cod-header-left">
            <div className="cod-title-wrapper">
              <h1 className="cod-title">
                <span className="cod-title-icon">📊</span>
                Dashboard
              </h1>
              <div className="cod-subtitle">Welcome to DetailManager</div>
            </div>
          </div>
          <div className="cod-header-right">
            <div className="cod-time-display">
              <div className="cod-time">{formatTime(time)}</div>
              <div className="cod-date">{formatDate(time)}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="cod-stats-grid">
          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.1s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">💰</span>
              <span className="cod-stat-label">Total Revenue</span>
            </div>
            <div className="cod-stat-value">$0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0%</span>
              <span className="cod-stat-period">vs last month</span>
            </div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.2s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">👥</span>
              <span className="cod-stat-label">Active Clients</span>
            </div>
            <div className="cod-stat-value">0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0</span>
              <span className="cod-stat-period">new this week</span>
            </div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.3s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">📋</span>
              <span className="cod-stat-label">Pending Jobs</span>
            </div>
            <div className="cod-stat-value">0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change neutral">0</span>
              <span className="cod-stat-period">in queue</span>
            </div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.4s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">📊</span>
              <span className="cod-stat-label">This Month</span>
            </div>
            <div className="cod-stat-value">$0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0%</span>
              <span className="cod-stat-period">of target</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
