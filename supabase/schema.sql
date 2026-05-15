-- Run this in your Supabase SQL Editor to create the veritask schema

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  asset TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL DEFAULT 'open',
  milestones JSONB NOT NULL DEFAULT '[]',
  employer_address TEXT NOT NULL,
  agent_address TEXT,
  escrow_contract_id TEXT,
  escrow_data JSONB,
  engagement_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_employer ON tasks(employer_address);
CREATE INDEX IF NOT EXISTS idx_tasks_engagement ON tasks(engagement_id);

-- Enable Row Level Security (safe default for anon key)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow public read access (agents need to see all tasks)
CREATE POLICY "Allow public read" ON tasks
  FOR SELECT
  USING (true);

-- Allow public insert (any wallet can create a task)
CREATE POLICY "Allow public insert" ON tasks
  FOR INSERT
  WITH CHECK (true);

-- Allow public update (any wallet can update a task — for demo purposes)
CREATE POLICY "Allow public update" ON tasks
  FOR UPDATE
  USING (true);
