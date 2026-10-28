# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations. Every issue also gets a matching Asana task (see **Asana mirror** below).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies. Then create its Asana task (see **Asana mirror**).
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`, then complete its Asana task (see **Asana mirror**).

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, then its Asana task (see **Asana mirror**).

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Asana mirror

Every GitHub issue gets a matching Asana task: parent issues, sub-issues and wayfinder maps alike.
**GitHub holds the full detail; the Asana task only points to it.** Write the task following the `asana-updates` skill.

Create the GitHub issue first, then the Asana task, then link the two.

**This needs the Asana MCP.** If no Asana tools are available, stop before creating the GitHub issue and ask the user to connect Asana (see **Required tooling** in `CLAUDE.md`). An issue without its Asana task breaks the pairing.

- **Where**: workspace Bryt Designs (`1199639766808764`), project Bryt Designs (`1199639767884548`).
- **Name**: the GitHub issue title.
- **Notes** (plain `notes`, never `html_notes`): one or two plain-language sentences on what the
  task is, written for someone who doesn't know the codebase. Then the issue URL on its own line.
  About 80 words at most, no file paths, no jargon, one link.
- **Assignee**: ask the user every time. When a skill creates several issues at once, ask once
  with the whole list and let them assign each task.
- **Followers**: always Devin Jackson (`1201987617953735`) and Bryan Miller (`1196876304911542`).
- **Difficulty** (number custom field `1215561951155384`): estimate it from the issue's scope and
  show the estimate when asking for the assignee, so the user can correct it.
  - `0`: quick, usually no code
  - `1`: very basic feature, about 1–2 hours
  - `2`: more complex, needs some thought, about 4–8 hours (a whole day)
  - `3`: extremely complicated, 2 days to a week or more; usually needs design thought and review
- **No tags.** Leave Priority unset.
- **Link back**: once the task exists, run `gh issue comment <n> --body "Asana: <task permalink_url>"`
  so you can get from either side to the other.
- **Closing**: whenever a GitHub issue is closed (resolved, wontfix or duplicate), mark its Asana
  task complete with a one-line closing comment, following `asana-updates`.

Call shape: `asana_create_task` with `project_id: "1199639767884548"`, `name`, `notes`, `assignee`,
`followers: "1201987617953735,1196876304911542"`, `custom_fields: {"1215561951155384": <0–3>}`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
