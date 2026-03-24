-- CreateTable
CREATE TABLE "content_draft" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "outline" TEXT,
    "body" TEXT,
    "review_notes" TEXT,
    "decision" VARCHAR(32),
    "topic_score" DECIMAL(5,4),
    "review_score" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_draft_job_id_key" ON "content_draft"("job_id");

-- AddForeignKey
ALTER TABLE "content_draft" ADD CONSTRAINT "content_draft_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
