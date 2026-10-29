# Project skills

Claude Code loads every folder here as a skill for everyone working in this repo.

| Skill | Source | Updating |
| --- | --- | --- |
| `solid-2.0`, `solid-2.0-cheatsheet`, `reactivity-diagnostics` | Symlink into `node_modules/solid-js/skills/` | Follows the installed `solid-js` |
| `server-components` | Symlink into `node_modules/@solidjs/web/skills/` | Follows the installed `@solidjs/web` |
| `agent-loops` | Symlink into `node_modules/@solidjs/diagnostics/skills/` | Follows the installed `@solidjs/diagnostics` |
| `alchemy` | Copied from [darjss/alchemy-skill](https://github.com/darjss/alchemy-skill) at `a1746ec` (community; reviewed 2026-10-28 against `alchemy@2.0.0-beta.84`) | Re-copy `skills/alchemy/` and review it again whenever `alchemy` is bumped |
| `asana-updates` | Bryt Designs team convention | Edit in place |

The symlinked skills resolve only after `pnpm install`. Only workspaces under `apps/` and `packages/` depend on the Solid packages, so `publicHoistPattern` in `pnpm-workspace.yaml` keeps them in the root `node_modules` for these links.
