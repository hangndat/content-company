-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "decision" VARCHAR(32),
    "source_type" VARCHAR(32) NOT NULL,
    "topic_score" DECIMAL(5,4),
    "review_score" DECIMAL(5,4),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobInput" (
    "job_id" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "normalized_payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobInput_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "JobOutput" (
    "job_id" TEXT NOT NULL,
    "outline" TEXT,
    "draft" TEXT,
    "review_notes" TEXT,
    "final_decision_payload" JSONB,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOutput_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "actor" VARCHAR(128) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedContent" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "channel_id" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "publish_ref" VARCHAR(255),
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotency_key_key" ON "Job"("idempotency_key");

-- CreateIndex
CREATE INDEX "Job_trace_id_idx" ON "Job"("trace_id");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_idempotency_key_idx" ON "Job"("idempotency_key");

-- CreateIndex
CREATE INDEX "Approval_job_id_idx" ON "Approval"("job_id");

-- CreateIndex
CREATE INDEX "PublishedContent_job_id_idx" ON "PublishedContent"("job_id");

-- AddForeignKey
ALTER TABLE "JobInput" ADD CONSTRAINT "JobInput_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOutput" ADD CONSTRAINT "JobOutput_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedContent" ADD CONSTRAINT "PublishedContent_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
