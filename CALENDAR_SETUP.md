# Calendar Module Setup Guide

## Overview
The Calendar module provides a comprehensive scheduling and event management system with automatic sales integration. When you complete a sale, it automatically creates a calendar event, helping you track your business activities in one place.

## Features
- 📅 **Month and List Views**: Switch between calendar grid view and detailed list view
- 🔄 **Automatic Sales Integration**: Sales automatically sync to calendar when completed
- 👥 **Customer Linking**: Associate events with customers
- 🎨 **Color-Coded Events**: Different colors for appointments, sales, tasks, reminders, and more
- ⏰ **Reminders**: Set reminders from 15 minutes to 2 days before events
- 📍 **Location Tracking**: Add location information to events
- ✅ **Status Management**: Track events as scheduled, completed, cancelled, or rescheduled
- 🕐 **Time Management**: Support for all-day events or specific time slots

## Database Setup

### Step 1: Run the Migration
Execute the calendar migration SQL file to create the necessary database tables and functions:

```sql
-- Run this in your Supabase SQL Editor
-- File: migration_create_calendar.sql
```

This creates:
- `calendar_events` table with all event fields
- Automatic trigger to create calendar events from completed sales
- Helper functions for retrieving events by date range
- Row Level Security (RLS) policies for data protection

### Step 2: Verify Tables
Check that the following was created:
- ✅ `calendar_events` table
- ✅ Indexes for performance
- ✅ RLS policies
- ✅ Trigger: `trigger_create_calendar_event_from_sale`
- ✅ Functions: `create_calendar_event_from_sale()`, `get_calendar_events()`, `get_upcoming_events()`

## Usage Guide

### Creating Manual Events

1. **Navigate to Calendar**
   - Click "Calendar" in the navigation menu
   - You'll see the current month view by default

2. **Create New Event**
   - Click "+ New Event" button in the top right
   - Or click on any date in the calendar grid
   - Fill in the event details:
     - **Title**: Event name (required)
     - **Event Type**: Choose from appointment, sale, task, reminder, or other
     - **Date**: Event date (required)
     - **All Day**: Toggle for all-day events
     - **Start/End Time**: Specific times (if not all-day)
     - **Customer**: Link to a customer (optional)
     - **Location**: Event location
     - **Description**: Event details
     - **Reminder**: Set notification timing
     - **Color**: Choose event color
     - **Notes**: Internal notes

3. **Save Event**
   - Click "Create Event" to save
   - Event appears on the calendar

### Automatic Sales Integration

When you complete a sale in the Sales module:

1. **Complete a Sale**
   - Go to Sales module
   - Click "Complete Sale" on a draft sale
   - The sale is processed and inventory is committed

2. **Automatic Calendar Event**
   - A calendar event is automatically created
   - Event title: "Sale: [Customer Name]"
   - Event date: Same as sale date
   - Event type: "sale" (green color)
   - Event description: Includes sale amount and notes
   - Status: "completed"
   - Linked to customer and sale record

3. **View Sale Events**
   - Navigate to Calendar
   - Sale events appear in green
   - Click on event to view details
   - Event links back to customer and sale

### Managing Events

**Edit Event:**
1. Click on any event in the calendar
2. Modify the details in the modal
3. Click "Update Event" to save changes

**Delete Event:**
1. Click on the event to open it
2. Click "Delete Event" button
3. Confirm deletion

**Change Event Status:**
1. Open the event
2. Change status dropdown (scheduled, completed, cancelled, rescheduled)
3. Save changes

### Calendar Views

**Month View:**
- Shows full month grid with all events
- Click dates to create events
- Click events to view/edit details
- Events show as colored badges
- "+X more" indicator for days with many events

**List View:**
- Shows events grouped by date
- Detailed view with all event information
- Easier to read event descriptions
- Better for viewing many events

**Navigation:**
- Use "← Previous" and "Next →" buttons to change periods
- Click "Today" to return to current date
- Period title shows current month/week/day

## Event Types and Colors

