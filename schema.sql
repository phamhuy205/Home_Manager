CREATE TABLE IF NOT EXISTS property_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  property_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  id_card VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(255),
  start_date DATE NOT NULL,
  deposit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(100) PRIMARY KEY,
  room_number VARCHAR(100) NOT NULL,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('VIP', 'STANDARD')),
  base_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  area NUMERIC(8, 2) NOT NULL DEFAULT 0,
  max_occupants INTEGER NOT NULL DEFAULT 1,
  current_occupants INTEGER NOT NULL DEFAULT 0,
  is_occupied BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id VARCHAR(100) REFERENCES tenants(id) ON DELETE SET NULL,
  last_electricity_index INTEGER NOT NULL DEFAULT 0,
  last_water_index INTEGER NOT NULL DEFAULT 0,
  water_billing_type VARCHAR(20) NOT NULL CHECK (water_billing_type IN ('PER_PERSON', 'PER_CUBIC')),
  water_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_rate NUMERIC(14, 2) NOT NULL DEFAULT 4000,
  wifi_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  garbage_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(150) PRIMARY KEY,
  invoice_code VARCHAR(150) NOT NULL UNIQUE,
  room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  due_date DATE NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_phone VARCHAR(50) NOT NULL DEFAULT '',
  room_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  old_electricity_index INTEGER NOT NULL DEFAULT 0,
  new_electricity_index INTEGER NOT NULL DEFAULT 0,
  electricity_usage INTEGER NOT NULL DEFAULT 0,
  electricity_rate NUMERIC(14, 2) NOT NULL DEFAULT 4000,
  electricity_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_billing_type VARCHAR(20) NOT NULL CHECK (water_billing_type IN ('PER_PERSON', 'PER_CUBIC')),
  old_water_index INTEGER,
  new_water_index INTEGER,
  water_usage NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  wifi_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  garbage_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  other_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  other_fee_note TEXT,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL CHECK (status IN ('UNPAID', 'PAID', 'PENDING_APPROVAL', 'OVERDUE', 'PARTIAL')),
  splits JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  reminded_count INTEGER NOT NULL DEFAULT 0,
  last_reminded_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (room_id, month, year)
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(150) PRIMARY KEY,
  invoice_id VARCHAR(150) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_code VARCHAR(150) NOT NULL,
  room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  room_number VARCHAR(100) NOT NULL,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('VIP', 'STANDARD')),
  tenant_name VARCHAR(255) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CASH')),
  transaction_ref VARCHAR(255),
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL,
  approved_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2200)
);

CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TENANT')),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  room_id VARCHAR(100) REFERENCES rooms(id) ON DELETE SET NULL,
  password_hash TEXT
);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS splits JSONB NOT NULL DEFAULT '[]';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(20);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS shared_start_date DATE;
ALTER TABLE property_settings ADD COLUMN IF NOT EXISTS warning_limit SMALLINT NOT NULL DEFAULT 5;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('UNPAID', 'PAID', 'PENDING_APPROVAL', 'OVERDUE', 'PARTIAL'));

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(150) PRIMARY KEY,
  target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('ADMIN', 'TENANT', 'ALL')),
  target_room_id VARCHAR(100) REFERENCES rooms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('PAYMENT_REMINDER', 'PAYMENT_RECEIVED', 'INVOICE_CREATED', 'SYSTEM')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_invoice_id VARCHAR(150) REFERENCES invoices(id) ON DELETE SET NULL,
  related_payment_id VARCHAR(150) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(150) PRIMARY KEY,
  contract_code VARCHAR(150) NOT NULL UNIQUE,
  room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_phone VARCHAR(50) NOT NULL DEFAULT '',
  tenant_id_card VARCHAR(50) NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deposit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  terms TEXT NOT NULL DEFAULT '',
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'TERMINATED')),
  scan_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS contracts_one_active_room_idx ON contracts (room_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS warnings (
  id VARCHAR(150) PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_name VARCHAR(255) NOT NULL DEFAULT '',
  room_number VARCHAR(100) NOT NULL DEFAULT '',
  violation_type VARCHAR(30) NOT NULL CHECK (violation_type IN ('TRASH', 'DIRTY_ROOM', 'NOISE', 'DAMAGE_SHARED', 'DISUNITY', 'OVERNIGHT_GUEST')),
  description TEXT NOT NULL DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'ARCHIVED')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS invoices_period_idx ON invoices (year, month);
CREATE INDEX IF NOT EXISTS invoices_room_idx ON invoices (room_id);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS notifications_target_idx ON notifications (target_role, target_room_id);
CREATE INDEX IF NOT EXISTS contracts_room_idx ON contracts (room_id);
CREATE INDEX IF NOT EXISTS warnings_room_idx ON warnings (room_id);

INSERT INTO property_settings (id, property_name, owner_name)
VALUES (1, 'Nhà Trọ Bà Tuyết', 'Hoàng Thị Tuyết')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_users (id, username, role, full_name, phone, room_id)
VALUES ('admin-1', 'admin', 'ADMIN', 'Hoàng Thị Tuyết', '', NULL)
ON CONFLICT (id) DO NOTHING;
