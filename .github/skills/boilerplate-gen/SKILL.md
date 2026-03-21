---
name: boilerplate-gen
description: Generates standardized project files. Use when creating new components, API endpoints, or Redux slices.
---

# Boilerplate Generator

## Instructions

1. Identify the type of file requested (e.g., React Component, FastAPI Route).
2. Use the following standards:
   - **Styling**: Use Tailwind CSS utility classes.
   - **Error Handling**: Wrap main logic in a standard Error Boundary or Try/Except block.
   - **Imports**: Group absolute imports above relative imports.
3. Stub out necessary unit tests in a sibling `.test.js` or `test_*.py` file.

## Templates

- React component: PascalCase, functional, hooks-based
- Service: camelCase, async/await, error handling
- Hook: `use` prefix, returns state and actions
- Type: Interface with explicit properties
- Test: Describe block with nested it blocks
