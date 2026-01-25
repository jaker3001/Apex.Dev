# Git Workflow Reference

A practical guide to Git for the Apex Assistant project.

## Quick Reference

### Daily Workflow

```bash
# 1. Start new work (create a branch)
git checkout -b feature/short-name

# 2. Work on your changes...

# 3. Save your progress
git add .                             # Stage all changes
git commit -m "feat: Add new thing"   # Commit with message

# 4. Push to GitHub (backup!)
git push -u origin feature/short-name # First push (sets up tracking)
git push                              # Later pushes

# 5. When done, merge to master
git checkout master                   # Switch to master
git pull                              # Get latest from GitHub
git merge feature/short-name          # Merge your work
git push                              # Push to GitHub

# 6. Cleanup (important!)
git branch -d feature/short-name                # Delete local branch
git push origin --delete feature/short-name     # Delete remote branch
```

### Common Commands

| Command | What it does |
|---------|--------------|
| `git status` | See what's changed |
| `git add .` | Stage all changes for commit |
| `git add <file>` | Stage specific file |
| `git commit -m "message"` | Save staged changes |
| `git push` | Upload commits to GitHub |
| `git pull` | Download commits from GitHub |
| `git checkout <branch>` | Switch to a branch |
| `git checkout -b <name>` | Create and switch to new branch |
| `git branch` | List local branches |
| `git branch -a` | List all branches (local + remote) |
| `git log --oneline -10` | Show last 10 commits |
| `git diff` | Show unstaged changes |
| `git diff --staged` | Show staged changes |

---

## Commit Message Format

This project uses **Conventional Commits**. The git hooks will enforce this format.

### Format
```
type(scope): description

[optional body]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no code change) |
| `refactor` | Code change that doesn't fix bug or add feature |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies, config |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | Build system changes |
| `revert` | Revert a previous commit |

### Examples

```bash
# Feature
git commit -m "feat: Add user authentication"
git commit -m "feat(chat): Add message search functionality"

# Bug fix
git commit -m "fix: Resolve login redirect loop"
git commit -m "fix(api): Handle null response from server"

# Documentation
git commit -m "docs: Update API endpoint documentation"

# Refactoring
git commit -m "refactor(database): Simplify query builder"

# Chore
git commit -m "chore: Update dependencies"
```

---

## Branch Naming

### Format
```
type/short-description
```

### Examples

| Branch name | Purpose |
|-------------|---------|
| `feature/user-auth` | Adding user authentication |
| `feature/chat-history` | Adding chat history feature |
| `fix/login-bug` | Fixing a login bug |
| `fix/api-timeout` | Fixing API timeout issue |
| `docs/api-reference` | Updating documentation |
| `refactor/database-layer` | Refactoring database code |

### Rules
- Use lowercase
- Use hyphens, not spaces or underscores
- Keep it short but descriptive
- Delete after merging!

---

## Git Concepts Explained

### Commits = Save Points
A commit is a snapshot of your code at a moment in time. Each commit has:
- A unique ID (like `a2cba37`)
- A message describing what changed
- A link to the previous commit

**Think of it like:** Save points in a video game. You can always go back.

### Branches = Parallel Timelines
A branch lets you work on something without affecting the main code.

```
                    feature/new-thing
                         ↓
                    [your work] → [more work]
                   /
[master v1] → [master v2] → [master v3]
```

**Think of it like:** A copy of your document where you can make risky changes.

### Merging = Combining Work
When your feature is done, you merge it back into master.

**Think of it like:** Taking your draft and making it the official version.

### Remote = GitHub (Your Backup)
Your "remote" is the copy of your code on GitHub.

- `git push` = Upload your commits to GitHub
- `git pull` = Download commits from GitHub

**Think of it like:** Saving to the cloud.

---

## Installed Git Hooks

This project has three git hooks that run automatically:

### pre-commit
Runs before each commit. Checks for:
- ❌ Secrets (API keys, passwords)
- ❌ .env files
- ⚠️ Large files (>1MB, warning only)

### commit-msg
Runs after you write your commit message. Checks for:
- ❌ Invalid format (must be `type: description` or `type(scope): description`)
- ⚠️ Long messages (>72 chars, warning only)

### pre-push
Runs before pushing to GitHub. Checks for:
- ⚠️ Direct pushes to master (reminder, not blocked)
- ⚠️ WIP commits that should be squashed

### Bypassing Hooks (When Necessary)
```bash
git commit --no-verify    # Skip pre-commit and commit-msg
git push --no-verify      # Skip pre-push
```

---

## Common Scenarios

### "I want to undo my last commit"
```bash
# Keep the changes, just undo the commit
git reset --soft HEAD~1

# Discard the changes completely
git reset --hard HEAD~1
```

### "I committed to the wrong branch"
```bash
# Undo the commit (keep changes)
git reset --soft HEAD~1

# Switch to correct branch
git checkout correct-branch

# Commit there instead
git add .
git commit -m "your message"
```

### "I need to see what changed"
```bash
# What files changed?
git status

# What lines changed (not yet staged)?
git diff

# What lines changed (staged)?
git diff --staged

# What changed in last commit?
git show
```

### "I want to discard my changes"
```bash
# Discard changes to one file
git checkout -- filename

# Discard ALL uncommitted changes (careful!)
git checkout -- .
```

### "I need to temporarily save my work"
```bash
# Stash your changes
git stash

# Do other work...

# Get your changes back
git stash pop
```

### "I want to see the history"
```bash
# Simple list
git log --oneline

# With graph
git log --oneline --graph

# Last 5 commits with details
git log -5
```

---

## Troubleshooting

### "Permission denied" when deleting folders
Windows locks files that are in use. Try:
1. Close VS Code windows for those folders
2. Restart your computer
3. Use PowerShell: `Remove-Item -Path "folder" -Recurse -Force`

### "Refusing to merge unrelated histories"
```bash
git pull origin master --allow-unrelated-histories
```

### "Your branch is ahead of origin/master by X commits"
Your local commits haven't been pushed:
```bash
git push
```

### "Your branch is behind origin/master"
GitHub has commits you don't have locally:
```bash
git pull
```

### "Merge conflict"
Two people changed the same lines. You need to:
1. Open the conflicted files
2. Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Decide which version to keep
4. Remove the markers
5. `git add .` and `git commit`

---

## Best Practices

1. **Commit often** - Small, frequent saves are better than big, rare ones
2. **Push daily** - Always backup to GitHub before ending your day
3. **Pull before starting** - Get the latest code before new work
4. **One branch per feature** - Keep work isolated
5. **Delete merged branches** - Clean up after yourself
6. **Write good commit messages** - Future you will thank present you
7. **Don't commit secrets** - The hooks will help catch this

---

## Getting Help

```bash
# Get help on any command
git help <command>
git commit --help

# See what a command does
git <command> --dry-run
```
