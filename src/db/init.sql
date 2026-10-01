CREATE ROLE rtn_app LOGIN PASSWORD 'rtn_app' NOSUPERUSER NOBYPASSRLS;

CREATE TABLE return_records (
  record_id text PRIMARY KEY,
  organization_id text NOT NULL,
  client_id text NOT NULL,
  unit_id text NOT NULL,
  captured_at timestamptz NOT NULL,
  status text NOT NULL,
  disposition text NOT NULL,
  body jsonb NOT NULL
);

CREATE TABLE return_images (
  object_key text PRIMARY KEY,
  organization_id text NOT NULL,
  record_id text NOT NULL,
  content_type text NOT NULL
);

ALTER TABLE return_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_records FORCE ROW LEVEL SECURITY;
ALTER TABLE return_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_images FORCE ROW LEVEL SECURITY;

CREATE POLICY return_records_tenant ON return_records
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

CREATE POLICY return_images_tenant ON return_images
  USING (organization_id = current_setting('app.organization_id', true))
  WITH CHECK (organization_id = current_setting('app.organization_id', true));

GRANT SELECT, INSERT, UPDATE ON return_records TO rtn_app;
GRANT SELECT, INSERT ON return_images TO rtn_app;
