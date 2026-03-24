import type { Logger } from "pino";

/**
 * Shared loop: run ordered steps, persist snapshot after each merge.
 * Used by content and trend graph runners.
 */
export async function runStepsWithSnapshots<S, Step extends string>(opts: {
  jobId: string;
  logger: Logger;
  logLabel: string;
  steps: readonly Step[];
  initialState: S;
  onStep: (step: Step, state: S) => Promise<{ next: S; done?: boolean }>;
  persistSnapshot: (step: Step, state: S) => Promise<void>;
}): Promise<S> {
  let state = opts.initialState;
  for (const step of opts.steps) {
    opts.logger.info({ jobId: opts.jobId, step }, opts.logLabel);
    const { next, done } = await opts.onStep(step, state);
    state = next;
    await opts.persistSnapshot(step, state);
    if (done) break;
  }
  return state;
}
