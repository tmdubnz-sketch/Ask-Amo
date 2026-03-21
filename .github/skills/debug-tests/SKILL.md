---
name: debug-tests
description: Detects failing tests, analyzes error logs, and proposes or implements automated fixes. Use this skill when tests fail and you need to diagnose and fix issues.
---

# Debug Tests Skill

Detects failures, analyzes logs, and proposes fixes.

## Prerequisites

1. Run tests first: `npm run test:amo:all`
2. Check `test-results/report.json` for failures

## Procedure

### Step 1: Load Failure Report

```javascript
const report = JSON.parse(fs.readFileSync('test-results/report.json'));
const failures = report.tests.filter(t => t.status === 'fail');
```

### Step 2: Analyze Each Failure

For each failing test:

```javascript
for (const failure of failures) {
  console.log(`\nAnalyzing: ${failure.test}`);
  
  // Check screenshot
  const screenshot = `test-results/failure/${failure.test}.png`;
  if (fs.existsSync(screenshot)) {
    console.log(`Screenshot: ${screenshot}`);
  }
  
  // Analyze error
  const error = failure.error;
  
  // Common patterns
  if (error.includes('timeout')) {
    console.log('→ Timeout: UI may be slow or element not found');
  } else if (error.includes('not found')) {
    console.log('→ Element missing: Check selector or wait time');
  } else if (error.includes('empty')) {
    console.log('→ Empty response: Model may not be loaded');
  } else if (error.includes('network')) {
    console.log('→ Network error: Check connectivity');
  }
}
```

### Step 3: Propose Fixes

Based on error type:

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `timeout` | Slow UI or missing element | Increase wait time or fix selector |
| `not found` | Wrong selector or timing | Update selector or add wait |
| `empty response` | Model not loaded | Load model or check status |
| `network error` | API issue | Check API key or connectivity |
| `crash` | Code error | Check console logs |

### Step 4: Implement Fix

```javascript
// Example: Fix timeout by increasing wait
const fix = {
  test: failure.test,
  action: 'increase_timeout',
  from: 30000,
  to: 60000
};

// Apply fix to test script
const testScript = fs.readFileSync('scripts/test-amo.mjs', 'utf8');
const updated = testScript.replace(
  `{ timeout: ${fix.from} }`,
  `{ timeout: ${fix.to} }`
);
fs.writeFileSync('scripts/test-amo.mjs', updated);
```

### Step 5: Re-run Test

```javascript
// Re-run fixed test
const result = await runTest(failure.test);
if (result.status === 'pass') {
  console.log(`✓ Fixed: ${failure.test}`);
} else {
  console.log(`✗ Still failing: ${failure.test}`);
  console.log(`Next steps: Manual investigation needed`);
}
```

## Common Fixes

### 1. Timeout Issues

```javascript
// Before
await page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });

// After - increase timeout
await page.waitForSelector('[data-role="assistant"]', { timeout: 60000 });
```

### 2. Selector Changes

```javascript
// Before
await page.$('[data-testid="chat-input"]');

// After - use more stable selector
await page.$('textarea');
```

### 3. Model Not Loaded

```javascript
// Check if model is loaded before testing
const status = await page.evaluate(() => {
  return window.nativeOfflineLlmService?.getStatus();
});

if (!status?.modelLoaded) {
  throw new Error('Model not loaded - load model first');
}
```

### 4. API Key Missing

```javascript
// Check API key before cloud model test
const hasKey = await page.evaluate(() => {
  return !!localStorage.getItem('groq_api_key');
});

if (!hasKey) {
  throw new Error('API key not set - configure in Settings');
}
```

## Reporting

Generate fix report:

```javascript
const fixReport = {
  timestamp: new Date().toISOString(),
  failures: failures.length,
  fixed: fixedTests,
  remaining: failures.length - fixedTests,
  suggestions: manualInvestigationNeeded
};

fs.writeFileSync('test-results/fix-report.json', JSON.stringify(fixReport, null, 2));
```
