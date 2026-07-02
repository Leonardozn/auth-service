---
title: Branch, Implement, and PR Every Task Through develop
impact: CRITICAL
impactDescription: Committing straight to develop/main bypasses the PR review and branch protection `technical-leader`'s proc-repo-bootstrap already set up, and leaves DOCUMENTATION.md's Task List with no trace of which branch/PR did which task.
tags: process, git, github, gh, branch, pr, develop, task-list
---

# Branch, Implement, and PR Every Task Through develop

## Why it matters

`technical-leader` already pushed this project's `main` and `develop` to GitHub
(`proc-repo-bootstrap`) and wrote a `DOCUMENTATION.md` at this project's own root with an ordered
**Task List** (`doc-scoped-handoff`). Every task from that list gets its own branch and its own
PR back into `develop` — never a direct commit to `develop`, and never several unrelated tasks
bundled into one branch/PR. This is what keeps the Task List meaningful as a backlog (one task,
one traceable branch/PR) and what gives `develop`'s branch protection something to actually
gate.

## What to do, for every task you implement

1. **Sync `develop`.** `git checkout develop && git pull`.
2. **Branch from it.** Take the next not-yet-done task from this project's own `DOCUMENTATION.md`
   → Task List, and its number in that list. Compute the abbreviation from this project's own
   root folder name: split on `-`/`_`, take the first letter of each segment, lowercase (e.g.
   `auth-service` → `as`); for a single-segment name, use its first three letters lowercase
   instead (e.g. `catalog` → `cat`). Branch name is `feature/<abbreviation>-<number>`:
   `git checkout -b feature/as-3`.
3. **Implement the task** — the rest of this skill's rules (architecture, data access, testing)
   govern how; this rule only governs the git/GitHub steps around it.
4. **Commit and push.** A brief, conventional commit message; push the branch with upstream
   tracking: `git add -A && git commit -m "feat: register a user (auth-service task 3)" && git push -u origin feature/as-3`.
5. **Open the PR through `gh`, never the REST API.**
   `gh pr create --base develop --head feature/as-3 --title "..." --body "..."`, with a body
   structured for a human reviewer to skim — short summary first, then a bulleted list of what
   changed, grouped by area (e.g. "Service", "Routes", "Tests") rather than a flat diff narration.

## Incorrect Example

Working straight on `develop`, or bundling two unrelated tasks into one branch/PR:

```sh
git checkout develop
# ❌ no feature branch — edits committed straight to develop
git add -A && git commit -m "stuff"
git push
```

```sh
git checkout -b feature/as-3
# ...task 3 done...
# ❌ task 4 started on the same branch without finishing/PR-ing task 3 first
# ...task 4 done...
git push -u origin feature/as-3
gh pr create --base develop --head feature/as-3 --title "tasks 3 and 4"
```

## Correct Example

```sh
git checkout develop
git pull
git checkout -b feature/as-3
# ...implement task 3 from DOCUMENTATION.md's Task List...
git add -A
git commit -m "feat: register a user (auth-service task 3)"
git push -u origin feature/as-3
gh pr create --base develop --head feature/as-3 \
  --title "feat: register a user" \
  --body "$(cat <<'EOF'
## Summary
Implements task 3 from DOCUMENTATION.md: user registration.

## Changes
- **Service**: `services/auth.js` — `register()` method, hashes the password, creates the User.
- **Routes**: `POST /auth/register` wired to the new controller method.
- **Tests**: `tests/unit/services/auth.test.js` — covers success and duplicate-email cases.
EOF
)"
```

One task, one branch, one PR — `develop` stays clean for the next task to branch from.

## Key Rules

1. Always start from an up-to-date `develop` — `git checkout develop && git pull` before
   branching.
2. One branch per task, named `feature/<abbreviation>-<number>` — `<abbreviation>` from this
   project's own root folder name (initials per `-`/`_` segment, or first three letters if it's a
   single word), `<number>` from that task's position in `DOCUMENTATION.md`'s Task List.
3. Never commit directly to `develop` or `main`.
4. Commit with a brief, conventional message; push with `-u` so the branch tracks `origin`.
5. Open the PR with `gh pr create --base develop`, never the REST API or the web UI by hand; write
   the body as a skimmable, grouped bullet list of what changed, not a raw diff narration.
6. One task per branch/PR — never bundle a second, unrelated task into the same one.
