-- AlterTable
ALTER TABLE "crawled_article" ADD COLUMN "trend_content_source_id" TEXT;

-- CreateIndex
CREATE INDEX "crawled_article_trend_content_source_id_idx" ON "crawled_article"("trend_content_source_id");

-- AddForeignKey
ALTER TABLE "crawled_article" ADD CONSTRAINT "crawled_article_trend_content_source_id_fkey" FOREIGN KEY ("trend_content_source_id") REFERENCES "trend_content_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
