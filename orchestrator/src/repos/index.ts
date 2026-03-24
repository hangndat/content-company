import type { PrismaClient } from "@prisma/client";
import { createJobRepo } from "./job.js";
import { createContentDraftRepo } from "./content-draft.js";
import { createPublishedRepo } from "./published.js";
import { createExperimentRepo } from "./experiment.js";
import { createPromptVersionRepo } from "./prompt-version.js";
import { createCrawledArticleRepo } from "./crawled-article.js";
import { createTrendTopicObservationRepo } from "./trend-topic-observation.js";
import { createContentMetricRepo } from "./content-metric.js";
import { createTrendContentSourceRepo } from "./trend-content-source.js";

export function createRepos(db: PrismaClient) {
  return {
    job: createJobRepo(db),
    contentDraft: createContentDraftRepo(db),
    published: createPublishedRepo(db),
    experiment: createExperimentRepo(db),
    promptVersion: createPromptVersionRepo(db),
    crawledArticle: createCrawledArticleRepo(db),
    trendTopicObservation: createTrendTopicObservationRepo(db),
    contentMetric: createContentMetricRepo(db),
    trendContentSource: createTrendContentSourceRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
