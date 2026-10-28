#!/usr/bin/env bash
# SessionStart hook: warn when tooling this repo's agent workflow depends on is missing.
# Prints nothing when everything is in place.

missing=()

if ! command -v gh >/dev/null 2>&1; then
  missing+=("GitHub CLI (gh) is not installed. Install it from https://cli.github.com, then run gh auth login.")
elif ! gh auth status >/dev/null 2>&1; then
  missing+=("GitHub CLI is not logged in. Run gh auth login.")
fi

if [ ! -e "${CLAUDE_PROJECT_DIR:-.}/node_modules/solid-js/skills" ]; then
  missing+=("Dependencies are not installed. Run pnpm install so the Solid skills in .claude/skills resolve.")
fi

if ! grep -qs '^SESSION_SECRET=.' "${CLAUDE_PROJECT_DIR:-.}/.env"; then
  missing+=("No SESSION_SECRET in .env, so the server will not start. Copy .env.example to .env and set it (openssl rand -base64 32).")
fi

[ ${#missing[@]} -eq 0 ] && exit 0

msg="Setup needed for this repo:"
for item in "${missing[@]}"; do
  msg="$msg $item"
done

printf '{"systemMessage": "%s", "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s Tell the user before starting work that depends on it."}}\n' "$msg" "$msg"
