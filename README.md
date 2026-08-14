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

## License

MIT
