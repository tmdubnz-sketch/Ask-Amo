---
name: cli-master
description: Performs project administration and environment tasks. Use for branch management, dependency updates, or database migrations.
---

# CLI Mastery

## Instructions

1. **Branching**: When starting a task, create a new branch using `git checkout -b feature/[task-name]`.
2. **Cleanup**: Periodically run `npm prune` or `pip-autoremove` to keep the environment lean.
3. **Audit**: Run security audits (e.g., `npm audit`) before pushing code to production.

## Commands

```bash
# Branch management
git checkout -b feature/my-feature
git add . && git commit -m "feat: description"
git push origin feature/my-feature

# Dependency management
npm prune                    # Remove unused packages
npm audit                    # Security check
npm outdated                 # Check for updates

# Cleanup
npm run clean                # Remove build artifacts
rm -rf node_modules && npm install  # Fresh install
```
