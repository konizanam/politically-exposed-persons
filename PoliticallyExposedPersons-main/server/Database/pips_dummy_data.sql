-- Dummy data for packages (tiers)
INSERT INTO packages (id, name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes) VALUES
  (1, 'Basic', 1, 500, NULL, 850.00, 10200.00, TRUE, TRUE, FALSE, FALSE, 'Export to PDF/Excel, audit trail, up to 500 onboarding'),
  (2, 'Professional', 5, 500, 1500, 1950.00, 23400.00, TRUE, TRUE, TRUE, FALSE, 'Export to PDF/Excel, audit trail, up to 500 onboarding, batch up to 1500 once off'),
  (3, 'Enterprise', NULL, NULL, NULL, 4150.00, 49800.00, TRUE, TRUE, TRUE, TRUE, 'Export to PDF/Excel, audit trail, unlimited onboarding and batch, system integration');

-- Dummy data for organisations
INSERT INTO organisations (id, name, description, contact_email, contact_phone, address, package_id) VALUES
  (1, 'Alpha Org', 'First subscriber org', 'contact@alpha.org', '1234567890', '123 Alpha St', 1),
  (2, 'Beta Org', 'Second subscriber org', 'info@beta.org', '0987654321', '456 Beta Ave', 2);

-- Dummy data for users (system admin and org users)
INSERT INTO users (id, first_name, last_name, email, password, organisation_id, is_active, is_system_admin) VALUES
  (1, 'Super', 'Admin', 'admin@system.com', '$2a$12$s5y8EFExYPJQswKHIm6DSuRMKKpkowX4g2vdaILIXWkW/C9uXjAH6', NULL, TRUE, TRUE),
  (2, 'Alice', 'Alpha', 'alice@alpha.org', '$2a$12$s5y8EFExYPJQswKHIm6DSuRMKKpkowX4g2vdaILIXWkW/C9uXjAH6', 1, TRUE, FALSE),
  (3, 'Bob', 'Beta', 'bob@beta.org', '$2a$12$s5y8EFExYPJQswKHIm6DSuRMKKpkowX4g2vdaILIXWkW/C9uXjAH6', 2, TRUE, FALSE);

-- Dummy data for roles
INSERT INTO roles (id, name, description, is_active, organisation_id, is_global) VALUES
  (1, 'Admin', 'System administrator', TRUE, NULL, TRUE),
  (2, 'OrgManager', 'Organization manager', TRUE, 1, FALSE),
  (3, 'OrgUser', 'Organization user', TRUE, 1, FALSE),
  (4, 'OrgManager', 'Organization manager', TRUE, 2, FALSE),
  (5, 'OrgUser', 'Organization user', TRUE, 2, FALSE);

-- Dummy data for permissions
INSERT INTO permissions (id, name, description) VALUES
  (1, 'manage_users', 'Can manage users'),
  (2, 'search_pips', 'Can search PIPs'),
  (3, 'manage_roles', 'Can manage roles'),
  (4, 'manage_organisations', 'Can manage organisations');

-- Dummy data for modules
INSERT INTO modules (id, name, description) VALUES
  (1, 'Manage Users', 'User management module'),
  (2, 'Search PIPs', 'PIP search module'),
  (3, 'Manage Roles', 'Role management module'),
  (4, 'Manage Organisations', 'Organisation management module');

-- Dummy data for role_permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), -- Admin: all permissions
  (2, 1), (2, 2), (2, 3), (2, 4), -- OrgManager: all permissions for org 1
  (3, 2),                         -- OrgUser: only search for org 1
  (4, 1), (4, 2), (4, 3), (4, 4), -- OrgManager: all permissions for org 2
  (5, 2);                         -- OrgUser: only search for org 2

-- Dummy data for user_roles
INSERT INTO user_roles (user_id, role_id, is_active) VALUES
  (1, 1, TRUE), -- Super Admin
  (2, 2, TRUE), -- Alice is OrgManager in Alpha Org
  (3, 4, TRUE); -- Bob is OrgManager in Beta Org

-- Dummy data for module_permissions
INSERT INTO module_permissions (module_id, permission_id) VALUES
  (1, 1), (2, 2), (3, 3), (4, 4);

-- Dummy data for pips
INSERT INTO pips (id, first_name, middle_name, last_name, national_id, pip_type, reason, is_foreign) VALUES
  (1, 'John', 'A', 'Doe', 'NID123', 'Local', 'Minister', FALSE),
  (2, 'Jane', NULL, 'Smith', 'NID456', 'Foreign', 'Ambassador', TRUE);

-- Dummy data for pip_institutions
INSERT INTO pip_institutions (id, pip_id, institution_name, institution_type, position) VALUES
  (1, 1, 'Alpha Ministry', 'Government', 'Minister'),
  (2, 2, 'Beta Embassy', 'Government', 'Ambassador');

-- Dummy data for pip_associates
INSERT INTO pip_associates (id, pip_id, first_name, middle_name, last_name, relationship_type, national_id) VALUES
  (1, 1, 'Mary', NULL, 'Doe', 'Family', 'NID789'),
  (2, 2, 'Tom', 'B', 'Smith', 'Business Partner', 'NID101');

-- Dummy data for foreign_pips
INSERT INTO foreign_pips (id, pip_id, country, additional_notes) VALUES
  (1, 2, 'CountryX', 'Foreign diplomat');

-- Dummy data for batch_screenings
INSERT INTO batch_screenings (id, user_id, description) VALUES
  (1, 2, 'Alpha Org batch screening'),
  (2, 3, 'Beta Org batch screening');

-- Dummy data for audit_trail
INSERT INTO audit_trail (id, user_id, action_type, module_name, target, result_summary, status) VALUES
  (1, 1, 'Login', 'Login Page', 'Super Admin', 'Login successful', 'success'),
  (2, 2, 'Search', 'PIPs Page', 'John Doe', '1 result', 'success');

-- Dummy data for notifications
INSERT INTO notifications (id, user_id, pip_id, email_sent_at, notification_type) VALUES
  (1, 2, 1, NOW(), 'New PIP'),
  (2, 3, 2, NOW(), 'PIP Update');
