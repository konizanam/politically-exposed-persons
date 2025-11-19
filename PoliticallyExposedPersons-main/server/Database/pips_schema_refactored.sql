-- Database Schema Creation Script - Dependency Ordered
-- Tables are created in order of dependencies to avoid foreign key constraint errors

-- ============================================
-- PHASE 1: Independent Tables (No Dependencies)
-- ============================================

-- 1. Packages (Tiers) table - No dependencies
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- Basic, Professional, Enterprise
  user_limit INTEGER, -- NULL for unlimited
  onboarding_screening_limit INTEGER, -- NULL for unlimited
  batch_screening_limit INTEGER, -- NULL for unlimited
  price_monthly NUMERIC(10,2),
  price_annual NUMERIC(10,2),
  allow_export BOOLEAN DEFAULT TRUE,
  allow_audit_trail BOOLEAN DEFAULT TRUE,
  allow_batch_screening BOOLEAN DEFAULT FALSE,
  allow_system_integration BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- 2. Permissions table - No dependencies
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'manage_users', 'search_pips'
  description TEXT
);

-- 3. Modules table - No dependencies
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'Manage Users', 'Search PIPs'
  description TEXT
);

-- 4. PIPs base table - No dependencies
CREATE TABLE IF NOT EXISTS pips (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  national_id VARCHAR(100),
  pip_type VARCHAR(50) CHECK (pip_type IN ('Domestic PIP', 'Foreign PIP', 'International Organisation PIP')),
  reason TEXT NOT NULL,
  is_foreign BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PHASE 2: First Level Dependencies
-- ============================================

-- 5. Organisations table - Depends on: packages
CREATE TABLE IF NOT EXISTS organisations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(50),
  address TEXT,
  package_id INTEGER REFERENCES packages(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Module-Permissions join table - Depends on: modules, permissions
CREATE TABLE IF NOT EXISTS module_permissions (
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (module_id, permission_id)
);

-- 7. PIPs Institutions table - Depends on: pips
CREATE TABLE IF NOT EXISTS pip_institutions (
  id SERIAL PRIMARY KEY,
  pip_id INTEGER REFERENCES pips(id) ON DELETE CASCADE,
  institution_name VARCHAR(200) NOT NULL,
  institution_type VARCHAR(100),
  position VARCHAR(150),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Associates table - Depends on: pips
CREATE TABLE IF NOT EXISTS pip_associates (
  id SERIAL PRIMARY KEY,
  pip_id INTEGER REFERENCES pips(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(100),
  national_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Foreign PIPs table - Depends on: pips
CREATE TABLE IF NOT EXISTS foreign_pips (
  id SERIAL PRIMARY KEY,
  pip_id INTEGER REFERENCES pips(id) ON DELETE CASCADE,
  country VARCHAR(100),
  additional_notes TEXT
);

-- ============================================
-- PHASE 3: Second Level Dependencies
-- ============================================

-- 10. Users table - Depends on: organisations
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(150) NOT NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_system_admin BOOLEAN DEFAULT FALSE, -- true for system management users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Roles table - Depends on: organisations
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE, -- NULL for global roles
  is_global BOOLEAN DEFAULT FALSE,
  UNIQUE(name, organisation_id)
);

-- ============================================
-- PHASE 4: Third Level Dependencies
-- ============================================

-- 12. Role-Permissions join table - Depends on: roles, permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 13. User Roles table - Depends on: users, roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (user_id, role_id)
);

-- 14. Batch Screening Sessions - Depends on: users
CREATE TABLE IF NOT EXISTS batch_screenings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  screened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Audit Trail - Depends on: users
CREATE TABLE IF NOT EXISTS audit_trail (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  module_name VARCHAR(100),
  target TEXT,
  result_summary TEXT,
  status VARCHAR(20) DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Notifications - Depends on: users, pips
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pip_id INTEGER REFERENCES pips(id) ON DELETE CASCADE,
  email_sent_at TIMESTAMP,
  notification_type VARCHAR(100)
);

-- 17. PIP Search Logs - Depends on: users, organisations
CREATE TABLE IF NOT EXISTS pip_search_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    organisation_id INTEGER REFERENCES organisations(id),
    search_query TEXT,
    search_result TEXT,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_bulk_search BOOLEAN DEFAULT false
);

CREATE TABLE verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE
);

-- Verify this table exists with proper columns
CREATE TABLE IF NOT EXISTS batch_screenings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  screened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration to add is_active column to pips table
ALTER TABLE pips ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index on is_active for better query performance
CREATE INDEX IF NOT EXISTS idx_pips_is_active ON pips(is_active);

-- Update any existing rows to have is_active = true (just to be safe)
UPDATE pips SET is_active = TRUE WHERE is_active IS NULL;

-- Add audit tracking for deactivations
COMMENT ON COLUMN pips.is_active IS 'Determines if a PIP is active or deactivated';


-- Add new columns to permissions table
ALTER TABLE permissions 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for is_active
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

-- ============================================
-- PHASE 5: Create All Indexes
-- ============================================

-- PIP related indexes
CREATE INDEX IF NOT EXISTS idx_pip_name ON pips(first_name, middle_name, last_name);
CREATE INDEX IF NOT EXISTS idx_associate_pip_id ON pip_associates(pip_id);
CREATE INDEX IF NOT EXISTS idx_pip_institutions_pip_id ON pip_institutions(pip_id);

-- User and authentication indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Role and permission indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_org ON roles(name, organisation_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON user_roles(user_id, is_active);

-- Audit and logging indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================
-- PHASE 6: Helper Functions for Table Creation
-- ============================================

-- Function to drop all tables in reverse order (useful for testing)
CREATE OR REPLACE FUNCTION drop_all_tables() RETURNS void AS $$
BEGIN
    -- Drop in reverse order of creation
    DROP TABLE IF EXISTS pip_search_logs CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS audit_trail CASCADE;
    DROP TABLE IF EXISTS batch_screenings CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS role_permissions CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS foreign_pips CASCADE;
    DROP TABLE IF EXISTS pip_associates CASCADE;
    DROP TABLE IF EXISTS pip_institutions CASCADE;
    DROP TABLE IF EXISTS module_permissions CASCADE;
    DROP TABLE IF EXISTS organisations CASCADE;
    DROP TABLE IF EXISTS pips CASCADE;
    DROP TABLE IF EXISTS modules CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS packages CASCADE;
END;
$$ LANGUAGE plpgsql;

-- Function to check table dependencies
CREATE OR REPLACE FUNCTION check_table_dependencies() RETURNS TABLE(
    table_name text,
    depends_on text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.table_name::text,
        array_agg(DISTINCT ctu.table_name::text) AS depends_on
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_table_usage ctu 
        ON tc.constraint_name = ctu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ctu.table_schema = 'public'
        AND tc.table_name != ctu.table_name
    GROUP BY tc.table_name
    ORDER BY tc.table_name;
END;
$$ LANGUAGE plpgsql;