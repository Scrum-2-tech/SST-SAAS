-- Apply once to databases created before folder notes and audit extensions.
BEGIN;

ALTER TABLE folders
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE sst_audits
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS follow_up_date DATE,
    ADD COLUMN IF NOT EXISTS observations TEXT,
    ADD COLUMN IF NOT EXISTS observations_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS observations_updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_sst_audits_folder_id ON sst_audits(folder_id);

CREATE TABLE IF NOT EXISTS sst_audit_checklist_items (
    id UUID PRIMARY KEY,
    audit_id UUID NOT NULL REFERENCES sst_audits(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_sst_audit_checklist_items_audit_id
    ON sst_audit_checklist_items(audit_id);

COMMIT;
