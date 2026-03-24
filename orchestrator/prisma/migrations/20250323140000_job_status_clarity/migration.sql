-- Migrate legacy 'running' to 'processing' for consistency
UPDATE "Job" SET status = 'processing' WHERE status = 'running';
