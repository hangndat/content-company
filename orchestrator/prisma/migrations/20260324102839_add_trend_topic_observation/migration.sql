-- CreateTable
CREATE TABLE "trend_topic_observation" (
    "id" TEXT NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "trend_domain" VARCHAR(64) NOT NULL,
    "source_job_id" TEXT NOT NULL,
    "candidate_index" INTEGER NOT NULL,
    "topic_title" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_topic_observation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trend_topic_observation_fingerprint_idx" ON "trend_topic_observation"("fingerprint");

-- CreateIndex
CREATE INDEX "trend_topic_observation_source_job_id_idx" ON "trend_topic_observation"("source_job_id");

-- CreateIndex
CREATE INDEX "trend_topic_observation_trend_domain_idx" ON "trend_topic_observation"("trend_domain");

-- AddForeignKey
ALTER TABLE "trend_topic_observation" ADD CONSTRAINT "trend_topic_observation_source_job_id_fkey" FOREIGN KEY ("source_job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
