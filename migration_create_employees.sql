-- Migration: Create Employees Table and Functions
-- Description: Manages employee data for the detail business with calendar job assignment capability
-- Created: 2026-01-22

-- =====================================================
-- 1. CREATE EMPLOYEES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Employment Details
    "position" TEXT, -- e.g., "Detailer", "Manager", "Technician"
    hire_date DATE,
    employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave')),
    
    -- Pay Information
    pay_rate DECIMAL(10, 2),
    pay_type TEXT CHECK (pay_type IN ('hourly', 'salary', 'commission', 'per_job')),
    
    -- Contact & Emergency
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Work Details
    skills TEXT[], -- Array of skills: ['interior_detailing', 'exterior_detailing', 'ceramic_coating', 'paint_correction']
    certifications TEXT[], -- Array of certifications
    availability_notes TEXT,
    
    -- Additional Information
    notes TEXT,
    profile_color TEXT DEFAULT '#3b82f6', -- Color for calendar display
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(first_name, last_name);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own employees
CREATE POLICY employees_user_policy ON employees
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. UPDATE CALENDAR_EVENTS TABLE
-- =====================================================

-- Add employee assignment column to calendar_events if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'assigned_employee_id'
    ) THEN
        ALTER TABLE calendar_events 
        ADD COLUMN assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_calendar_events_employee ON calendar_events(assigned_employee_id);
    END IF;
END $$;

-- =====================================================
-- 3. CREATE FUNCTIONS
-- =====================================================

-- Function: Get all active employees for a user
CREATE OR REPLACE FUNCTION get_active_employees(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    "position" TEXT,
    phone TEXT,
    email TEXT,
    profile_color TEXT,
    skills TEXT[],
    employment_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.first_name || ' ' || e.last_name AS full_name,
        e."position",
        e.phone,
        e.email,
        e.profile_color,
        e.skills,
        e.employment_status
    FROM employees e
    WHERE e.user_id = p_user_id
        AND e.employment_status = 'active'
    ORDER BY e.first_name, e.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get employee schedule (calendar events assigned to employee)
CREATE OR REPLACE FUNCTION get_employee_schedule(
    p_user_id UUID,
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    description TEXT,
    event_date DATE,
    start_time TIME,
    end_time TIME,
    event_type TEXT,
    status TEXT,
    location TEXT,
    customer_name TEXT,
    all_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id AS event_id,
        ce.title::TEXT,
        ce.description::TEXT,
        ce.event_date,
        ce.start_time,
        ce.end_time,
        ce.event_type::TEXT,
        ce.status::TEXT,
        ce.location::TEXT,
        CASE 
            WHEN c.id IS NOT NULL THEN (c.first_name || ' ' || c.last_name)::TEXT
            ELSE NULL::TEXT
        END AS customer_name,
        ce.all_day
    FROM calendar_events ce
    LEFT JOIN customers c ON ce.customer_id = c.id
    WHERE ce.user_id = p_user_id
        AND ce.assigned_employee_id = p_employee_id
        AND ce.event_date BETWEEN p_start_date AND p_end_date
    ORDER BY ce.event_date, ce.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get employee workload summary
CREATE OR REPLACE FUNCTION get_employee_workload(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    total_jobs INTEGER,
    scheduled_jobs INTEGER,
    completed_jobs INTEGER,
    cancelled_jobs INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        COUNT(ce.id)::INTEGER AS total_jobs,
        COUNT(ce.id) FILTER (WHERE ce.status = 'scheduled')::INTEGER AS scheduled_jobs,
        COUNT(ce.id) FILTER (WHERE ce.status = 'completed')::INTEGER AS completed_jobs,
        COUNT(ce.id) FILTER (WHERE ce.status = 'cancelled')::INTEGER AS cancelled_jobs
    FROM employees e
    LEFT JOIN calendar_events ce ON ce.assigned_employee_id = e.id 
        AND ce.event_date BETWEEN p_start_date AND p_end_date
        AND ce.user_id = p_user_id
    WHERE e.user_id = p_user_id
        AND e.employment_status = 'active'
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY e.first_name, e.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- To run this migration:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run the SQL
-- 4. Verify tables and functions were created successfully

COMMENT ON TABLE employees IS 'Stores employee information for detail business management';
COMMENT ON COLUMN employees.profile_color IS 'Color used to identify employee on calendar (hex format)';
COMMENT ON COLUMN employees.skills IS 'Array of employee skills for job matching';
COMMENT ON COLUMN calendar_events.assigned_employee_id IS 'Employee assigned to this calendar event/job';
