import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">DetailManager</div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          <Link to="/sales" className="navbar-link">Sales</Link>
          <div className="navbar-user">
            <span>{user?.email}</span>
            <button onClick={handleSignOut} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your business.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Sales</h3>
            <div className="stat-value">$0</div>
          </div>
          <div className="stat-card">
            <h3>Active Clients</h3>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <h3>Pending Jobs</h3>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <h3>This Month</h3>
            <div className="stat-value">$0</div>
          </div>
        </div>

        <div className="card">
          <h2>Getting Started</h2>
          <p>Your DetailManager account is set up! Start by adding your first client or creating a sales record.</p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
