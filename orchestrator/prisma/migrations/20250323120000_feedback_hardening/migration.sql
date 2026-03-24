-- Add prompt_versions to JobOutput
ALTER TABLE "JobOutput" ADD COLUMN "prompt_versions" JSONB;

-- Expand ContentMetric
ALTER TABLE "ContentMetric" ADD COLUMN "topic_label" VARCHAR(512);
ALTER TABLE "ContentMetric" ADD COLUMN "topic_signature" VARCHAR(64);
ALTER TABLE "ContentMetric" ADD COLUMN "impressions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentMetric" ADD COLUMN "avg_review_score" DECIMAL(5,4);

-- Index for topic_signature
CREATE INDEX "ContentMetric_topic_signature_idx" ON "ContentMetric"("topic_signature");
