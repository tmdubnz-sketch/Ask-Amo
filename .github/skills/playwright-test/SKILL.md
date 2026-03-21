---
name: playwright-test
description: Drives Amo's UI using Playwright for end-to-end testing. Takes screenshots, validates responses, and reports test results. Use this skill when testing Amo's features.
---

# Playwright Test Skill

Drives Amo's UI for automated E2E testing.

## Prerequisites

1. Install Playwright: `npm install --save-dev playwright`
2. Start Amo: `npm run dev`

## Procedure

### Step 1: Launch Browser

```javascript
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173');
```

### Step 2: Wait for App Ready

```javascript
await page.waitForSelector('textarea', { timeout: 10000 });
await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
```

### Step 3: Send Test Prompts

```javascript
// Fill textarea
const textarea = await page.$('textarea');
await textarea.fill('what can you do');

// Press Enter to send
await page.keyboard.press('Enter');

// Wait for response
await page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });
```

### Step 4: Capture Screenshot

```javascript
await page.screenshot({ path: 'test-results/response.png' });
```

### Step 5: Validate Response

```javascript
const response = await page.$eval('[data-role="assistant"]', el => el.textContent);

// Check response quality
if (response.length < 20) throw new Error('Response too short');
if (!response.includes('capability') && !response.includes('can')) {
  throw new Error('Response does not mention capabilities');
}
```

### Step 6: Cleanup

```javascript
await browser.close();
```

## Test Matrix

| Test | Input | Expected Output |
|------|-------|-----------------|
| Feature Discovery | "what can you do" | Lists 5+ features |
| Web Search | "latest AI news" | Returns search results |
| Code Generation | "write a python function" | Saves to Code Editor |
| Vocabulary | "extract words from: hello" | Extracts vocabulary |
| Learn | "learn this: fact" | Confirms storage |
| Error Handling | "" (empty) | Graceful response |

## Screenshot Locations

- `test-results/success/` - Passing test screenshots
- `test-results/failure/` - Failing test screenshots with error details
- `test-results/visual/` - Visual regression baselines

## Reporting

After each test run, generate a report:

```javascript
const report = {
  timestamp: new Date().toISOString(),
  tests: testResults,
  passed: testResults.filter(t => t.status === 'pass').length,
  failed: testResults.filter(t => t.status === 'fail').length,
  screenshots: screenshotPaths
};

fs.writeFileSync('test-results/report.json', JSON.stringify(report, null, 2));
```
