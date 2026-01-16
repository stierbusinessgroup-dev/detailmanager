import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path) => {
    return location.pathname === path ? 'navbar-link active' : 'navbar-link'
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">DetailManager</div>
      <div className="navbar-menu">
        <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/sales" className={isActive('/sales')}>Sales</Link>
        <Link to="/services" className={isActive('/services')}>Services</Link>
        <Link to="/profile" className={isActive('/profile')}>Profile</Link>
        <div className="navbar-user">
          <span>{user?.email}</span>
          <button onClick={handleSignOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
