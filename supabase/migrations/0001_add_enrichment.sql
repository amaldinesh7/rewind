-- Add enrichment columns to items
ALTER TABLE items ADD COLUMN enrichment_status text DEFAULT 'none';
ALTER TABLE items ADD COLUMN enriched_at timestamptz;

-- Create platform_metadata table
CREATE TABLE platform_metadata (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE UNIQUE,
  platform text NOT NULL,
  og_title text,
  og_description text,
  og_image text,
  og_site_name text,
  platform_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_platform_metadata_item_id ON platform_metadata(item_id);
