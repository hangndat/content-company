-- AlterTable
ALTER TABLE "trend_topic_observation" ADD COLUMN "article_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill from JobOutput.trend_candidates (khớp logic articleCountFromCandidate)
UPDATE "trend_topic_observation" AS t
SET "article_count" = GREATEST(0, COALESCE(
  (
    SELECT
      CASE
        WHEN cand IS NULL OR jsonb_typeof(cand) != 'object' THEN 0
        WHEN jsonb_typeof(cand->'sourceArticles') = 'array' AND jsonb_array_length(cand->'sourceArticles') > 0
          THEN jsonb_array_length(cand->'sourceArticles')
        WHEN jsonb_typeof(cand->'itemRefs') = 'array' AND jsonb_array_length(cand->'itemRefs') > 0
          THEN jsonb_array_length(cand->'itemRefs')
        WHEN cand ? 'sourceCount' AND (cand->>'sourceCount') ~ '^-?[0-9]+$'
          THEN GREATEST(0, (cand->>'sourceCount')::int)
        ELSE 0
      END
    FROM "JobOutput" AS jo,
    LATERAL (SELECT (jo."trend_candidates"::jsonb) -> t."candidate_index" AS cand) AS x
    WHERE jo."job_id" = t."source_job_id"
    LIMIT 1
  ),
  0
));

-- CreateIndex
CREATE INDEX "trend_topic_observation_article_count_created_at_idx" ON "trend_topic_observation"("article_count" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "trend_topic_observation_trend_domain_article_count_created_at_idx" ON "trend_topic_observation"("trend_domain", "article_count" DESC, "created_at" DESC);
