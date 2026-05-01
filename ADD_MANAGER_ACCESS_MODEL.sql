-- Add ManagerAccess table for property manager portal access
-- Run this SQL or use the Python migration below

CREATE TABLE IF NOT EXISTS manager_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,  -- Landlord who grants access
    manager_email VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    permissions VARCHAR(500),  -- Comma-separated: view_properties,view_tenants,view_payments,manage_maintenance,send_messages
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_manager_access_token ON manager_access(token);
CREATE INDEX idx_manager_access_user ON manager_access(user_id);
CREATE INDEX idx_manager_access_active ON manager_access(active);
