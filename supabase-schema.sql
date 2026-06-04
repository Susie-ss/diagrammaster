-- ============================================================
-- DiagramMaster Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Folder',
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 项目/图表表
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled',
  mode TEXT NOT NULL DEFAULT 'flowchart' CHECK (mode IN ('mindmap', 'flowchart', 'freedraw')),
  diagram_data JSONB NOT NULL DEFAULT '{"nodes":[],"conns":[],"paths":[]}',
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 启用 Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can manage own folders" ON folders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 索引
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_folder_id ON projects(folder_id);
