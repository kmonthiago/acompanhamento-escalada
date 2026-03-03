-- ====================================
-- ClimbTracker — Database Schema
-- ====================================

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'iniciante',
  goal TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments table (stores full history — multiple per client)
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(32) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  finger_strength INTEGER DEFAULT 5,
  upper_body INTEGER DEFAULT 5,
  core INTEGER DEFAULT 5,
  flexibility INTEGER DEFAULT 5,
  body_awareness INTEGER DEFAULT 5,
  route_reading INTEGER DEFAULT 5,
  endurance INTEGER DEFAULT 5,
  footwork INTEGER DEFAULT 5,
  observation TEXT DEFAULT '',
  date TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  client_id VARCHAR(32) REFERENCES clients(id) ON DELETE SET NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_client_id ON assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(date DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);

-- Seed admin user (password: admin123, SHA-256 hash)
INSERT INTO users (username, password_hash, role, display_name)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Administrador')
ON CONFLICT (username) DO NOTHING;
