---
name: refactor-helper
description: Cleans up functions for readability and performance. Use when code is complex, deeply nested, or lacks type safety.
---

# Refactor Helper

## Instructions

1. Analyze the target function for:
   - Nested "if" statements (convert to guard clauses).
   - Repeated logic (extract to private helper functions).
   - Type safety (ensure TypeScript interfaces or Python type hints are used).
2. Rewrite the code while maintaining the exact original functionality.
3. Run `npm test` or `pytest` to ensure zero regressions after the change.

## Standards

- **Guard clauses**: Early returns for edge cases
- **Single responsibility**: Each function does one thing
- **Type safety**: Explicit return types, no `any`
- **Naming**: Descriptive variable/function names
- **Comments**: Only for complex logic, not obvious code
