import React from 'react'
import Navigation from '../components/Navigation'
import EmployeeManagement from '../components/EmployeeManagement'

const EmployeeManagementPage = () => {
  return (
    <div className="app-container">
      <Navigation />
      <div className="main-content">
        <EmployeeManagement />
      </div>
    </div>
  )
}

export default EmployeeManagementPage
