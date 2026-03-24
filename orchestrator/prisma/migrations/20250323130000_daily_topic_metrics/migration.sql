-- CreateTable
CREATE TABLE "DailyTopicMetric" (
    "id" TEXT NOT NULL,
    "topic_key" VARCHAR(255) NOT NULL,
    "topic_signature" VARCHAR(64) NOT NULL DEFAULT '',
    "metric_date" DATE NOT NULL,
    "avg_ctr" DECIMAL(10,6) NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "avg_review_score" DECIMAL(5,4),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTopicMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyTopicMetric_topic_key_topic_signature_metric_date_key" ON "DailyTopicMetric"("topic_key", "topic_signature", "metric_date");

-- CreateIndex
CREATE INDEX "DailyTopicMetric_topic_key_idx" ON "DailyTopicMetric"("topic_key");

-- CreateIndex
CREATE INDEX "DailyTopicMetric_topic_signature_idx" ON "DailyTopicMetric"("topic_signature");

-- CreateIndex
CREATE INDEX "DailyTopicMetric_metric_date_idx" ON "DailyTopicMetric"("metric_date");
