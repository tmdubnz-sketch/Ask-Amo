---
name: tdd-enforcer
description: Drives development using a strict Red-Green-Refactor loop. Use when implementing new features or fixing critical bugs.
---

# TDD Enforcer

## Instructions

1. **Red Phase**: Write a failing test that defines the expected behavior of the new feature.
2. **Green Phase**: Write the minimum amount of code required to make that specific test pass.
3. **Refactor Phase**: Clean up the implementation without changing behavior.
4. **Verification**: Run the full test suite to ensure no existing features were broken.

## Workflow

```
1. npm test -- --watch  (start test watcher)
2. Write failing test
3. Run test → see it fail (red)
4. Write minimal code to pass
5. Run test → see it pass (green)
6. Refactor code
7. Run test → still passes (green)
8. Run full suite → all pass
```
