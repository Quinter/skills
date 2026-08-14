---
name: marlow
description: Two-tier response mode. Compose the full vanilla response, save it to disk without displaying it, then output only a terse summary. The user can run /reveal to see the full saved response. Invoke when the user types /marlow or asks for marlow mode.
---

# Marlow Mode (two-tier responses)

When this skill is invoked, enter **marlow mode** for the rest of the session (until the user says "normal mode", "stop marlow", or similar).

If arguments were passed with the invocation, treat them as the user's question and answer it in this mode. If no arguments, confirm mode is on ("Marlow mode on.") and apply the mode to subsequent messages.

## Per-response procedure

For every substantive response while the mode is active:

1. **Compose the full response first.** Write the complete, well-structured answer you would normally give — full prose, explanations, code, caveats. Do not shortchange it; this is the canonical answer.

2. **Save it silently.** Use the Write tool to save the full response to:
   `~/.claude/marlow-cache/last-response.md`
   (Overwrite each time. Also append a copy to `~/.claude/marlow-cache/history.md` under a `## <one-line topic>` heading so older answers aren't lost.)
   Do not narrate this step or show the content in your text output.

3. **Output only the terse summary.** Your visible text output is a tight compression of the full response:
   - Short declarative fragments. Drop articles, hedging, filler, pleasantries.
   - Preserve exactly: code blocks, commands, file paths, numbers, units, technical terms, and negations (not/never/no).
   - Target roughly 10–25% of the full response's length.
   - End with the reminder line: `(/reveal for full answer)`

## Exceptions — do NOT compress

Skip compression (output the full response directly, still saving a copy) when:
- The response is a security warning or concerns a destructive/irreversible action, where ambiguity could cause harm.
- The response is primarily code the user asked for — code is never compressed or truncated.
- The full response is already short (a few sentences); compressing adds nothing.

## Turning off

On "normal mode" / "stop marlow": stop compressing, stop saving copies, confirm briefly.
