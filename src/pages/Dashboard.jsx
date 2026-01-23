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
        {/* Tactical Header */}
        <div className="cod-header">
          <div className="cod-header-left">
            <div className="cod-title-wrapper">
              <div className="cod-corner-tl"></div>
              <div className="cod-corner-tr"></div>
              <h1 className="cod-title">
                <span className="cod-title-icon">◢</span>
                TACTICAL COMMAND CENTER
                <span className="cod-title-icon">◣</span>
              </h1>
              <div className="cod-subtitle">OPERATION: DETAIL MANAGEMENT</div>
              <div className="cod-corner-bl"></div>
              <div className="cod-corner-br"></div>
            </div>
          </div>
          <div className="cod-header-right">
            <div className="cod-time-display">
              <div className="cod-time">{formatTime(time)}</div>
              <div className="cod-date">{formatDate(time)}</div>
            </div>
            <div className="cod-status-indicator">
              <span className="cod-status-dot"></span>
              SYSTEMS ONLINE
            </div>
          </div>
        </div>

        {/* Tactical Grid Background */}
        <div className="cod-grid-overlay"></div>
        <div className="cod-scanlines"></div>

        {/* Stats Grid - HUD Style */}
        <div className="cod-stats-grid">
          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.1s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">💰</span>
              <span className="cod-stat-label">TOTAL REVENUE</span>
            </div>
            <div className="cod-stat-value">$0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0%</span>
              <span className="cod-stat-period">vs last month</span>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.2s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">👥</span>
              <span className="cod-stat-label">ACTIVE CLIENTS</span>
            </div>
            <div className="cod-stat-value">0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0</span>
              <span className="cod-stat-period">new this week</span>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.3s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">📋</span>
              <span className="cod-stat-label">PENDING JOBS</span>
            </div>
            <div className="cod-stat-value">0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change neutral">0</span>
              <span className="cod-stat-period">in queue</span>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>

          <div className={`cod-stat-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.4s' }}>
            <div className="cod-stat-header">
              <span className="cod-stat-icon">📊</span>
              <span className="cod-stat-label">THIS MONTH</span>
            </div>
            <div className="cod-stat-value">$0</div>
            <div className="cod-stat-bar">
              <div className="cod-stat-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div className="cod-stat-footer">
              <span className="cod-stat-change positive">+0%</span>
              <span className="cod-stat-period">of target</span>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>
        </div>

        {/* Mission Briefing Section */}
        <div className="cod-mission-section">
          <div className={`cod-mission-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.5s' }}>
            <div className="cod-mission-header">
              <span className="cod-mission-icon">⚡</span>
              <h2 className="cod-mission-title">MISSION BRIEFING</h2>
              <div className="cod-mission-status">ACTIVE</div>
            </div>
            <div className="cod-mission-content">
              <p className="cod-mission-text">
                <span className="cod-highlight">COMMANDER</span>, your tactical operations center is now online. 
                All systems are operational and ready for deployment.
              </p>
              <div className="cod-mission-objectives">
                <div className="cod-objective">
                  <span className="cod-objective-marker">▸</span>
                  Deploy first client acquisition protocol
                </div>
                <div className="cod-objective">
                  <span className="cod-objective-marker">▸</span>
                  Initialize sales tracking systems
                </div>
                <div className="cod-objective">
                  <span className="cod-objective-marker">▸</span>
                  Establish operational parameters
                </div>
              </div>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>

          <div className={`cod-intel-card ${statsLoaded ? 'loaded' : ''}`} style={{ animationDelay: '0.6s' }}>
            <div className="cod-intel-header">
              <span className="cod-intel-icon">🎯</span>
              <h3 className="cod-intel-title">TACTICAL INTEL</h3>
            </div>
            <div className="cod-intel-items">
              <div className="cod-intel-item">
                <div className="cod-intel-label">System Status</div>
                <div className="cod-intel-value operational">OPERATIONAL</div>
              </div>
              <div className="cod-intel-item">
                <div className="cod-intel-label">Threat Level</div>
                <div className="cod-intel-value low">LOW</div>
              </div>
              <div className="cod-intel-item">
                <div className="cod-intel-label">Mission Progress</div>
                <div className="cod-intel-value">0%</div>
              </div>
              <div className="cod-intel-item">
                <div className="cod-intel-label">Next Objective</div>
                <div className="cod-intel-value">ADD CLIENT</div>
              </div>
            </div>
            <div className="cod-card-corner cod-card-corner-tl"></div>
            <div className="cod-card-corner cod-card-corner-tr"></div>
            <div className="cod-card-corner cod-card-corner-bl"></div>
            <div className="cod-card-corner cod-card-corner-br"></div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
