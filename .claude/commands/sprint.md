# EdgeScan Sprint — 4 Parallel Teams

You are the **Sprint Coordinator** for EdgeScan (FastAPI backend + Next.js 14 frontend, repo at /home/user/Trial/edgescan, working branch: claude/edgescan-initial-setup-uiZgZ).

Run **one PM agent** first, then **four teams in parallel** (each team = Coder + QA + User Tester on its own git branch). Merge all branches at the end.

---

## Before starting — read context

Read these files:
- `/home/user/Trial/.claude/backlog.md`
- `/home/user/Trial/.claude/user-feedback.md`
- `/home/user/Trial/.claude/sprint-log.md` (last 1–2 entries)

Also run: `git log --oneline -3` to get the current HEAD commit.

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
> 1. Move any completed items from the last sprint into the DONE section.
> 2. Pick exactly **4 READY items** to build this sprint — one per team.
> 3. **CRITICAL: each item must touch different files.** No two items may edit the same file. List the primary file(s) for each item explicitly. If two items share a file, pick a different item or split the work.
> 4. If there are fewer than 4 READY items, promote and refine items from BACKLOG.
> 5. Write the updated backlog to `/home/user/Trial/.claude/backlog.md`.
> 6. Output a **PM Plan** in exactly this format:
>
> ```
> TEAM 1: [item name] | Files: [file1, file2] | Task: [one sentence description]
> TEAM 2: [item name] | Files: [file1, file2] | Task: [one sentence description]
> TEAM 3: [item name] | Files: [file1, file2] | Task: [one sentence description]
> TEAM 4: [item name] | Files: [file1, file2] | Task: [one sentence description]
> ```

Extract the PM Plan. You will use it to brief each team.

---

## STEP 2 — Create 4 branches (run before spawning coders)

Run these git commands (replace SPRINT_N with the current sprint number from the log):
```
git checkout claude/edgescan-initial-setup-uiZgZ
git checkout -b sprint/SPRINT_N-team-1
git checkout claude/edgescan-initial-setup-uiZgZ
git checkout -b sprint/SPRINT_N-team-2
git checkout claude/edgescan-initial-setup-uiZgZ
git checkout -b sprint/SPRINT_N-team-3
git checkout claude/edgescan-initial-setup-uiZgZ
git checkout -b sprint/SPRINT_N-team-4
git checkout claude/edgescan-initial-setup-uiZgZ
```

Push all 4 branches:
```
git push -u origin sprint/SPRINT_N-team-1
git push -u origin sprint/SPRINT_N-team-2
git push -u origin sprint/SPRINT_N-team-3
git push -u origin sprint/SPRINT_N-team-4
```

---

## STEP 3 — 4 Coders in parallel (spawn all 4 in one message)

Spawn 4 **general-purpose** agents simultaneously, one per team. Each gets this prompt (fill in team-specific values):

> You are the Coder for EdgeScan Team [N].
> - Repo: `/home/user/Trial/edgescan`
> - Your branch: `sprint/SPRINT_N-team-N` (already exists on remote — check it out first)
> - Frontend: `edgescan/frontend/`, Backend: `edgescan/backend/`
>
> **Your task:** [TASK FROM PM PLAN FOR THIS TEAM]
> **Files to edit:** [FILES FROM PM PLAN FOR THIS TEAM]
>
> Steps:
> 1. `git checkout sprint/SPRINT_N-team-N`
> 2. Read all files you will touch before changing anything.
> 3. Implement the task. Keep changes minimal and self-contained.
> 4. Run TypeScript check if you changed frontend files: `cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | head -30`
> 5. Run Python syntax check if you changed backend files: `cd /home/user/Trial/edgescan/backend && python -m py_compile main.py 2>&1`
> 6. Fix any errors.
> 7. Commit and push to YOUR branch only:
>    `git add <files> && git commit -m "feat(team-N): [description]" && git push -u origin sprint/SPRINT_N-team-N`
>
> Output a **Coder Report**: what you changed, which files, commit hash.

Wait for all 4 Coder agents to finish before proceeding.

---

## STEP 4 — 4 QA Engineers in parallel (spawn all 4 in one message)

Spawn 4 **general-purpose** agents simultaneously. Each gets this prompt:

> You are the QA Engineer for EdgeScan Team [N].
> - Branch to review: `sprint/SPRINT_N-team-N`
> - Repo: `/home/user/Trial/edgescan`
>
> **What was implemented:** [CODER REPORT FOR THIS TEAM]
>
> Steps:
> 1. `git checkout sprint/SPRINT_N-team-N`
> 2. Read the changed files carefully.
> 3. Run: `cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | tail -20`
> 4. Check for: broken imports, logic errors, SSR/hydration issues, invalid HTML, missing null checks.
> 5. If you find bugs: fix them, commit with message "fix(team-N): [desc] (QA pass)", push to `sprint/SPRINT_N-team-N`.
> 6. If clean, say so.
>
> Output a **QA Report**: bullet list of what you checked and found.

Wait for all 4 QA agents to finish.

---

## STEP 5 — 4 User Testers in parallel (spawn all 4 in one message)

Spawn 4 **general-purpose** agents simultaneously. Each gets this prompt:

> You are a demanding end-user of EdgeScan testing Team [N]'s work.
>
> **What was built:** [PM TASK + CODER REPORT FOR THIS TEAM]
> **Branch:** `sprint/SPRINT_N-team-N`
>
> Steps:
> 1. `git checkout sprint/SPRINT_N-team-N`
> 2. Read the changed files.
> 3. Evaluate from a phone-user perspective: Is it intuitive? What's missing? What could break?
> 4. Append your feedback to `/home/user/Trial/.claude/user-feedback.md` under a section:
>    `## [date] — Sprint N Team [N] feedback`
>    Include: Works well / Issues / Missing / New backlog suggestions (1–2 items)
>
> Output a **User Report** (2–3 sentences).

---

## STEP 6 — Merge all branches

Run these commands sequentially:
```
git checkout claude/edgescan-initial-setup-uiZgZ
git merge --no-ff sprint/SPRINT_N-team-1 -m "merge(sprint-N): team-1"
git merge --no-ff sprint/SPRINT_N-team-2 -m "merge(sprint-N): team-2"
git merge --no-ff sprint/SPRINT_N-team-3 -m "merge(sprint-N): team-3"
git merge --no-ff sprint/SPRINT_N-team-4 -m "merge(sprint-N): team-4"
git push -u origin claude/edgescan-initial-setup-uiZgZ
```

If a merge conflict occurs: resolve it by keeping both sets of changes (each team touched different files, so real conflicts mean the PM plan was wrong — take Team 1's version of any shared file and note it in the sprint log).

---

## STEP 7 — Write sprint summary

Run a final TypeScript check on the merged branch:
`cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | tail -20`

Prepend a new entry to `/home/user/Trial/.claude/sprint-log.md`:
```
---
## Sprint N — [date]
**Teams:** 4 parallel
**Merged commit:** [hash after merge]

| Team | Feature | Commit | QA | User verdict |
|------|---------|--------|----|--------------|
| 1 | ... | ... | clean/fixed | ... |
| 2 | ... | ... | clean/fixed | ... |
| 3 | ... | ... | clean/fixed | ... |
| 4 | ... | ... | clean/fixed | ... |
```

Commit: `git add .claude/ && git commit -m "Sprint N log" && git push`

Then print a clean summary to the user: "Sprint N complete — 4 features shipped:" with one bullet per team.
