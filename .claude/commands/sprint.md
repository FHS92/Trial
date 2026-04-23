# EdgeScan Sprint — 2 Parallel Teams

You are the **Sprint Coordinator** for EdgeScan (FastAPI backend + Next.js 14 frontend, repo at /home/user/Trial/edgescan, working branch: claude/edgescan-initial-setup-uiZgZ).

Run **one PM agent** first, then **two teams in parallel** (each team = Coder + QA + User Tester on its own git worktree). Merge both branches at the end.

---

## Before starting — read context

Read these files:
- `/home/user/Trial/.claude/backlog.md`
- `/home/user/Trial/.claude/user-feedback.md`
- `/home/user/Trial/.claude/sprint-log.md` (last 1–2 entries)

Run `git log --oneline -3` to get the current HEAD commit hash.

---

## STEP 1 — PM Agent (run first, wait for result)

Spawn a **general-purpose** agent with this prompt:

> You are the Product Manager for EdgeScan.
>
> Read:
> - `/home/user/Trial/.claude/backlog.md`
> - `/home/user/Trial/.claude/user-feedback.md`
> - `/home/user/Trial/.claude/sprint-log.md`
>
> Your job:
> 1. Move any completed items from the last sprint into the DONE section of the backlog.
> 2. Pick exactly **2 READY items** to build this sprint — one per team.
> 3. **CRITICAL: the 2 items must touch different files.** List the exact primary file(s) for each. If two items share a file, pick a different item.
> 4. If fewer than 2 READY items exist, promote and refine items from BACKLOG.
> 5. Write the updated backlog to `/home/user/Trial/.claude/backlog.md`.
> 6. Output a **PM Plan** in exactly this format:
>
> ```
> TEAM 1: [item name] | Files: [file paths] | Task: [one clear sentence]
> TEAM 2: [item name] | Files: [file paths] | Task: [one clear sentence]
> ```

Extract the PM Plan from the agent's output before continuing.

---

## STEP 2 — Create 2 isolated worktrees

Determine the current sprint number N from the sprint log (increment by 1 from the last entry).

Run these commands to create isolated working directories per team (worktrees avoid the branch-collision problem):
```bash
git worktree add /tmp/edgescan-team-1 -b sprint/N-team-1
git worktree add /tmp/edgescan-team-2 -b sprint/N-team-2
git push -u origin sprint/N-team-1 sprint/N-team-2
```

---

## STEP 3 — 2 Coders in parallel (spawn both in one message)

Spawn 2 **general-purpose** agents simultaneously. Each gets this prompt (fill in team-specific values):

> You are the Coder for EdgeScan Team [1 or 2].
> - Your isolated working directory: `/tmp/edgescan-team-[1 or 2]`
> - Your branch: `sprint/N-team-[1 or 2]`
> - Frontend lives at: `/tmp/edgescan-team-[1 or 2]/edgescan/frontend/`
> - Backend lives at: `/tmp/edgescan-team-[1 or 2]/edgescan/backend/`
>
> **Your task:** [TASK FROM PM PLAN FOR THIS TEAM]
> **Files to edit:** [FILES FROM PM PLAN FOR THIS TEAM]
>
> Steps:
> 1. Work ONLY inside `/tmp/edgescan-team-[1 or 2]/` — never touch `/home/user/Trial/`.
> 2. Read all files you will edit before changing anything.
> 3. Implement the task. Keep changes minimal and self-contained.
> 4. TypeScript check (if frontend changed):
>    `cd /tmp/edgescan-team-[1 or 2]/edgescan/frontend && npx tsc --noEmit 2>&1 | head -30`
> 5. Python check (if backend changed):
>    `cd /tmp/edgescan-team-[1 or 2]/edgescan/backend && python -m py_compile main.py 2>&1`
> 6. Fix any errors found.
> 7. Commit and push from the worktree directory:
>    `cd /tmp/edgescan-team-[1 or 2] && git add <specific files> && git commit -m "feat(team-[N]): [description]" && git push -u origin sprint/N-team-[1 or 2]`
>
> Output a **Coder Report**: what you changed, which files, commit hash.

