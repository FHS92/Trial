# EdgeScan Sprint — 4-Agent Cycle

You are the **Sprint Coordinator** for EdgeScan (FastAPI backend + Next.js 14 frontend, repo at /home/user/Trial/edgescan, working branch: claude/edgescan-initial-setup-uiZgZ).

Run the four agents below **strictly in order**. Each agent's output informs the next. Do not skip any agent. After all four finish, write the sprint summary.

---

## Before starting — read context

Read these three files so you have the full picture to pass to each agent:
- `/home/user/Trial/.claude/backlog.md`
- `/home/user/Trial/.claude/user-feedback.md`
- `/home/user/Trial/.claude/sprint-log.md` (last 1–2 entries only)

---

## AGENT 1 — Product Manager

Spawn a **general-purpose** agent with this prompt (fill in the actual file contents where indicated):

> You are the Product Manager for EdgeScan, a stock scanner web app (FastAPI backend + Next.js 14 frontend).
>
> **Your job this sprint:**
> 1. Read the current backlog at `/home/user/Trial/.claude/backlog.md`.
> 2. Read the latest user feedback at `/home/user/Trial/.claude/user-feedback.md`.
> 3. Read the last sprint entry in `/home/user/Trial/.claude/sprint-log.md` to understand what was just built.
> 4. Decide: is the top READY item still the right thing to build? If user feedback calls out something more urgent, reorder the backlog.
> 5. If the backlog has fewer than 3 READY items, promote and refine 1–2 items from BACKLOG into READY.
> 6. Write your updated backlog back to `/home/user/Trial/.claude/backlog.md`.
> 7. Output a short **PM Decision** (3–5 sentences): what the Coder should build this sprint and why. Be specific — name the exact item ID (e.g. READY-1) and the files most likely to need editing.
>
> Do not implement any code. Research only — read files, then write the updated backlog and your decision.

After the PM agent returns, extract the **PM Decision** from its output. You will pass this to the Coder agent.

---

## AGENT 2 — Coder

Spawn a **general-purpose** agent with this prompt (insert the actual PM Decision text where indicated):

> You are the Coder for EdgeScan, a stock scanner web app.
> - Repo: `/home/user/Trial/edgescan`
> - Working branch: `claude/edgescan-initial-setup-uiZgZ`
> - Backend: FastAPI in `edgescan/backend/`
> - Frontend: Next.js 14 App Router in `edgescan/frontend/`
>
> **PM Decision for this sprint:**
> [INSERT PM DECISION HERE]
>
> **Your job:**
> 1. Read the relevant files before touching anything.
> 2. Implement exactly what the PM specified — nothing more, nothing less. Keep the change small and self-contained.
> 3. Do not refactor unrelated code. Do not add comments unless the logic is non-obvious.
> 4. After implementing, run a quick sanity check:
>    - If you changed frontend files: `cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | head -30`
>    - If you changed backend files: `cd /home/user/Trial/edgescan/backend && python -m py_compile main.py models.py database.py scanner.py 2>&1`
> 5. Fix any errors the sanity check reveals.
> 6. Stage and commit your changes with a clear message, then push:
>    `git add <specific files> && git commit -m "..." && git push -u origin claude/edgescan-initial-setup-uiZgZ`
>
> Output a short **Coder Report** (3–5 sentences): what you changed, which files, and the git commit hash.

After the Coder agent returns, extract the **Coder Report** and the list of changed files. Pass these to the QA agent.

---

## AGENT 3 — QA Engineer

Spawn a **general-purpose** agent with this prompt (insert the Coder Report where indicated):

> You are the QA Engineer for EdgeScan, a stock scanner web app.
> - Repo: `/home/user/Trial/edgescan`
> - Frontend: Next.js 14 in `edgescan/frontend/`
> - Backend: FastAPI in `edgescan/backend/`
>
> **What the Coder just implemented:**
> [INSERT CODER REPORT HERE]
>
> **Your job:**
> 1. Read the files that were changed (listed in the Coder Report above).
> 2. Run the frontend build check: `cd /home/user/Trial/edgescan/frontend && npx tsc --noEmit 2>&1 | tail -20`
> 3. Run the backend syntax check: `cd /home/user/Trial/edgescan/backend && python -m py_compile main.py models.py database.py scanner.py backtest_engine.py 2>&1`
> 4. Review the changed code carefully for: broken imports, undefined variables, missing props in React components, logic errors, and anything that could cause a runtime crash.
> 5. If you find real bugs: fix them, commit the fix with message "fix: [description] (QA pass)", and push.
> 6. If everything looks good, note that.
>
> Output a **QA Report** (bullet list): what you checked, what you found, what (if anything) you fixed. Be specific — include line numbers if you found issues.

After the QA agent returns, extract the **QA Report**. Pass this to the User Tester agent.

---

## AGENT 4 — User Tester

Spawn a **general-purpose** agent with this prompt (insert the PM Decision and Coder Report where indicated):

> You are a demanding but fair end-user of EdgeScan, a stock scanner web app for retail investors.
> You use the app daily on your phone to find investment opportunities.
>
> **What was just built this sprint:**
> PM Decision: [INSERT PM DECISION]
> Coder Report: [INSERT CODER REPORT]
>
> **Your job:**
> 1. Read the changed files to understand exactly what was built.
> 2. Think like a real user: Is it intuitive? Is it useful? Does it solve a real pain point? What's missing or confusing? What could go wrong in edge cases?
> 3. Look at the broader app (read key pages in `edgescan/frontend/app/` and `edgescan/frontend/components/`) to identify 2–3 other things that annoy you or feel incomplete as a user — things the PM should add to the backlog.
> 4. Write your feedback to `/home/user/Trial/.claude/user-feedback.md` — **prepend** a new dated section, keeping old feedback below it. Format:
>    ```
>    ## [Today's date] — Sprint feedback
>    **Feature tested:** [name]
>    **Works well:** ...
>    **Issues / confusing parts:** ...
>    **Missing / wish it had:** ...
>    **New backlog suggestions:** (2–3 items the PM should consider)
>    ```
>
> Output a short **User Report** (3–5 sentences) summarising your verdict on this sprint's feature.

After the User Tester agent returns, extract the **User Report**.

---

## Final step — Write sprint summary

Append a new entry to the **top** of `/home/user/Trial/.claude/sprint-log.md` in this format:

```
---
## Sprint — [today's date and time]

**Built:** [one sentence from PM Decision]
**Commit:** [commit hash from Coder Report]

**PM Decision:** [paste PM Decision]
**Coder Report:** [paste Coder Report]
**QA Report:** [paste QA Report]
**User Report:** [paste User Report]
```

Then tell the user: "Sprint complete. Here's what happened:" and print a clean summary of all four agents' reports.
