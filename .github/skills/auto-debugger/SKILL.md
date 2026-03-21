---
name: auto-debugger
description: Investigates and repairs failing tests or build errors. Use when a command fails or a bug report is provided.
---

# Auto-Debugger

## Instructions

1. Capture the full error log from the terminal or test runner.
2. Trace the error to the specific file and line number.
3. Hypothesize the root cause (e.g., race condition, null pointer, dependency mismatch).
4. Apply a fix and immediately re-run the failing command to verify the resolution.

## Common Patterns

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Cannot find module` | Missing import | Install dependency |
| `Type not assignable` | Type mismatch | Fix type annotation |
| `undefined is not an object` | Null access | Add null check |
| `timeout` | Async issue | Increase timeout or fix race condition |
| `EACCES` | Permission error | Fix file permissions |
