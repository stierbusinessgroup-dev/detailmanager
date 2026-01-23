# CRM Module Setup Guide

## Overview
The CRM (Customer Relationship Management) module provides comprehensive contact management, lead tracking, and customer relationship tools for the DetailManager application. It integrates seamlessly with your existing customers, sales, and calendar modules.

## Features

### Contact Management
- **Comprehensive Contact Information**: Store detailed contact data including personal info, company details, address, and social media links
- **Contact Status Tracking**: Organize contacts by status (Lead, Prospect, Customer, VIP, Inactive, Lost)
- **Lead Scoring**: Rate lead quality from 0-100
- **Lead Source Tracking**: Track where leads come from (referral, website, social media, etc.)
- **Custom Tags**: Organize contacts with custom tags for flexible categorization
- **Industry Classification**: Categorize contacts by industry

### Financial Tracking
- **Lifetime Value**: Automatic calculation of total revenue from each contact
- **Purchase History**: View all purchases made by a contact
- **Last Purchase Date**: Track when contact last made a purchase
- **Total Purchases**: Count of completed transactions

### Interaction Management
- **Interaction Logging**: Record all interactions (calls, emails, meetings, notes, tasks)
- **Interaction History**: Complete timeline of all contact interactions
- **Follow-up Tracking**: Set and track next follow-up dates
- **Outcome Recording**: Document interaction outcomes and next actions

### Integration Features
- **Customer Integration**: Link CRM contacts to customer records
- **Sales Integration**: Automatic sync of purchase data from sales
- **Calendar Integration**: View upcoming events for each contact
- **Employee Assignment**: Assign contacts to specific sales reps/employees

### Dashboard & Analytics
- **Summary Dashboard**: Real-time statistics (total contacts, leads, customers, VIPs, lifetime value)
- **Follow-up Alerts**: Track contacts needing follow-up
- **Status Distribution**: Visual breakdown of contact statuses

### Search & Filtering
- **Advanced Search**: Search by name, email, company, or phone
- **Status Filtering**: Filter contacts by status
- **Tag Filtering**: Filter contacts by custom tags
- **Multi-criteria Filtering**: Combine multiple filters

## Database Setup

### Step 1: Run the Migration
Execute the CRM migration SQL file in your Supabase SQL Editor:

```bash
# The migration file creates:
# - crm_contacts table
# - crm_interactions table
# - crm_tags table
# - Database functions for contact management
# - Automatic triggers for customer sync
# - Row Level Security policies
```

Run: `migration_create_crm.sql`

### Step 2: Verify Tables
After running the migration, verify these tables exist:
- `crm_contacts`
- `crm_interactions`
- `crm_tags`

### Step 3: Check Functions
Verify these database functions were created:
- `get_contact_details(p_contact_id, p_user_id)`
- `get_contacts_summary(p_user_id)`
- `create_contact_from_customer(p_customer_id, p_user_id)`
- `sync_contact_with_customer()` (trigger function)

## Usage Guide

### Adding a New Contact

1. Navigate to the CRM module via the navigation menu
2. Click the **"+ Add Contact"** button
3. Fill in the contact form:
   - **Basic Information**: Name, email, phone, mobile
   - **Company Information**: Company name, position, website, industry
   - **Address**: Full address details
   - **CRM Details**: Status, lead source, lead score, tags
   - **Social Media**: LinkedIn, Facebook, Twitter, Instagram URLs
   - **Notes**: Additional information about the contact

4. Click **"Create Contact"** to save

### Viewing Contact Details

1. Find the contact in the contacts grid
2. Click **"View Details"** button
3. The detail view shows:
   - Complete contact information
   - Financial summary (lifetime value, total purchases)
   - Purchase history
   - Upcoming events
   - Interaction timeline
   - Notes

### Organizing Contacts

#### By Status
Use the status dropdown to filter contacts:
- **Lead**: New potential customers
- **Prospect**: Qualified leads being actively pursued
- **Customer**: Active paying customers
- **VIP**: High-value customers requiring special attention
- **Inactive**: Contacts no longer active
- **Lost**: Opportunities that didn't convert

#### By Tags
Create custom tags to organize contacts:
1. When adding/editing a contact, use the tags selector
2. Click **"+ Add Custom Tag"** to create new tags
3. Filter contacts by tag using the tag dropdown

### Recording Interactions

1. Open a contact's detail view
2. Click **"+ Add Interaction"** button
3. Select interaction type:
   - **Call**: Phone conversations
   - **Email**: Email communications
   - **Meeting**: In-person or virtual meetings
   - **Note**: General notes or observations
   - **Task**: Action items or to-dos

4. Fill in:
   - Subject
   - Description
   - Outcome
   - Next action date (for follow-ups)

5. Click **"Add Interaction"**

### Tracking Follow-ups

1. When adding/editing a contact, set the **"Next Follow-up Date"**
2. The dashboard shows count of contacts needing follow-up
3. Contacts with upcoming follow-ups display the date on their card

### Lead Scoring

Rate lead quality from 0-100 based on:
- Engagement level
- Budget fit
- Timeline
- Decision-making authority
- Need alignment

Higher scores indicate higher-priority leads.

## Integration with Other Modules

### Customer Integration
- When a CRM contact becomes a customer, link them using the `customer_id` field
- Contact status automatically updates to "Customer"
- Purchase data syncs automatically from sales

### Sales Integration
- Completed sales automatically update contact's:
  - Lifetime value
  - Last purchase date
  - Total purchases
  - Status (lead/prospect → customer)

### Calendar Integration
- View upcoming events for each contact in the detail view
- Events linked to the contact's customer record appear automatically

