-- Add file_size column to reports table
-- This fixes the error: column reports.file_size does not exist

ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add comment to explain the column
COMMENT ON COLUMN reports.file_size IS 'File size in bytes of the uploaded report file';