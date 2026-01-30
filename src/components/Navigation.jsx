import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [isManagementOpen, setIsManagementOpen] = useState(false)
  const [isSalesOpen, setIsSalesOpen] = useState(false)
  const managementDropdownRef = useRef(null)
  const salesDropdownRef = useRef(null)

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path) => {
    return location.pathname === path ? 'navbar-link active' : 'navbar-link'
  }

  const isManagementActive = () => {
    const managementPaths = ['/employees', '/accounts-receivable', '/accounts-payable', '/general-ledger', '/profile', '/services', '/vendors', '/inventory']
    return managementPaths.includes(location.pathname)
  }

  const isSalesActive = () => {
    const salesPaths = ['/sales', '/crm', '/customers']
    return salesPaths.includes(location.pathname)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (managementDropdownRef.current && !managementDropdownRef.current.contains(event.target)) {
        setIsManagementOpen(false)
      }
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setIsSalesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="navbar">
      <div className="navbar-brand">DetailManager</div>
      <div className="navbar-menu">
        <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/calendar" className={isActive('/calendar')}>Calendar</Link>
        
        {/* Sales & CRM Dropdown */}
        <div className="navbar-dropdown" ref={salesDropdownRef}>
          <button 
            className={`navbar-link navbar-dropdown-toggle ${isSalesActive() ? 'active' : ''}`}
            onClick={() => setIsSalesOpen(!isSalesOpen)}
          >
            Sales & CRM ▾
          </button>
          {isSalesOpen && (
            <div className="navbar-dropdown-menu">
              <Link 
                to="/sales" 
                className="navbar-dropdown-item"
                onClick={() => setIsSalesOpen(false)}
              >
                Sales
              </Link>
              <Link 
                to="/crm" 
                className="navbar-dropdown-item"
                onClick={() => setIsSalesOpen(false)}
              >
                CRM
              </Link>
              <Link 
                to="/customers" 
                className="navbar-dropdown-item"
                onClick={() => setIsSalesOpen(false)}
              >
                Customers
              </Link>
            </div>
          )}
        </div>
        
        {/* Management Dropdown */}
        <div className="navbar-dropdown" ref={managementDropdownRef}>
          <button 
            className={`navbar-link navbar-dropdown-toggle ${isManagementActive() ? 'active' : ''}`}
            onClick={() => setIsManagementOpen(!isManagementOpen)}
          >
            Management ▾
          </button>
          {isManagementOpen && (
            <div className="navbar-dropdown-menu">
              <Link 
                to="/employees" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Employees
              </Link>
              <Link 
                to="/accounts-receivable" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Accounts Receivable
              </Link>
              <Link 
                to="/accounts-payable" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Accounts Payable
              </Link>
              <Link 
                to="/general-ledger" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                General Ledger
              </Link>
              <Link 
                to="/services" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/inventory" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Inventory
              </Link>
              <Link 
                to="/vendors" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Vendors
              </Link>
              <Link 
                to="/profile" 
                className="navbar-dropdown-item"
                onClick={() => setIsManagementOpen(false)}
              >
                Profile
              </Link>
            </div>
          )}
        </div>

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