### Employee Integration
- Assign contacts to specific employees using the `assigned_to` field
- Track which sales rep is responsible for each contact

## Workflow Examples

### Example 1: Lead to Customer Conversion

1. **Initial Contact**
   - Add new contact with status "Lead"
   - Set lead source (e.g., "Website")
   - Add initial notes
   - Set follow-up date

2. **Qualification**
   - Record interaction (call/meeting)
   - Update lead score based on qualification
   - Change status to "Prospect" if qualified
   - Add relevant tags (e.g., "Hot Lead", "Budget Approved")

3. **Nurturing**
   - Log all interactions (calls, emails, meetings)
   - Track outcomes and next actions
   - Update follow-up dates

4. **Conversion**
   - Create sale in Sales module
   - Link to customer record
   - Contact automatically updates:
     - Status → "Customer"
     - Lifetime value calculated
     - Purchase history populated

5. **Ongoing Relationship**
   - Continue logging interactions
   - Monitor purchase history
   - Identify VIP customers based on lifetime value
   - Update status to "VIP" for high-value customers

### Example 2: Customer Retention

1. **Monitor Activity**
   - Review last contact date
   - Check last purchase date
   - Identify customers with no recent activity

2. **Proactive Outreach**
   - Set follow-up dates for inactive customers
   - Log outreach attempts
   - Record outcomes

3. **Re-engagement**
   - Create calendar events for follow-up appointments
   - Track interaction history
   - Update status based on engagement level

## Best Practices

### Contact Data Quality
- **Complete Profiles**: Fill in as much information as possible
- **Regular Updates**: Keep contact information current
- **Consistent Tagging**: Use standardized tag names
- **Detailed Notes**: Document important details about each contact

### Lead Management
- **Timely Follow-ups**: Set and honor follow-up dates
- **Lead Scoring**: Regularly update lead scores based on new information
- **Status Updates**: Keep contact status current as relationships evolve
- **Source Tracking**: Always record lead source for marketing analysis

### Interaction Logging
- **Log Everything**: Record all meaningful interactions
- **Be Specific**: Include detailed descriptions and outcomes
- **Set Next Actions**: Always define next steps
- **Timely Entry**: Log interactions immediately while details are fresh

### Organization
- **Use Tags Wisely**: Create meaningful, reusable tags
- **Status Progression**: Move contacts through status pipeline appropriately
- **Regular Reviews**: Periodically review contact list for updates
- **Archive Inactive**: Mark truly inactive contacts to keep list clean

### Integration
- **Link Customers**: Always link CRM contacts to customer records when they convert
- **Verify Sync**: Check that purchase data syncs correctly
- **Calendar Coordination**: Use calendar events for scheduled follow-ups
- **Team Assignment**: Assign contacts to appropriate team members

## Troubleshooting

### Contact Not Syncing with Sales
**Problem**: Purchase data not updating in CRM contact

**Solutions**:
1. Verify contact has `customer_id` linked
2. Check that sale status is "completed"
3. Verify trigger `trigger_sync_contact_with_customer` is active
4. Manually refresh by editing and saving the contact

### Missing Purchase History
**Problem**: Contact detail view shows no purchases

**Solutions**:
1. Ensure contact is linked to customer record (`customer_id` is set)
2. Verify sales exist for that customer with status "completed"
3. Check RLS policies on sales table
4. Refresh the contact detail view

### Tags Not Appearing
**Problem**: Custom tags not showing in filter dropdown

**Solutions**:
1. Ensure tags are saved with contact
2. Refresh the page to reload available tags
3. Check that tags array is properly formatted in database

### Summary Statistics Incorrect
**Problem**: Dashboard shows wrong numbers

**Solutions**:
1. Refresh the page
2. Verify `get_contacts_summary` function is working
3. Check for database query errors in browser console
4. Ensure RLS policies allow reading all user's contacts

### Interactions Not Saving
**Problem**: Cannot add interactions to contact

**Solutions**:
1. Verify `crm_interactions` table exists
2. Check RLS policies on interactions table
3. Ensure contact_id is valid
4. Check browser console for errors

## Future Enhancements

### Planned Features
- **Email Integration**: Send emails directly from CRM
- **SMS Integration**: Text messaging capability
- **Task Management**: Dedicated task tracking system
- **Pipeline Management**: Visual sales pipeline
- **Reporting**: Advanced analytics and reports
- **Bulk Actions**: Bulk edit, tag, or delete contacts
- **Import/Export**: CSV import/export functionality
- **Duplicate Detection**: Automatic duplicate contact detection
- **Activity Timeline**: Visual timeline of all activities
- **Contact Scoring**: Automated lead scoring based on behavior

### Integration Opportunities
- **Marketing Automation**: Email campaign integration
- **Social Media**: Automatic social profile lookup
- **Communication Logs**: Automatic email/call logging
- **Document Management**: Attach files to contacts
- **Contract Management**: Link contracts to contacts

## Support

For issues or questions:
1. Check this documentation
2. Review database migration file
3. Check browser console for errors
4. Verify Supabase connection and RLS policies

## Summary

The CRM module provides a complete contact management solution that:
- Organizes all your business contacts in one place
- Tracks the entire customer journey from lead to VIP
- Logs all interactions and communications
- Integrates seamlessly with sales, customers, and calendar
- Provides actionable insights through dashboard analytics
- Helps you never miss a follow-up or opportunity

Start by adding your existing customers as contacts, then expand to include leads and prospects. Use tags and statuses to organize your contacts, and make interaction logging a daily habit for best results.