| Event Type | Color | Use Case |
|------------|-------|----------|
| Appointment | Blue (#3b82f6) | Customer appointments, meetings |
| Sale | Green (#10b981) | Completed sales (auto-created) |
| Task | Orange (#f59e0b) | To-do items, follow-ups |
| Reminder | Purple (#8b5cf6) | Important reminders |
| Other | Gray (#6b7280) | Miscellaneous events |

## Workflow Examples

### Example 1: Scheduling a Customer Appointment
1. Navigate to Calendar
2. Click on the appointment date
3. Fill in details:
   - Title: "Detail Service - John Doe"
   - Type: Appointment
   - Customer: Select John Doe
   - Start Time: 10:00 AM
   - End Time: 12:00 PM
   - Location: "123 Main St"
   - Reminder: 1 day before
4. Save event
5. Receive reminder notification (future feature)

### Example 2: Tracking a Completed Sale
1. Go to Sales module
2. Create a sale for customer Jane Smith
3. Add services/products
4. Save as draft
5. Click "Complete Sale"
6. Sale is processed
7. Navigate to Calendar
8. See green "Sale: Jane Smith" event on sale date
9. Click event to view sale details

### Example 3: Creating a Follow-up Task
1. Navigate to Calendar
2. Create new event
3. Fill in details:
   - Title: "Follow up with customer on estimate"
   - Type: Task
   - Customer: Select customer
   - Date: Follow-up date
   - Status: Scheduled
   - Notes: "Discuss pricing options"
4. Save event
5. When completed, change status to "Completed"

## Integration with Other Modules

### Sales Module
- Completed sales automatically create calendar events
- Events link to sale records
- Customer information carried over
- Sale amount included in event description

### Customers Module
- Events can be linked to customers
- View customer name in event details
- Filter events by customer (future feature)

### Future Integrations
- Dashboard widget showing upcoming events
- Email/SMS reminders for events
- Recurring events support
- Event templates
- Export to Google Calendar/Outlook

## Best Practices

1. **Use Event Types Consistently**
   - Appointments for customer meetings
   - Tasks for internal to-dos
   - Let sales auto-create for completed transactions

2. **Set Reminders**
   - Use reminders for important appointments
   - Set 1-day reminders for customer appointments
   - Set 15-30 minute reminders for same-day events

3. **Link Customers**
   - Always link events to customers when applicable
   - Makes it easier to track customer interactions
   - Provides context for events

4. **Update Event Status**
   - Mark events as completed when done
   - Cancel events that won't happen
   - Use rescheduled status when moving events

5. **Add Locations**
   - Include addresses for mobile appointments
   - Helps with route planning
   - Useful for on-site services

6. **Use Notes Field**
   - Add internal notes for context
   - Include special instructions
   - Track important details

## Troubleshooting

### Events Not Showing
- Check date range - use navigation buttons
- Verify events exist in database
- Try switching between Month and List views
- Refresh the page

### Sales Not Creating Calendar Events
- Ensure migration was run successfully
- Check that trigger exists: `trigger_create_calendar_event_from_sale`
- Verify sale status is "completed"
- Check database logs for errors

### Cannot Edit/Delete Events
- Verify you're logged in as the event owner
- Check RLS policies are enabled
- Ensure proper permissions in Supabase

### Calendar Performance Issues
- Limit date range when viewing many events
- Use List view for better performance with many events
- Consider archiving old events (future feature)

## Database Schema

### calendar_events Table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- title: VARCHAR(255) - Event title
- description: TEXT - Event description
- event_date: DATE - Event date
- start_time: TIME - Start time (optional)
- end_time: TIME - End time (optional)
- event_type: VARCHAR(50) - Type of event
- status: VARCHAR(50) - Event status
- location: TEXT - Event location
- customer_id: UUID - Link to customer (optional)
- sale_id: UUID - Link to sale (optional)
- all_day: BOOLEAN - All-day event flag
- reminder_minutes: INTEGER - Reminder timing
- color: VARCHAR(20) - Display color
- notes: TEXT - Internal notes
- created_at: TIMESTAMP - Creation time
- updated_at: TIMESTAMP - Last update time
```

## Future Enhancements

- [ ] Recurring events support
- [ ] Email/SMS reminders
- [ ] Calendar export (iCal format)
- [ ] Google Calendar sync
- [ ] Event templates
- [ ] Drag-and-drop rescheduling
- [ ] Week and Day views
- [ ] Event search and filtering
- [ ] Customer event history view
- [ ] Dashboard calendar widget
- [ ] Print calendar view
- [ ] Event attachments
- [ ] Team calendar sharing (multi-user)

## Support

For issues or questions:
1. Check this documentation
2. Review database migration logs
3. Check browser console for errors
4. Verify Supabase connection
5. Test with simple event creation first

## Changelog

### Version 1.0.0 (2026-01-22)
- Initial calendar module release
- Month and List views
- Automatic sales integration
- Event creation, editing, and deletion
- Customer linking
- Color-coded event types
- Reminder settings
- Status management
- Location tracking
