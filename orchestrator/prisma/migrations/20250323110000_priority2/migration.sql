-- CreateTable
CREATE TABLE "ContentMetric" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "channel_id" VARCHAR(128) NOT NULL,
    "topic_key" VARCHAR(255),
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentMetric_job_id_channel_id_key" ON "ContentMetric"("job_id", "channel_id");

-- CreateIndex
CREATE INDEX "ContentMetric_topic_key_idx" ON "ContentMetric"("topic_key");

-- CreateIndex
CREATE INDEX "ContentMetric_job_id_idx" ON "ContentMetric"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_type_version_key" ON "PromptVersion"("type", "version");

-- CreateIndex
CREATE INDEX "PromptVersion_type_idx" ON "PromptVersion"("type");

-- AddForeignKey
ALTER TABLE "ContentMetric" ADD CONSTRAINT "ContentMetric_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
