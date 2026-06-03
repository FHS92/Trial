# Lightweight Code Review

Focused correctness review. Runs 3 parallel finder agents (no cleanup/efficiency/altitude angles) then verifies survivors. Fast and token-efficient.

## Phase 0 — Get the diff

Run `git diff HEAD~1...HEAD`. If empty, run `git diff HEAD`. That is the review scope.

## Phase 1 — Find candidates (3 angles, up to 4 each, run in parallel)

Spawn **3 agents via the Agent tool simultaneously**:

### Angle A — Line-by-line
Read every changed line plus the enclosing function. Ask: what input, state, or platform makes this wrong? Look for: wrong condition, off-by-one, null/undefined deref, missing `await`, error swallowed, wrong variable in copy-paste.

### Angle B — Removed-behavior
For every deleted line, name the invariant it enforced. Search new code for where it is re-established. Missing guard, dropped validation, removed error path = candidate.

### Angle C — Cross-file
For each changed function, find callers (grep). Does the change break any call site? Changed return shape, new precondition, timing/ordering dependency?

Each agent returns up to 4 candidates: `{ file, line, summary, failure_scenario }`.

## Phase 2 — Verify

Dedup near-duplicates. For each remaining candidate run **one verifier agent** (parallel where possible). Verdict: CONFIRMED / PLAUSIBLE / REFUTED.

PLAUSIBLE by default — only REFUTE when provably impossible from the code.

Keep CONFIRMED and PLAUSIBLE. Drop REFUTED.

## Output

JSON array, at most 6 objects, ranked most-severe first:

```json
[{ "file": "...", "line": 123, "summary": "...", "failure_scenario": "..." }]
```

If nothing survives: `[]`