Wait for BOTH Coder agents to finish before spawning QA.

---

## STEP 4 — 2 QA Engineers in parallel (spawn both in one message)

Spawn 2 **general-purpose** agents simultaneously:

> You are the QA Engineer for EdgeScan Team [1 or 2].
> - Working directory: `/tmp/edgescan-team-[1 or 2]`
> - Branch: `sprint/N-team-[1 or 2]`
>
> **What was implemented:** [CODER REPORT FOR THIS TEAM]
>
> Steps:
> 1. Work ONLY inside `/tmp/edgescan-team-[1 or 2]/`.
> 2. Read the changed files carefully.
> 3. Run: `cd /tmp/edgescan-team-[1 or 2]/edgescan/frontend && npx tsc --noEmit 2>&1 | tail -20`
> 4. Check for: broken imports, logic errors, SSR/hydration issues, invalid HTML, missing null checks.
> 5. If bugs found: fix them, commit with `"fix(team-[N]): [desc] (QA pass)"`, push to `sprint/N-team-[1 or 2]`.
> 6. If clean, say so.
>
> Output a **QA Report**: bullet list of what you checked and found.

Wait for BOTH QA agents to finish before spawning User Testers.

---

## STEP 5 — 2 User Testers in parallel (spawn both in one message)

Spawn 2 **general-purpose** agents simultaneously:

> You are a demanding end-user of EdgeScan testing Team [1 or 2]'s work.
> - Working directory: `/tmp/edgescan-team-[1 or 2]`
>
> **What was built:** [PM TASK + CODER REPORT FOR THIS TEAM]
>
> Steps:
> 1. Read the changed files in `/tmp/edgescan-team-[1 or 2]/`.
> 2. Evaluate from a phone-user perspective: Is it intuitive? What's missing? What could break?
> 3. Browse 1–2 other pages in the frontend to spot any unrelated UX issues worth flagging.
> 4. Append feedback to `/home/user/Trial/.claude/user-feedback.md` (this file is shared — append, do not overwrite):
>    ```
>    ## [date] — Sprint N Team [1 or 2] feedback
>    **Feature tested:** [name]
>    **Works well:** ...
>    **Issues / confusing parts:** ...
>    **Missing / wish it had:** ...
>    **New backlog suggestions:** (1–2 items)
>    ```
>
> Output a **User Report** (2–3 sentences).

---

## STEP 6 — Merge both branches

```bash
cd /home/user/Trial
git checkout claude/edgescan-initial-setup-uiZgZ
git merge --no-ff sprint/N-team-1 -m "merge(sprint-N): team-1"
git merge --no-ff sprint/N-team-2 -m "merge(sprint-N): team-2"
```

If a merge conflict occurs (means PM assigned overlapping files — shouldn't happen): keep both sets of changes manually, note it in the sprint log.

Run final TypeScript check on merged result:
```bash
cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | tail -10
```

Push and clean up:
```bash
cd /home/user/Trial
git push -u origin claude/edgescan-initial-setup-uiZgZ
git worktree remove /tmp/edgescan-team-1 --force
git worktree remove /tmp/edgescan-team-2 --force
git branch -d sprint/N-team-1 sprint/N-team-2
git push origin --delete sprint/N-team-1 sprint/N-team-2
```

---

## STEP 7 — Write sprint summary

Prepend a new entry to `/home/user/Trial/.claude/sprint-log.md`:
```
---
## Sprint N — [date] (2 parallel teams)
**Merged commit:** [hash]

| Team | Feature | Commit | QA | User verdict (1 line) |
|------|---------|--------|----|-----------------------|
| 1    | ...     | ...    | clean / fixed: ... | ... |
| 2    | ...     | ...    | clean / fixed: ... | ... |
```

Commit and push:
```bash
cd /home/user/Trial
git add .claude/ && git commit -m "Sprint N log" && git push -u origin claude/edgescan-initial-setup-uiZgZ
```

Then tell the user: **"Sprint N complete — 2 features shipped:"** with one bullet per team.
