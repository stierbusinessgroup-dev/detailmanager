import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import './Calendar.css'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month') // 'month', 'week', 'day', 'list'
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDayView, setShowDayView] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayViewDate, setDayViewDate] = useState(null)
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingEvent, setEditingEvent] = useState(null)

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    event_type: 'appointment',
    status: 'scheduled',
    location: '',
    customer_id: '',
    assigned_employee_id: '',
    all_day: false,
    reminder_minutes: 30,
    color: '#3b82f6',
    notes: ''
  })

  const eventTypes = [
    { value: 'appointment', label: 'Appointment', color: '#3b82f6' },
    { value: 'sale', label: 'Sale', color: '#10b981' },
    { value: 'task', label: 'Task', color: '#f59e0b' },
    { value: 'reminder', label: 'Reminder', color: '#8b5cf6' },
    { value: 'other', label: 'Other', color: '#6b7280' }
  ]

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' }
  ]

  const reminderOptions = [
    { value: 0, label: 'No reminder' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
    { value: 2880, label: '2 days before' }
  ]

  useEffect(() => {
    fetchEvents()
    fetchCustomers()
    fetchEmployees()
  }, [currentDate, view])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate date range based on view
      const { startDate, endDate } = getDateRange()

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email,
            phone
          ),
          employees (
            first_name,
            last_name,
            profile_color
          )
        `)
        .eq('user_id', user.id)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date')
        .order('start_time')

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      setMessage({ type: 'error', text: 'Failed to load calendar events' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('employment_status', 'active')
        .order('first_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const getDateRange = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    if (view === 'month') {
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      // Include days from previous/next month to fill calendar grid
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      const endDate = new Date(lastDay)
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    } else if (view === 'week') {
      const startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - startDate.getDay())
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    } else {
      return {
        startDate: currentDate.toISOString().split('T')[0],
        endDate: currentDate.toISOString().split('T')[0]
      }
    }
  }

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (date) => {
    setDayViewDate(date)
    setShowDayView(true)
  }

  const handleDayViewCreateEvent = (timeSlot = null) => {
    setSelectedDate(dayViewDate)
    setEventForm({
      ...eventForm,
      event_date: dayViewDate.toISOString().split('T')[0],
      start_time: timeSlot || '',
      end_time: ''
    })
    setShowDayView(false)
    setShowEventModal(true)
  }

  const handleEventClick = (event) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      event_type: event.event_type,
      status: event.status,
      location: event.location || '',
      customer_id: event.customer_id || '',
      assigned_employee_id: event.assigned_employee_id || '',
      all_day: event.all_day,
      reminder_minutes: event.reminder_minutes || 30,
      color: event.color || '#3b82f6',
      notes: event.notes || ''
    })
    setShowEventModal(true)
  }

  const handleSaveEvent = async () => {
    try {
      if (!eventForm.title || !eventForm.event_date) {
        setMessage({ type: 'error', text: 'Please provide title and date' })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const eventData = {
        ...eventForm,
        user_id: user.id,
        customer_id: eventForm.customer_id || null,
        assigned_employee_id: eventForm.assigned_employee_id || null,
        start_time: eventForm.start_time || null,
        end_time: eventForm.end_time || null,
        updated_at: new Date().toISOString()
      }

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Event updated successfully!' })
      } else {
        // Create new event
        const { error } = await supabase
          .from('calendar_events')
          .insert([eventData])

        if (error) throw error
        setMessage({ type: 'success', text: 'Event created successfully!' })
      }

      setShowEventModal(false)
      resetForm()
      fetchEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      setMessage({ type: 'error', text: 'Failed to save event' })
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return

    if (!window.confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', editingEvent.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Event deleted successfully!' })
      setShowEventModal(false)
      resetForm()
      fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      setMessage({ type: 'error', text: 'Failed to delete event' })
    }
  }

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      event_type: 'appointment',
      status: 'scheduled',
      location: '',
      customer_id: '',
      assigned_employee_id: '',
      all_day: false,
      reminder_minutes: 30,
      color: '#3b82f6',
      notes: ''
    })
    setEditingEvent(null)
    setSelectedDate(null)
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.event_date === dateStr)
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      days.push({ date, isCurrentMonth: false })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({ date, isCurrentMonth: true })
    }

    // Next month days
    const remainingDays = 42 - days.length // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({ date, isCurrentMonth: false })
    }

    return (
      <div className="calendar-month-view">
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-days-grid">
          {days.map((dayObj, index) => {
            const dayEvents = getEventsForDate(dayObj.date)
            const isToday = dayObj.date.toDateString() === today.toDateString()
            
            return (
              <div
                key={index}
                className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateClick(dayObj.date)}
              >
                <div className="calendar-day-number">{dayObj.date.getDate()}</div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="calendar-event-badge"
                      style={{ backgroundColor: event.color }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                      title={event.title}
                    >
                      {event.all_day ? '📅' : '🕐'} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="calendar-event-more">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const groupedEvents = {}
    events.forEach(event => {
      if (!groupedEvents[event.event_date]) {
        groupedEvents[event.event_date] = []
      }
      groupedEvents[event.event_date].push(event)
    })

    return (
      <div className="calendar-list-view">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="no-events">
            <p>No events scheduled</p>
            <button className="btn btn-primary" onClick={() => setShowEventModal(true)}>
              Create Event
            </button>
          </div>
        ) : (
          Object.keys(groupedEvents).sort().map(date => (
            <div key={date} className="calendar-list-date-group">
              <h3 className="calendar-list-date">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <div className="calendar-list-events">
                {groupedEvents[date].map(event => (
                  <div
                    key={event.id}
                    className="calendar-list-event"
                    onClick={() => handleEventClick(event)}
                  >
                    <div
                      className="event-color-bar"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="event-details">
                      <div className="event-header">
                        <h4>{event.title}</h4>
                        <span className={`event-status status-${event.status}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="event-meta">
                        {!event.all_day && event.start_time && (
                          <span>🕐 {event.start_time.slice(0, 5)}</span>
                        )}
                        {event.all_day && <span>📅 All day</span>}
                        {event.customers && (
                          <span>👤 {event.customers.first_name} {event.customers.last_name}</span>
                        )}
                        {event.location && <span>📍 {event.location}</span>}
                        <span className="event-type-badge" style={{ backgroundColor: event.color }}>
                          {event.event_type}
                        </span>
                      </div>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderDayView = () => {
    if (!dayViewDate) return null

    const dayEvents = getEventsForDate(dayViewDate)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    // Helper function to convert time string to minutes since midnight
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return null
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }

    // Helper function to format time
    const formatTime = (hour) => {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:00 ${period}`
    }

    // Helper to format time from minutes
    const formatTimeFromMinutes = (minutes) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`
    }

    // Calculate event positions and detect overlaps
    const eventsWithPositions = dayEvents
      .filter(event => !event.all_day && event.start_time)
      .map(event => {
        const startMinutes = timeToMinutes(event.start_time)
        const endMinutes = event.end_time ? timeToMinutes(event.end_time) : startMinutes + 60
        return {
          ...event,
          startMinutes,
          endMinutes,
          duration: endMinutes - startMinutes
        }
      })
      .sort((a, b) => a.startMinutes - b.startMinutes)

    // Detect overlapping events
    const overlaps = []
    for (let i = 0; i < eventsWithPositions.length; i++) {
      for (let j = i + 1; j < eventsWithPositions.length; j++) {
        const event1 = eventsWithPositions[i]
        const event2 = eventsWithPositions[j]
        if (event1.endMinutes > event2.startMinutes && event1.startMinutes < event2.endMinutes) {
          overlaps.push({ event1: event1.id, event2: event2.id })
        }
      }
    }

    const allDayEvents = dayEvents.filter(event => event.all_day)

    return (
      <div className="day-view-modal-overlay" onClick={() => setShowDayView(false)}>
        <div className="day-view-modal" onClick={(e) => e.stopPropagation()}>
          <div className="day-view-header">
            <div>
              <h2>{dayViewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
              <p>{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled</p>
            </div>
            <div className="day-view-header-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleDayViewCreateEvent()}
              >
                + Add Event
              </button>
              <button
                className="modal-close"
                onClick={() => setShowDayView(false)}
              >
                ×
              </button>
            </div>
          </div>

          {overlaps.length > 0 && (
            <div className="overlap-info">
              👥 {overlaps.length} concurrent appointment{overlaps.length !== 1 ? 's' : ''} detected. You'll need multiple staff members during these times.
            </div>
          )}

          <div className="day-view-content">
            {/* All-day events section */}
            {allDayEvents.length > 0 && (
              <div className="all-day-events-section">
                <h3>All Day Events</h3>
                <div className="all-day-events-list">
                  {allDayEvents.map(event => (
                    <div
                      key={event.id}
                      className="all-day-event-item"
                      style={{ backgroundColor: event.color }}
                      onClick={() => handleEventClick(event)}
                    >
                      <span className="event-title">{event.title}</span>
                      {event.customers && (
                        <span className="event-customer">
                          👤 {event.customers.first_name} {event.customers.last_name}
                        </span>
                      )}
                      <span className={`event-status-badge status-${event.status}`}>
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Horizontal Timeline */}
            <div className="timeline-container">
              {/* Time axis */}
              <div className="timeline-header">
                <div className="timeline-label">Time</div>
                <div className="timeline-axis">
                  {hours.map(hour => (
                    <div key={hour} className="timeline-hour-marker">
                      <span className="timeline-hour-label">{formatTime(hour)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events as horizontal bars */}
              <div className="timeline-events">
                {eventsWithPositions.length === 0 ? (
                  <div className="timeline-no-events">
                    <p>No timed events scheduled</p>
                    <button className="btn btn-primary btn-sm" onClick={() => handleDayViewCreateEvent()}>
                      + Add Event
                    </button>
                  </div>
                ) : (
                  eventsWithPositions.map((event, index) => {
                    // Check if this event overlaps with others
                    const hasOverlap = overlaps.some(
                      overlap => overlap.event1 === event.id || overlap.event2 === event.id
                    )

                    // Calculate position and width as percentage of 24-hour day
                    const leftPercent = (event.startMinutes / (24 * 60)) * 100
                    const widthPercent = (event.duration / (24 * 60)) * 100

                    // Calculate vertical position based on overlaps
                    let rowIndex = 0
                    const usedRows = []
                    for (let i = 0; i < index; i++) {
                      const prevEvent = eventsWithPositions[i]
                      if (event.startMinutes < prevEvent.endMinutes && event.endMinutes > prevEvent.startMinutes) {
                        // Find which row the previous event is in
                        const prevRow = usedRows.find(r => r.eventId === prevEvent.id)?.row || 0
                        rowIndex = Math.max(rowIndex, prevRow + 1)
                      }
                    }
                    usedRows.push({ eventId: event.id, row: rowIndex })

                    return (
                      <div
                        key={event.id}
                        className={`timeline-event-bar ${hasOverlap ? 'has-concurrent' : ''}`}
                        style={{
                          backgroundColor: event.color,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          top: `${rowIndex * 70}px`
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="timeline-event-content">
                          <div className="timeline-event-header">
                            <span className="timeline-event-time">
                              {formatTimeFromMinutes(event.startMinutes)} - {formatTimeFromMinutes(event.endMinutes)}
                            </span>
                            {hasOverlap && (
                              <span className="concurrent-badge-inline">👥</span>
                            )}
                          </div>
                          <div className="timeline-event-title">{event.title}</div>
                          {event.customers && (
                            <div className="timeline-event-customer">
                              👤 {event.customers.first_name} {event.customers.last_name}
                            </div>
                          )}
                          {event.location && (
                            <div className="timeline-event-location">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Click to add event overlay */}
              <div className="timeline-click-overlay" onClick={() => handleDayViewCreateEvent()} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatPeriodTitle = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - startDate.getDay())
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="calendar-page">
      <Navigation />
      <main className="calendar-main">
        <div className="calendar-container">
          {/* Header */}
          <div className="calendar-header">
            <div className="calendar-title-section">
              <h1>📅 Calendar</h1>
              <p>Manage your schedule and appointments</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm()
                setShowEventModal(true)
              }}
            >
              + New Event
            </button>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
              <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
            </div>
          )}

          {/* Calendar Controls */}
          <div className="calendar-controls">
            <div className="calendar-navigation">
              <button className="btn btn-secondary" onClick={handlePreviousPeriod}>
                ← Previous
              </button>
              <button className="btn btn-secondary" onClick={handleToday}>
                Today
              </button>
              <button className="btn btn-secondary" onClick={handleNextPeriod}>
                Next →
              </button>
              <h2 className="calendar-period-title">{formatPeriodTitle()}</h2>
            </div>
            <div className="calendar-view-switcher">
              <button
                className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('month')}
              >
                Month
              </button>
              <button
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('list')}
              >
                List
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading calendar...</p>
            </div>
          ) : (
            <>
              {view === 'month' && renderMonthView()}
              {view === 'list' && renderListView()}
            </>
          )}
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEventModal(false)
          resetForm()
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'New Event'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEventModal(false)
                  resetForm()
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Event title..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => {
                      const selectedType = eventTypes.find(t => t.value === e.target.value)
                      setEventForm({
                        ...eventForm,
                        event_type: e.target.value,
                        color: selectedType?.color || '#3b82f6'
                      })
                    }}
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={eventForm.all_day}
                    onChange={(e) => setEventForm({ ...eventForm, all_day: e.target.checked })}
                  />
                  All day event
                </label>
              </div>

              {!eventForm.all_day && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Customer</label>
                <select
                  value={eventForm.customer_id}
                  onChange={(e) => setEventForm({ ...eventForm, customer_id: e.target.value })}
                >
                  <option value="">No customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assign Employee</label>
                <select
                  value={eventForm.assigned_employee_id}
                  onChange={(e) => setEventForm({ ...eventForm, assigned_employee_id: e.target.value })}
                >
                  <option value="">No employee assigned</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} {employee.position ? `- ${employee.position}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Event location..."
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Event description..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Reminder</label>
                <select
                  value={eventForm.reminder_minutes}
                  onChange={(e) => setEventForm({ ...eventForm, reminder_minutes: parseInt(e.target.value) })}
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {eventTypes.map(type => (
                    <button
                      key={type.value}
                      className={`color-option ${eventForm.color === type.color ? 'selected' : ''}`}
                      style={{ backgroundColor: type.color }}
                      onClick={() => setEventForm({ ...eventForm, color: type.color })}
                      title={type.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows="2"
                />
              </div>
            </div>
            <div className="modal-footer">
              {editingEvent && (
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteEvent}
                  style={{ marginRight: 'auto' }}
                >
                  Delete Event
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEventModal(false)
                  resetForm()
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEvent}>
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day View Modal */}
      {showDayView && renderDayView()}
    </div>
  )
}

export default Calendar
