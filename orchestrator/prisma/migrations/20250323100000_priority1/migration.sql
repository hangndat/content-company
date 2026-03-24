-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "draft" TEXT,
    "review_score" DECIMAL(5,4),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStateSnapshot" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "step" VARCHAR(64) NOT NULL,
    "state_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_job_id_version_key" ON "ContentVersion"("job_id", "version");

-- CreateIndex
CREATE INDEX "ContentVersion_job_id_idx" ON "ContentVersion"("job_id");

-- CreateIndex
CREATE INDEX "JobStateSnapshot_job_id_idx" ON "JobStateSnapshot"("job_id");

-- CreateIndex
CREATE INDEX "JobStateSnapshot_job_id_step_idx" ON "JobStateSnapshot"("job_id", "step");

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStateSnapshot" ADD CONSTRAINT "JobStateSnapshot_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
