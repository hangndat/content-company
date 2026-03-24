# A/B Testing System Design

## 1. Schema

```
Experiment
  - id, name, nodeType (planner|scorer|writer|reviewer)
  - scope (global|channel|topic|source_type)
  - scopeValue (nullable, e.g. channel.id, topic_key, rss/webhook)
  - status (draft|running|paused|completed)
  - numBuckets (default 100), createdAt, updatedAt

ExperimentArm
  - id, experimentId, name (control|variant_a|...)
  - promptType, promptVersion
  - bucketStart, bucketEnd (inclusive, 0..numBuckets-1)

JobOutput.experimentAssignments (JSON)
  - { [experimentId]: { armId, armName, nodeType, promptType, promptVersion } }
  - Richer shape for debug/report without joins; replay knows exact prompt used

ExperimentResultsDaily
  - experimentId, armId, metricDate
  - jobsCount, approvedCount, reviewRequiredCount, rejectedCount
  - impressions, views, clicks
  - avgReviewScore (0..1), smoothedCtr, sampleCount

Score scale (schema/docs/report): topicScore, reviewScore, avgReviewScore = 0..1 (0=worst, 1=best)
```

## 2. Module Structure

```
orchestrator/src/
├── experiments/
│   ├── index.ts              # re-exports
│   ├── assignment.ts         # deterministic hash bucket assignment
│   ├── resolver.ts           # experiment-aware prompt resolver
│   └── ...
├── repos/
│   ├── experiment.ts
│   ├── experiment-arm.ts
│   └── experiment-results.ts
├── api/routes/
│   └── experiments.ts
└── jobs/
    └── aggregate-experiment-metrics.ts
```

## 3. API Contract

| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/experiments | Create experiment. At most one arm named "control"; else first arm = default control (see _note) |
| GET | /v1/experiments | List experiments |
| GET | /v1/experiments/:id | Detail + arms + latest results |
| POST | /v1/experiments/:id/start | status → running |
| POST | /v1/experiments/:id/pause | status → paused |
| POST | /v1/experiments/:id/complete | status → completed |
| POST | /v1/experiments/:id/promote | Promote winning arm → active prompt |
| GET | /v1/experiments/:id/report | Metrics by arm, winner suggestion |

## 4. Resolver Design

```
getPrompt(db, type, placeholders, context?)
  context = { jobId, channel?, topicKey?, sourceType? }

  1. Find running experiments for this nodeType + scope match
  2. For each experiment:
     - Compute assignment: hash(jobId + experimentId + scopeValue) % numBuckets
     - Find arm where bucket in [bucketStart, bucketEnd]
     - If found: use arm.promptVersion, store assignment
  3. If no assignment from experiments → getActiveWithVersion(type) (fallback)
  4. Return { content, version, experimentAssignment? }
```

## 5. Aggregation Design

- Cron: same pattern as daily_topic_metrics
- For each (experimentId, armId, date): aggregate from Job + ContentMetric
- Upsert ExperimentResultsDaily by (experimentId, armId, metricDate)
- Metrics: jobs count, decision breakdown, impressions/views/clicks, avg review score, smoothed CTR

## 6. Task Checklist

- [x] Schema + migration
- [x] Experiment + Arm repos
- [x] Assignment logic (hash bucket)
- [x] Resolver integration
- [x] JobOutput stores experimentAssignments
- [x] Graph passes context to getPrompt
- [x] Experiment APIs
- [x] Aggregation job
- [x] Report + winner suggestion
- [x] Definition of Done verification

## 8. Aggregation date semantics

- **Cohort by job creation date** (current): Metrics grouped by when the job ran. Good for internal ops.
- **Performance by metric recorded date** (future): Group views/clicks by when they were recorded. Better for lagging metrics. Dashboard should distinguish these clearly to avoid confusion.

## 9. Definition of Done

- No experiment running → flow unchanged (fallback to active prompt)
- Job stores assignment + prompt version used
- Deterministic: same jobId + experiment + scope → same arm
- Promote sets winning arm's prompt as active
- Report returns metrics per arm
- Winner suggestion: highest smoothed CTR with guards (min 10 samples, approveRate drop ≤5%, avgReviewScore drop ≤0.03 vs control). avgReviewScore scale: 0..1.
- Control arm: arm named "control" or first-created arm. Create API validates at most one "control" and returns controlArmId, controlArmName, _note when first arm is default control.
