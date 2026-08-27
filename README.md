# marlow

Two-tier responses for Claude Code: full answers saved to disk, terse summaries on screen, `/reveal` when you want the detail.

## Why

Verbose LLM output buries the answer. Brevity modes like caveman or laconic fix the noise but throw the detail away — the terse version is the only version that ever exists. Marlow keeps both: the complete answer is composed first and written to disk, and only a tight summary hits your terminal. If the summary is enough, you saved the reading. If it isn't, the full response is one command away.

## Demo

```
> /marlow why is my React list re-rendering on every keystroke?

Input state lives in parent. Every keystroke re-renders parent, list
re-renders with it. Fix: move input state into own component, or wrap
list in React.memo with stable item props. Inline arrow props defeat
memo — hoist or useCallback.

(/reveal for full answer)

> /reveal

[Full multi-paragraph explanation restored: reconciliation walkthrough,
why referential equality breaks memoization, code examples for each fix,
when *not* to memoize...]
```

## Install

```bash
npx skills add Quinter/skills@marlow
npx skills add Quinter/skills@reveal
```

Or grab both at once:

```bash
npx skills add Quinter/skills
```

The two skills are a pair — `reveal` is how you open what `marlow` saves. Install both.

## Usage

| Command | Effect |
| --- | --- |
| `/marlow` | Turn on marlow mode for the session (optionally with a question: `/marlow <question>`) |
| `/reveal` | Print the full version of the last answer, verbatim |
| `/reveal <topic>` | Dig an older answer out of the session history |
| `normal mode` | Turn marlow mode off |

Saved responses live in `~/.claude/marlow-cache/` — `last-response.md` for the most recent answer, `history.md` for everything before it. Revealing does not exit the mode; summaries continue until you say `normal mode`.

## How it works

While the mode is active, the agent composes its complete answer first, silently writes it to the cache, then outputs a compression at roughly 10–25% of the original length. Code blocks, commands, file paths, numbers, and negations are preserved exactly — the summary drops filler, not facts.

Some responses are never compressed: security warnings, anything concerning destructive or irreversible actions, and answers that are primarily code. You always get those in full.

# action-tracker

A persistent, cross-session checklist of the things only *you* can do — sessions log them, a tiny local website lets you check them off.

## Why

Agent sessions constantly need something from you: approve a PR, run `gcloud auth login`, make a release call. Those asks scroll away and get forgotten. Action-tracker gives every session one shared markdown file (`~/.claude/action-tracker/actions.md`) to log required user-actions into, sorted by session and Jira ticket. Sessions also read it back to know what you've done — but verify against reality (gh, git, code) and flag mismatches instead of trusting checkboxes blindly.

## Install

```bash
npx skills add Quinter/skills@action-tracker
```

On first use the skill asks which mode you want and saves it to `~/.claude/action-tracker/config.json`:

- **auto** — every session logs required user-actions automatically as it hits them
- **manual** — sessions only touch the tracker when you invoke `/action-tracker`

Switch any time with `/action-tracker mode auto|manual`.

## Usage

| Command | Effect |
| --- | --- |
| `/action-tracker` | Show outstanding actions, with a verification pass against reality |
| `/action-tracker log <text>` | Log an item now |
| `/action-tracker serve` | Start the checklist website at `http://127.0.0.1:4173` |
| `/action-tracker mode auto\|manual` | Switch logging mode |

The website can also be started directly:

```bash
node ~/.claude/skills/action-tracker/site/server.mjs   # --port to change, default 4173
```

## The website

Zero-dependency (Node ≥ 18, no install). It reads and rewrites `actions.md` in place:

- group by **session** or by **Jira ticket**, hide done items
- checkbox click marks an item done (timestamped)
- each item carries the conversation context from the moment it was logged, collapsed behind a **Show context** button
- items without a ticket get a **Copy Jira prompt** button — it copies a ready-made request to your clipboard; paste it into any Claude session with the Atlassian MCP and it creates the ticket. Paste the resulting key back into the item's **Link ticket** field to attach it.

## Data

Everything lives in `~/.claude/action-tracker/actions.md` — plain markdown checkboxes with metadata in HTML comments, plus indented `> ` context lines under each item, safe to edit by hand. The file is the single source of truth; the site and sessions both read it fresh on every access.

## License

MIT
