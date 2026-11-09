// Shared by the client-side paced queue and the server-side job gate, so
// both sides agree on the rules. No "server-only" import — the client
// components read these numbers too.

// Minimum gap between any two job-creating Pulsar actions (go live,
// create historic preview, launch ingestion) from one browser. Product
// flagged that bulk actions were putting too many jobs on Pulsar's backend
// at once, affecting other domains — one job a minute keeps a big batch
// from stacking up there.
export const JOB_GAP_MS = 60_000;

// The server accepts a job slightly before the full gap, so normal timer
// drift in the browser doesn't cause a false "too soon" rejection.
export const JOB_GAP_TOLERANCE_MS = 5_000;

// Default for how many ingestion jobs from one bulk launch may be running on
// Pulsar at the same time. The next launch waits until one of these
// finishes. Ingestion can take a long time for big pulls, so the wizard lets
// the person change this (or turn it off) per launch.
export const DEFAULT_MAX_ACTIVE_INGESTIONS = 3;
export const MAX_ACTIVE_INGESTION_OPTIONS = [1, 3, 5, 0] as const; // 0 = no limit

// How many historic previews may still be generating before the next search's
// preview is created. Previews are backend jobs too.
export const MAX_ACTIVE_PREVIEWS = 2;

// How often to re-check whether a slot has freed up while waiting.
export const ACTIVE_RECHECK_MS = 30_000;

// Historic statuses that mean a launched ingestion is no longer running.
// Anything else after launch counts as still using Pulsar's backend —
// including the brief window before the status flips to LAUNCHING.
export const FINISHED_INGESTION_STATUSES = new Set(["COMPLETED", "STOPPED", "ERROR", "OLD", "PRUNING"]);

// Cookie holding the timestamp of the last job this browser created.
export const LAST_JOB_COOKIE = "pulsar_last_job_at";
