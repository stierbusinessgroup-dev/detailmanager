import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      // This will be implemented once we set up the database tables
      // For now, just show empty state
      setSales([])
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <Navigation />

      <main className="main-content">
        <div className="page-header">
          <h1>Sales Management</h1>
          <p>Track and manage all your detailing sales</p>
        </div>

        <div className="card">
          {loading ? (
            <p>Loading sales...</p>
          ) : sales.length === 0 ? (
            <div>
              <h2>No Sales Yet</h2>
              <p>Start tracking your detailing business sales. Add your first sale to get started!</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Add New Sale
              </button>
            </div>
          ) : (
            <div>
              <h2>Recent Sales</h2>
              {/* Sales list will go here */}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Sales
