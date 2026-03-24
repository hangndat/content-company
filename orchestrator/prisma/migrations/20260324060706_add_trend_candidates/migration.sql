-- DropIndex
DROP INDEX "Approval_job_id_idx";

-- DropIndex
DROP INDEX "Job_idempotency_key_idx";

-- DropIndex
DROP INDEX "Job_status_idx";

-- DropIndex
DROP INDEX "Job_trace_id_idx";

-- DropIndex
DROP INDEX "PublishedContent_job_id_idx";

-- AlterTable
ALTER TABLE "Approval" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContentMetric" ALTER COLUMN "recorded_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContentVersion" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobInput" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobOutput" ADD COLUMN     "trend_candidates" JSONB,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobStateSnapshot" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PromptVersion" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PublishedContent" ALTER COLUMN "published_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
