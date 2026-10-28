---
name: asana-updates
description: "Use whenever writing to Asana — posting a comment, replying to a teammate, closing a task, or editing a task description. Asana updates must be extremely concise and readable; the full record of what changed belongs in the GitHub PR, never in the comment."
---

# Writing to Asana

## The one rule

**Asana is the pointer. GitHub is the record.**

An Asana comment says *what happened* and *where to read about it*. It never
reproduces the reasoning, the measurements, the file paths, or the design
rationale — all of that goes in the pull request description, where it belongs
and where it can still be edited later.

If you catch yourself explaining *why* in an Asana comment, stop. That paragraph
is a PR description trying to escape.

## Who you are writing for

Someone who has **no context**. They have not read the code, may not know the
codebase's internal vocabulary, and are reading this on a phone between
meetings. They might be a designer, a PM, or the person who owns the
neighbouring task.

So: plain words, no unexplained jargon, no bare identifiers standing in for an
explanation. "The payload now carries the totals" means nothing to them. "The
message can now say how many items changed" does.

Concise and plain are the same instruction here, not competing ones.

## The budget

- **Aim for 5 lines or fewer. Roughly 80 words.**
- **Hard ceiling: about 120 words.** Past that, cut — do not reformat.
- One link. Usually the PR.

If the update genuinely cannot fit, that is a signal the *Asana* part is one
sentence and everything else is PR content.

## The shape

```
<One line: what changed, in plain words.>

<Link to the PR.>

<Optional: one line, only if the reader must DO or DECIDE something.>
```

That third line is the only content that must live in Asana rather than the PR,
because the reader will not necessarily open the PR. Use it for:

- something of theirs you touched
- a decision you need from them
- a thing that is now unblocked for them

Everything else — mechanism, trade-offs, edge cases, test counts, measurements,
gate results — goes in the PR.

## Worked example

This is real. The **before** is what was actually posted on 2026-09-09 and had
to be rewritten; the **after** is the target.

### ❌ Before — 380 words

Opened with the finding, then quoted the misleading docstring, then a
four-bullet list of what the PR adds, then a warning paragraph about touching a
teammate's files, then two bullets on transport edge cases (the decode floor,
the emptiness rule), then a note on the remaining follow-up, then a line of
gate results (lint, types, two test counts).

Every one of those facts was true and useful. **All but two belonged in the PR.**

### ✅ After — 60 words

> Good catch — it wasn't the goal. The `MAX_ITEMS` comment already claimed the
> count was preserved; the code never did, so your workaround was reading it
> right.
>
> Fixed in #411: https://github.com/BrytDesigns/gertex/pull/411 —
> `clampedTotal`/`droppedTotal` on the payload, both headings now count, plus an
> "and N more" bullet for what the cap left unlisted.
>
> ⚠️ It touches your component and your strings. The copy is yours, change any
> of it. Rationale and edge cases are in the PR.

Note what survived: the answer to his question, the link, and the one thing he
must act on. Note what left: every "why", the tests, the gates, the follow-up.

## ⚠️ You cannot edit or delete a comment

The Asana MCP surface exposes **only** `asana_create_task_story` — creating a
comment. There is no update and no delete tool, even though Asana's REST API has
`PUT /stories/{gid}`.

**A comment you post is permanent from your side.** Fixing a bloated one costs
the user a manual edit in the Asana UI. This is the practical reason the budget
above is a rule and not a preference: there is no second draft.

So draft the comment, count it, cut it, *then* post.

## Closing a task

Same budget. A closing comment records the outcome, not the history:

> Closing — shipped in #402 and #404, verified live. The remaining cross-brand
> cookie question moved to <other task>.

If a residual moves to another task, name it in one clause — that is the part
nobody can recover from a PR.

## Before posting, check

1. Is it under ~120 words?
2. Have I explained a "why" that the PR should own?
3. Would someone with no context understand every sentence?
4. Is there exactly one link, and does it go to the fuller record?
5. Does the reader need to do or decide anything — and is that said plainly?

## Related project conventions

- Add Bryan Miller (`1196876304911542`) as a follower on any task created.
- No `<p>` in `html_notes` — Asana rejects it. Plain `text` is usually right for
  a comment anyway.
- Dependencies can be added but never removed through the API.
