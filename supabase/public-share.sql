-- Add public sharing support to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS public_share_id TEXT UNIQUE DEFAULT NULL;

-- Create index for fast public share lookups
CREATE INDEX IF NOT EXISTS idx_sites_public_share_id ON sites(public_share_id) WHERE public_share_id IS NOT NULL;

-- Allow anyone to read a site row if it has a public_share_id (for public dashboards)
CREATE POLICY "Anyone can read public sites" ON sites
  FOR SELECT
  USING (public_share_id IS NOT NULL);
