-- Retain all original batches and rows, including historical duplicates.
-- Reads use DISTINCT; future imports skip existing records under an advisory lock.
CREATE INDEX IF NOT EXISTS fingerprint_identity
  ON fingerprint_logs(employee_id,punch_timestamp,punch_type);
