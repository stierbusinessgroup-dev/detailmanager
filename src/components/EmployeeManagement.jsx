import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './EmployeeManagement.css';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'schedule'
  const [scheduleData, setScheduleData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    hireDate: '',
    employmentStatus: 'active',
    payRate: '',
    payType: 'hourly',
    address: '',
    city: '',
    state: '',
    zip: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    skills: [],
    certifications: [],
    availabilityNotes: '',
    notes: '',
    profileColor: '#3b82f6'
  });

  const [filterStatus, setFilterStatus] = useState('active');

  const skillOptions = [
    'Interior Detailing',
    'Exterior Detailing',
    'Ceramic Coating',
    'Paint Correction',
    'Window Tinting',
    'Headlight Restoration',
    'Engine Detailing',
    'Upholstery Cleaning',
    'Leather Treatment',
    'Odor Removal'
  ];

  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' }
  ];

  useEffect(() => {
    fetchEmployees();
    fetchWorkload();
  }, [filterStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      let query = supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .order('first_name', { ascending: true });

      if (filterStatus !== 'all') {
        query = query.eq('employment_status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error loading employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_employee_workload', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      setWorkloadData(data || []);
    } catch (error) {
      console.error('Error fetching workload:', error);
    }
  };

  const fetchEmployeeSchedule = async (employeeId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_employee_schedule', {
        p_user_id: user.id,
        p_employee_id: employeeId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      setScheduleData(data || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      const employeeData = {
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        hire_date: formData.hireDate || null,
        employment_status: formData.employmentStatus,
        pay_rate: formData.payRate ? parseFloat(formData.payRate) : null,
        pay_type: formData.payType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        skills: formData.skills,
        certifications: formData.certifications,
        availability_notes: formData.availabilityNotes,
        notes: formData.notes,
        profile_color: formData.profileColor
      };

      let error;
      if (editingEmployee) {
        const result = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('employees')
          .insert([employeeData]);
        error = result.error;
      }

      if (error) throw error;

      alert(editingEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');
      resetForm();
      fetchEmployees();
      fetchWorkload();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee: ' + error.message);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.first_name || '',
      lastName: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      hireDate: employee.hire_date || '',
      employmentStatus: employee.employment_status || 'active',
      payRate: employee.pay_rate || '',
      payType: employee.pay_type || 'hourly',
      address: employee.address || '',
      city: employee.city || '',
      state: employee.state || '',
      zip: employee.zip || '',
      emergencyContactName: employee.emergency_contact_name || '',
      emergencyContactPhone: employee.emergency_contact_phone || '',
      skills: employee.skills || [],
      certifications: employee.certifications || [],
      availabilityNotes: employee.availability_notes || '',
      notes: employee.notes || '',
      profileColor: employee.profile_color || '#3b82f6'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This will remove them from all assigned calendar events.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      alert('Employee deleted successfully!');
      fetchEmployees();
      fetchWorkload();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error deleting employee: ' + error.message);
    }
  };

  const handleViewSchedule = (employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeSchedule(employee.id);
    setViewMode('schedule');
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      hireDate: '',
      employmentStatus: 'active',
      payRate: '',
      payType: 'hourly',
      address: '',
      city: '',
      state: '',
      zip: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      skills: [],
      certifications: [],
      availabilityNotes: '',
      notes: '',
      profileColor: '#3b82f6'
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const getWorkloadForEmployee = (employeeId) => {
    return workloadData.find(w => w.employee_id === employeeId) || {
      total_jobs: 0,
      scheduled_jobs: 0,
      completed_jobs: 0
    };
  };

  if (loading) {
    return <div className="employee-management-loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management">
      <div className="employee-header">
        <h1>👥 Employee Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          ➕ Add Employee
        </button>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          📋 Employee List
        </button>
        <button 
          className={viewMode === 'schedule' ? 'active' : ''}
          onClick={() => {
            if (employees.length > 0) {
              handleViewSchedule(employees[0]);
            }
          }}
          disabled={employees.length === 0}
        >
          📅 Schedule View
        </button>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter */}
          <div className="employee-filters">
            <label>
              Status:
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </label>
          </div>

          {/* Workload Summary */}
          {workloadData.length > 0 && (
            <div className="workload-summary">
              <h3>📊 Current Month Workload</h3>
              <div className="workload-cards">
                {workloadData.map(workload => (
                  <div key={workload.employee_id} className="workload-card">
                    <h4>{workload.employee_name}</h4>
                    <div className="workload-stats">
                      <span>Total: {workload.total_jobs}</span>
                      <span>Scheduled: {workload.scheduled_jobs}</span>
                      <span>Completed: {workload.completed_jobs}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee List */}
          <div className="employee-list">
            {employees.length === 0 ? (
              <div className="no-employees">
                <p>No employees found. Add your first employee to get started!</p>
              </div>
            ) : (
              <div className="employee-grid">
                {employees.map(employee => {
                  const workload = getWorkloadForEmployee(employee.id);
                  return (
                    <div key={employee.id} className="employee-card">
                      <div className="employee-card-header" style={{ borderLeftColor: employee.profile_color }}>
                        <div className="employee-avatar" style={{ backgroundColor: employee.profile_color }}>
                          {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                        <div className="employee-info">
                          <h3>{employee.first_name} {employee.last_name}</h3>
                          <p className="employee-position">{employee.position || 'No position set'}</p>
                          <span className={`status-badge status-${employee.employment_status}`}>
                            {employee.employment_status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="employee-card-body">
                        {employee.email && (
                          <div className="employee-detail">
                            <span className="label">📧 Email:</span>
                            <span>{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="employee-detail">
                            <span className="label">📱 Phone:</span>
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.hire_date && (
                          <div className="employee-detail">
                            <span className="label">📅 Hire Date:</span>
                            <span>{new Date(employee.hire_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.pay_rate && (
                          <div className="employee-detail">
                            <span className="label">💰 Pay Rate:</span>
                            <span>${employee.pay_rate}/{employee.pay_type}</span>
                          </div>
                        )}
                        
                        {employee.skills && employee.skills.length > 0 && (
                          <div className="employee-skills">
                            <span className="label">🛠️ Skills:</span>
                            <div className="skills-tags">
                              {employee.skills.map((skill, idx) => (
                                <span key={idx} className="skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="employee-workload">
                          <span className="label">📊 This Month:</span>
                          <span>{workload.total_jobs} jobs ({workload.completed_jobs} completed)</span>
                        </div>
                      </div>

                      <div className="employee-card-actions">
                        <button className="btn-secondary" onClick={() => handleViewSchedule(employee)}>
                          📅 Schedule
                        </button>
                        <button className="btn-secondary" onClick={() => handleEdit(employee)}>
                          ✏️ Edit
                        </button>
                        <button className="btn-danger" onClick={() => handleDelete(employee.id)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Schedule View */
        <div className="schedule-view">
          <div className="schedule-header">
            <h2>📅 Employee Schedule</h2>
            <select 
              value={selectedEmployee?.id || ''} 
              onChange={(e) => {
                const emp = employees.find(e => e.id === e.target.value);
                if (emp) handleViewSchedule(emp);
              }}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="schedule-content">
              <div className="employee-schedule-info">
                <div className="employee-avatar-large" style={{ backgroundColor: selectedEmployee.profile_color }}>
                  {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                </div>
                <div>
                  <h3>{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                  <p>{selectedEmployee.position}</p>
                </div>
              </div>

              <h3>Current Month Schedule</h3>
              {scheduleData.length === 0 ? (
                <p className="no-schedule">No scheduled jobs for this employee this month.</p>
              ) : (
                <div className="schedule-list">
                  {scheduleData.map(event => (
                    <div key={event.event_id} className="schedule-item">
                      <div className="schedule-date">
                        <div className="date-day">{new Date(event.event_date).getDate()}</div>
                        <div className="date-month">
                          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>
                      <div className="schedule-details">
                        <h4>{event.title}</h4>
                        {event.customer_name && <p className="customer">Customer: {event.customer_name}</p>}
                        {event.location && <p className="location">📍 {event.location}</p>}
                        <p className="time">
                          {event.all_day ? 'All Day' : `${event.start_time} - ${event.end_time}`}
                        </p>
                        <span className={`status-badge status-${event.status}`}>{event.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEmployee ? '✏️ Edit Employee' : '➕ Add New Employee'}</h2>
              <button className="close-btn" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="employee-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Employment Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder="e.g., Detailer, Manager"
                    />
                  </div>
                  <div className="form-group">
                    <label>Hire Date</label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Employment Status</label>
                    <select
                      name="employmentStatus"
                      value={formData.employmentStatus}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Calendar Color</label>
                    <div className="color-picker">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          className={`color-option ${formData.profileColor === color.value ? 'selected' : ''}`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData(prev => ({ ...prev, profileColor: color.value }))}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Pay Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pay Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      name="payRate"
                      value={formData.payRate}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pay Type</label>
                    <select
                      name="payType"
                      value={formData.payType}
                      onChange={handleChange}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="salary">Salary</option>
                      <option value="commission">Commission</option>
                      <option value="per_job">Per Job</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Contact Information</h3>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      maxLength="2"
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP</label>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Emergency Contact</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone</label>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Skills & Certifications</h3>
                <div className="form-group">
                  <label>Skills</label>
                  <div className="skills-selector">
                    {skillOptions.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        className={`skill-btn ${formData.skills.includes(skill) ? 'selected' : ''}`}
                        onClick={() => handleSkillToggle(skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Availability Notes</label>
                  <textarea
                    name="availabilityNotes"
                    value={formData.availabilityNotes}
                    onChange={handleChange}
                    rows="2"
                    placeholder="e.g., Available Mon-Fri 8am-5pm"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Any additional information about this employee"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
