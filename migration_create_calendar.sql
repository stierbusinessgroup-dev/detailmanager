-- Migration: Create Calendar Module
-- Description: Creates calendar_events table for scheduling and sales integration
-- Date: 2026-01-22

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type VARCHAR(50) NOT NULL DEFAULT 'appointment', -- appointment, sale, task, reminder, other
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  location TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  all_day BOOLEAN DEFAULT false,
  reminder_minutes INTEGER, -- minutes before event to remind (e.g., 15, 30, 60, 1440 for 1 day)
  color VARCHAR(20) DEFAULT '#3b82f6', -- hex color for calendar display
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sale_id ON calendar_events(sale_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create calendar event when sale is completed
CREATE OR REPLACE FUNCTION create_calendar_event_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
  event_title TEXT;
  event_description TEXT;
BEGIN
  -- Only create calendar event when sale status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get customer name
    SELECT CONCAT(first_name, ' ', last_name) INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    -- Create event title and description
    event_title := 'Sale: ' || COALESCE(customer_name, 'Unknown Customer');
    event_description := 'Sale completed for $' || NEW.total_amount::TEXT || 
                        CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' 
                        THEN E'\n\nNotes: ' || NEW.notes 
                        ELSE '' END;

    -- Insert calendar event
    INSERT INTO calendar_events (
      user_id,
      title,
      description,
      event_date,
      start_time,
      event_type,
      status,
      customer_id,
      sale_id,
      all_day,
      color,
      notes
    ) VALUES (
      NEW.user_id,
      event_title,
      event_description,
      NEW.sale_date,
      CURRENT_TIME,
      'sale',
      'completed',
      NEW.customer_id,
      NEW.id,
      false,
      '#10b981', -- green color for sales
      'Automatically created from sale completion'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create calendar events from sales
DROP TRIGGER IF EXISTS trigger_create_calendar_event_from_sale ON sales;
CREATE TRIGGER trigger_create_calendar_event_from_sale
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION create_calendar_event_from_sale();

-- Function to get calendar events for a date range
CREATE OR REPLACE FUNCTION get_calendar_events(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  description TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  event_type VARCHAR(50),
  status VARCHAR(50),
  location TEXT,
  customer_id UUID,
  customer_name TEXT,
  sale_id UUID,
  all_day BOOLEAN,
  reminder_minutes INTEGER,
  color VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.event_date,
    ce.start_time,
    ce.end_time,
    ce.event_type,
    ce.status,
    ce.location,
    ce.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    ce.sale_id,
    ce.all_day,
    ce.reminder_minutes,
    ce.color,
    ce.notes,
    ce.created_at,
    ce.updated_at
  FROM calendar_events ce
  LEFT JOIN customers c ON ce.customer_id = c.id
  WHERE ce.user_id = p_user_id
    AND ce.event_date BETWEEN p_start_date AND p_end_date
  ORDER BY ce.event_date, ce.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming events (next 7 days)
CREATE OR REPLACE FUNCTION get_upcoming_events(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  event_date DATE,
  start_time TIME,
  event_type VARCHAR(50),
  status VARCHAR(50),
  customer_name TEXT,
  color VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.event_date,
    ce.start_time,
    ce.event_type,
    ce.status,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    ce.color
  FROM calendar_events ce
  LEFT JOIN customers c ON ce.customer_id = c.id
  WHERE ce.user_id = p_user_id
    AND ce.event_date >= CURRENT_DATE
    AND ce.event_date <= CURRENT_DATE + INTERVAL '7 days'
    AND ce.status != 'cancelled'
  ORDER BY ce.event_date, ce.start_time
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE calendar_events IS 'Stores calendar events including appointments, sales, tasks, and reminders';
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: appointment, sale, task, reminder, other';
COMMENT ON COLUMN calendar_events.status IS 'Event status: scheduled, completed, cancelled, rescheduled';
COMMENT ON COLUMN calendar_events.reminder_minutes IS 'Minutes before event to send reminder notification';
COMMENT ON COLUMN calendar_events.color IS 'Hex color code for calendar display';
COMMENT ON FUNCTION create_calendar_event_from_sale() IS 'Automatically creates calendar event when sale is completed';
COMMENT ON FUNCTION get_calendar_events(UUID, DATE, DATE) IS 'Retrieves calendar events for a specific date range with customer info';
COMMENT ON FUNCTION get_upcoming_events(UUID) IS 'Retrieves upcoming events for the next 7 days';
