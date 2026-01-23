# Employee Management Module - Setup Guide

## Overview
The Employee Management module allows you to manage your detail business employees and assign them to calendar jobs/events. This creates a complete workforce management system integrated with your calendar.

## Features
- ✅ Add and manage employees with comprehensive information
- ✅ Track employment status (active, inactive, on leave, terminated)
- ✅ Assign employees to calendar events/jobs
- ✅ View employee schedules and workload
- ✅ Track employee skills and certifications
- ✅ Manage pay rates and employment details
- ✅ Emergency contact information
- ✅ Color-coded employee identification on calendar
- ✅ Workload summary and analytics

## Database Setup

### Step 1: Run the Migration
1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `migration_create_employees.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### What the Migration Creates:
- **employees table**: Stores all employee information
- **calendar_events.assigned_employee_id**: Links events to employees
- **Database functions**:
  - `get_active_employees()`: Retrieves active employees
  - `get_employee_schedule()`: Gets employee's assigned events
  - `get_employee_workload()`: Calculates workload statistics

## Usage Guide

### Adding an Employee

1. Navigate to **Employees** in the main navigation
2. Click **➕ Add Employee** button
3. Fill in employee information:
   - **Basic Information**: First name, last name, email, phone
   - **Employment Details**: Position, hire date, status, calendar color
   - **Pay Information**: Pay rate and type (hourly, salary, commission, per job)
   - **Contact Information**: Address, city, state, ZIP
   - **Emergency Contact**: Name and phone number
   - **Skills**: Select applicable skills (Interior Detailing, Ceramic Coating, etc.)
   - **Availability Notes**: Work schedule or availability
   - **Notes**: Additional information
4. Click **Add Employee**

### Assigning Employees to Calendar Jobs

#### Method 1: From Calendar Event Form
1. Go to **Calendar** module
2. Create a new event or edit an existing event
3. In the event form, find the **Assign Employee** dropdown
4. Select an employee from the list
5. Save the event

#### Method 2: From Employee Schedule View
1. Go to **Employees** module
2. Click **📅 Schedule** button on an employee card
3. View their current schedule
4. Navigate to Calendar to create/edit events for them

### Viewing Employee Information

#### Employee List View
- Shows all employees as cards with key information
- Displays current month workload (total jobs, completed jobs)
- Filter by employment status
- Quick actions: View Schedule, Edit, Delete

#### Schedule View
- Select an employee from the dropdown
- View all assigned jobs for the current month
- See event details: date, time, customer, location, status

### Managing Employee Status

Employment statuses:
- **Active**: Currently working
- **Inactive**: Not currently working but still in system
- **On Leave**: Temporarily away
- **Terminated**: No longer employed

To change status:
1. Click **✏️ Edit** on employee card
2. Change **Employment Status** dropdown
3. Click **Update Employee**

### Employee Workload Dashboard

The workload summary shows for the current month:
- Total jobs assigned
- Scheduled jobs (upcoming)
- Completed jobs
- Cancelled jobs

This helps balance workload across your team.

## Integration with Calendar

### Automatic Features:
- Employee assignments are saved with calendar events
- Employee's color appears on calendar for their assigned events
- Schedule view shows all events assigned to an employee
- Deleting an employee removes them from assigned events (sets to null)

### Calendar Event Display:
When viewing calendar events with assigned employees:
- Event shows employee name
- Event can be color-coded by employee's profile color
- Employee information is included in event details

## Employee Skills System

### Available Skills:
- Interior Detailing
- Exterior Detailing
- Ceramic Coating
- Paint Correction
- Window Tinting
- Headlight Restoration
- Engine Detailing
- Upholstery Cleaning
- Leather Treatment
- Odor Removal

### Using Skills:
1. Assign skills to employees when creating/editing
2. Use skills to match employees to appropriate jobs
3. Track employee capabilities and training needs

## Pay Rate Tracking

### Pay Types:
- **Hourly**: Paid by the hour
- **Salary**: Fixed annual/monthly salary
- **Commission**: Percentage-based compensation
- **Per Job**: Flat rate per completed job

### Usage:
- Track employee compensation
- Calculate labor costs
- Plan budgets and pricing

## Best Practices

### 1. Complete Employee Profiles
- Fill in all relevant information
- Keep emergency contacts up to date
- Update skills as employees gain certifications

### 2. Assign Colors Strategically
- Use different colors for easy visual identification
- Consider using similar colors for employees with similar roles
- Update colors if needed for better visibility

### 3. Regular Schedule Reviews
- Check employee workload weekly
- Balance assignments across team
- Avoid overloading individual employees

### 4. Keep Status Current
- Update employment status promptly
- Use "On Leave" for temporary absences
- Mark as "Inactive" rather than deleting if they might return

### 5. Track Skills and Training
- Update skills when employees complete training
- Use skills to assign appropriate jobs
- Identify training needs based on business requirements

## Workflow Examples

### Example 1: New Employee Onboarding
1. Add employee with basic information
2. Set status to "Active"
3. Assign skills based on experience
4. Choose a calendar color
5. Start assigning jobs on calendar

### Example 2: Daily Job Assignment
1. View Calendar in Day or Week view
2. Create event for customer appointment
3. Assign appropriate employee based on skills
4. Employee can now see job in their schedule
5. Update event status when completed

### Example 3: Workload Management
1. Go to Employees module
2. Review workload summary
3. Identify overloaded or underutilized employees
4. Adjust calendar assignments accordingly
5. Balance work across team

### Example 4: Employee Schedule Review
1. Select employee in Schedule View
2. Review all assigned jobs for the month
3. Check for conflicts or gaps
4. Make adjustments in Calendar module
5. Confirm schedule with employee

## Troubleshooting

### Employees Not Showing in Calendar Dropdown
**Solution**: Check that employee status is set to "Active". Only active employees appear in the assignment dropdown.

### Employee Deleted But Still Shows on Events
**Solution**: This shouldn't happen. The database is set to SET NULL on delete, which removes the assignment. Try refreshing the calendar.

### Workload Numbers Seem Wrong
**Solution**: Workload is calculated for the current month only. Check the date range and ensure events are properly dated.

### Can't Edit Employee Information
**Solution**: Ensure you're logged in and the employee belongs to your account. Check browser console for errors.

### Employee Color Not Showing on Calendar
**Solution**: The calendar currently uses event type colors. Employee colors are stored for future enhancement. You can manually set event colors to match employee colors.

## Future Enhancements

Potential features for future development:
- Employee availability calendar
- Time tracking and timesheets
- Commission calculations
- Performance metrics
- Employee mobile app access
- Automated scheduling based on skills
- Conflict detection for double-booking
- Employee notifications for assignments
- Payroll integration
- Training and certification tracking

## Database Schema Reference

### employees table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- first_name: TEXT
- last_name: TEXT
- email: TEXT
- phone: TEXT
- position: TEXT
- hire_date: DATE
- employment_status: TEXT (active, inactive, on_leave, terminated)
- pay_rate: DECIMAL
- pay_type: TEXT (hourly, salary, commission, per_job)
- address, city, state, zip: TEXT
- emergency_contact_name: TEXT
- emergency_contact_phone: TEXT
- skills: TEXT[] (array)
- certifications: TEXT[] (array)
- availability_notes: TEXT
- notes: TEXT
- profile_color: TEXT (hex color)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### calendar_events.assigned_employee_id
```sql
- assigned_employee_id: UUID (foreign key to employees)
- Links calendar events to employees
- SET NULL on employee deletion
```

## Support

For issues or questions:
1. Check this documentation
2. Review the migration SQL file
3. Check Supabase logs for errors
4. Verify Row Level Security policies
5. Ensure all migrations are run in order

---

**Module Created**: 2026-01-22  
**Version**: 1.0  
**Compatible With**: DetailManager v1.0+
