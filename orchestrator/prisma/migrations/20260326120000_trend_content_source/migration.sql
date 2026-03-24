-- CreateTable
CREATE TABLE "trend_content_source" (
    "id" TEXT NOT NULL,
    "trend_domain" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(32) NOT NULL DEFAULT 'rss',
    "label" VARCHAR(255),
    "feed_url" VARCHAR(2048) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "last_item_count" INTEGER,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_content_source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trend_content_source_trend_domain_idx" ON "trend_content_source"("trend_domain");

-- CreateIndex
CREATE INDEX "trend_content_source_enabled_idx" ON "trend_content_source"("enabled");
