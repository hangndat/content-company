-- CreateTable
CREATE TABLE "crawled_article" (
    "id" TEXT NOT NULL,
    "dedupe_key" VARCHAR(64) NOT NULL,
    "trend_domain" VARCHAR(64) NOT NULL,
    "url" VARCHAR(2048),
    "title" VARCHAR(512) NOT NULL,
    "body_preview" TEXT,
    "source_id" VARCHAR(128),
    "raw_payload" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "processed_for_trend_at" TIMESTAMP(3),

    CONSTRAINT "crawled_article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crawled_article_dedupe_key_key" ON "crawled_article"("dedupe_key");

-- CreateIndex
CREATE INDEX "crawled_article_trend_domain_idx" ON "crawled_article"("trend_domain");

-- CreateIndex
CREATE INDEX "crawled_article_processed_for_trend_at_idx" ON "crawled_article"("processed_for_trend_at");
