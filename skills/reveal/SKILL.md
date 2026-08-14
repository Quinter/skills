---
name: reveal
description: Reveal the full verbose response that marlow mode saved to disk. Invoke when the user types /reveal or asks to see the full/verbose version of the last marlow answer.
---

# Reveal

Companion to the `marlow` skill.

1. Read `~/.claude/marlow-cache/last-response.md`.
2. Output its contents verbatim as your response — no re-summarizing, no commentary before it. A one-line footer like `(full response restored from marlow cache)` is fine.
3. If the file doesn't exist or is empty, say so plainly: no marlow response has been saved yet on this machine.
4. If arguments were passed (e.g. a topic), search `~/.claude/marlow-cache/history.md` for the matching `## <topic>` section and output that section instead of last-response.md.

Revealing does not turn marlow mode off — subsequent answers stay compressed until the user says "normal mode".
