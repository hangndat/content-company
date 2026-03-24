-- Add experiment_assignments to JobOutput
ALTER TABLE "JobOutput" ADD COLUMN "experiment_assignments" JSONB;

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "node_type" VARCHAR(32) NOT NULL,
    "scope" VARCHAR(32) NOT NULL,
    "scope_value" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "num_buckets" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentArm" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "prompt_type" VARCHAR(64) NOT NULL,
    "prompt_version" INTEGER NOT NULL,
    "bucket_start" INTEGER NOT NULL,
    "bucket_end" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentArm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentResultsDaily" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "arm_id" TEXT NOT NULL,
    "metric_date" DATE NOT NULL,
    "jobs_count" INTEGER NOT NULL DEFAULT 0,
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "review_required_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "avg_review_score" DECIMAL(5,4),
    "smoothed_ctr" DECIMAL(10,6),
    "sample_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentResultsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experiment_node_type_idx" ON "Experiment"("node_type");
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");
CREATE INDEX "Experiment_node_type_status_idx" ON "Experiment"("node_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentArm_experiment_id_name_key" ON "ExperimentArm"("experiment_id", "name");
CREATE INDEX "ExperimentArm_experiment_id_idx" ON "ExperimentArm"("experiment_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentResultsDaily_experiment_id_arm_id_metric_date_key" ON "ExperimentResultsDaily"("experiment_id", "arm_id", "metric_date");
CREATE INDEX "ExperimentResultsDaily_experiment_id_idx" ON "ExperimentResultsDaily"("experiment_id");
CREATE INDEX "ExperimentResultsDaily_metric_date_idx" ON "ExperimentResultsDaily"("metric_date");

-- AddForeignKey
ALTER TABLE "ExperimentArm" ADD CONSTRAINT "ExperimentArm_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentResultsDaily" ADD CONSTRAINT "ExperimentResultsDaily_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperimentResultsDaily" ADD CONSTRAINT "ExperimentResultsDaily_arm_id_fkey" FOREIGN KEY ("arm_id") REFERENCES "ExperimentArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
