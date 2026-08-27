---
name: action-tracker
description: Persistent cross-session checklist of actions required of the user. Invoke when the user types /action-tracker, AND whenever the session needs the user to personally do something the agent cannot (approve/merge a PR, run an interactive auth/login command, make a decision, act on an external system or account) — log it. Also invoke when resuming work or when the user asks what's outstanding, to read and verify the checklist.
---

# Action Tracker

A persistent, cross-session markdown checklist of actions only the user can perform. Data lives in `~/.claude/action-tracker/`:

- `actions.md` — the checklist (source of truth, human-editable)
- `config.json` — `{"mode": "auto" | "manual"}`

A companion website (see **serve** below) lets the user check items off and draft Jira tickets.

## First run

If `~/.claude/action-tracker/config.json` does not exist:

1. Ask the user (AskUserQuestion) which mode they want:
   - **auto** — every session logs required user-actions automatically whenever it hits one.
   - **manual** — sessions only touch the tracker when explicitly invoked via `/action-tracker`.
2. Write `config.json` with the answer.
3. If `actions.md` doesn't exist, create it containing only a `# Actions` line.

## Mode gate

Read `config.json` at the start of every invocation. If `mode` is `manual` and this invocation was NOT an explicit `/action-tracker` command from the user, stop — do nothing else from this skill.

The user can switch modes any time: `/action-tracker mode auto|manual` (or asking in plain words) → rewrite `config.json` and confirm.

## File format

```markdown
# Actions

## 2026-08-27 — sor-client — fixing OKX balance retention

- [ ] Approve and merge PR #8175 **CJ-12529** <!-- at:id=k3f9x2 jira=CJ-12529 project=sor-client session=007f7f3b created=2026-08-27T14:05Z -->
  > The OKX balance-retention fix is done and CI is green, but the repo requires a human
  > approval before merge. Once merged it still needs the develop backport (separate item).
- [x] Run `gcloud auth login` in a terminal <!-- at:id=m1q8z4 jira= project=sor-client session=007f7f3b created=2026-08-27T14:20Z done=2026-08-27T15:00Z -->
```

Rules:

- One `##` heading per session: `## <YYYY-MM-DD> — <repo/project dir name> — <one-line session description>`. Create it the first time this session logs an item; reuse it for later items in the same session.
- Each item is a single `- [ ]` line ending in an HTML comment of the exact shape `<!-- at:id=XXXXXX jira=... project=... session=... created=... -->` (plus `done=...` once checked). No newlines inside an item.
- **Context block** (strongly encouraged): immediately below the item line, add 1–6 lines each starting with exactly `  > ` (two spaces, `>`, space) capturing the conversation context at the moment the action arose — what was being worked on, why the action is needed, and any detail the user will want when they see the item cold days later. The website shows this collapsed behind a "Show context" button. Context lines belong to the item line above them; keep them free of `<!-- at: -->` comments.
- `id` — 6 random lowercase alphanumeric chars, unique in the file. Generate fresh per item.
- `jira` — the ticket key (e.g. `CJ-12529`) when known from the branch, conversation, or context; empty otherwise. When known, also put `**CJ-xxxx**` in the visible text.
- `session` — a short stable identifier for this session (first 8 chars of the session ID if known, else the date+description suffice).
- Timestamps are UTC ISO-8601 minutes precision, e.g. `2026-08-27T14:05Z`.
- Agents are **append-only**: add headings and items at the end of the file; never reorder or rewrite other sessions' lines. Checking items off is done by the user (website or hand-editing) — the only exception is the verification flow below, with the user's consent.

**Concurrency:** other sessions and the website write this file too. Always re-read `actions.md` immediately before every edit, and make edits with the Edit tool (exact-match, line-level) rather than rewriting the whole file.

## Logging (auto mode, or `/action-tracker log <text>`)

When the session needs the user to do something it cannot do itself — merge/approve a PR, run an interactive command (`gcloud auth login`, MFA), decide something, act on an external system:

1. Re-read `actions.md`. If an equivalent item already exists unchecked, don't duplicate it.
2. Append the item under this session's heading (creating the heading if needed), following the format above — including a `  > ` context block quoting or tightly paraphrasing the surrounding explanation from this moment in the conversation, so the item makes sense on its own later.
3. Tell the user in one line, e.g. `Logged to action tracker: "Approve PR #8175" (CJ-12529).`

Log real user-actions only — not the agent's own todo items, and not things the user already did.

## Reading & verification

When resuming prior work, when the user asks "what's outstanding?", or on bare `/action-tracker`:

1. Read `actions.md`.
2. Treat checkboxes as **hints, not truth** — the user may forget to check things off. For items relevant to the current context where verification is cheap (a `gh pr view` for a merge/approval, git state, file existence, a command's side effects), verify against reality.
3. Report:
   - Outstanding items (unchecked, relevant first).
   - **Discrepancies, flagged explicitly**: unchecked but verifiably done ("PR #8175 is merged but still unchecked — check it off?"), or checked but apparently not done ("marked done, but the PR is still open").
4. Only flip a checkbox (`[ ]`→`[x]`, append ` done=<ts>` inside the comment before `-->`) when the user confirms, or when they've asked you to keep the list tidy.

Never treat the checklist as authoritative over what tools/code actually show.

## `/action-tracker` subcommands

| Invocation | Behavior |
| --- | --- |
| `/action-tracker` | Show outstanding items with a verification pass (above) |
| `/action-tracker log <text>` | Force-log an item now |
| `/action-tracker serve` | Start the website: `node <this skill's dir>/site/server.mjs` as a background task; report the URL (default `http://127.0.0.1:4173`). If the port is busy, assume it's already running and just give the URL. |
| `/action-tracker mode auto\|manual` | Rewrite `config.json`; confirm |
