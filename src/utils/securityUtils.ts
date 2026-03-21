// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECURITY UTILITIES
// Command validation, path sanitization, input validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── COMMAND SANDBOX ───────────────────────────────────────────────────────────

// Blocked commands/patterns that could be dangerous
const BLOCKED_COMMANDS = [
  /rm\s+-rf\s+\/[^a-zA-Z]/,          // rm -rf /something (root deletion)
  /rm\s+-rf\s+\*/,                    // rm -rf *
  /rm\s+-rf\s+\$HOME/,               // rm -rf $HOME
  /dd\s+if=/,                         // dd (disk operations)
  /mkfs/,                             // Format filesystem
  /fdisk/,                            // Disk partitioning
  /chmod\s+777/,                      // Dangerous permissions
  /curl.*\|.*sh/,                     // curl | sh (remote code execution)
  /wget.*\|.*sh/,                     // wget | sh
  /nc\s+-l/,                          // netcat listener
  /ncat\s+-l/,                        // ncat listener
  /bash\s+-i/,                        // Interactive bash (reverse shell)
  /sh\s+-i/,                          // Interactive shell
  /python.*-c.*import.*socket/,       // Python reverse shell
  /perl.*-e.*socket/,                 // Perl reverse shell
  /ruby.*-e.*socket/,                 // Ruby reverse shell
  /eval\s*\(/,                        // eval()
  /exec\s*\(/,                        // exec()
  /system\s*\(/,                      // system()
  /\$\(/,                             // Command substitution $(...)
  /`/,                                // Backtick command substitution
  /;\s*rm/,                           // Chained rm
  /&&\s*rm/,                          // Chained rm
  /\|\s*rm/,                          // Piped rm
];

// Allowed safe commands (whitelist approach for critical operations)
const SAFE_COMMAND_PREFIXES = [
  'ls',
  'cat',
  'pwd',
  'echo',
  'mkdir',
  'touch',
  'cp',
  'mv',
  'head',
  'tail',
  'wc',
  'grep',
  'find',
  'date',
  'whoami',
  'uname',
  'df',
  'free',
  'ps',
  'ping',
  'npm',
  'node',
  'python',
  'pip',
  'git',
  'curl',
  'wget',
  'apt',
  'apt-get',
  'yarn',
  'pnpm',
  'java',
  'javac',
  'gcc',
  'g++',
  'make',
  'cargo',
  'rustc',
  'go',
];

export function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim();
  
  // Empty command
  if (!trimmed) {
    return { safe: false, reason: 'Empty command' };
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_COMMANDS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: `Blocked pattern: ${pattern.source}` };
    }
  }

  // Check for truly dangerous patterns (allow safe pipes, redirects, etc.)
  const blockedPatterns = [
    /\$\(/,           // Command substitution $(...)
    /`/,              // Backtick command substitution
    /;\s*rm/,         // Chained rm
    /&&\s*rm/,        // Chained rm
    /\|\s*rm/,        // Piped rm
    /;\s*curl/,       // Chained curl
    /\|\s*sh/,        // Pipe to shell
    /\|\s*bash/,      // Pipe to bash
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: `Blocked dangerous pattern: ${pattern.source}` };
    }
  }

  return { safe: true };
}

// ── PATH SANITIZATION ─────────────────────────────────────────────────────────

const WORKSPACE_ROOTS = [
  '/storage/emulated/0/Documents/AskAmo',
  './amo-workspace',
];

export function sanitizeFilePath(path: string): { valid: boolean; sanitized: string; reason?: string } {
  // Remove path traversal
  let sanitized = path
    .replace(/\.\./g, '.')           // Prevent path traversal
    .replace(/\/+/g, '/')            // Normalize double slashes
    .replace(/^\//, '');             // Remove leading slash (relative paths only)

  // Block absolute paths
  if (path.startsWith('/') && !WORKSPACE_ROOTS.some(root => path.startsWith(root))) {
    return { valid: false, sanitized: path, reason: 'Absolute path outside workspace' };
  }

  // Block hidden files (except .gitignore)
  if (sanitized.startsWith('.') && sanitized !== '.gitignore') {
    return { valid: false, sanitized: path, reason: 'Hidden file access blocked' };
  }

  // Block system files
  const systemFiles = ['/etc/', '/proc/', '/sys/', '/dev/', '/data/data/'];
  if (systemFiles.some(sys => path.includes(sys))) {
    return { valid: false, sanitized: path, reason: 'System file access blocked' };
  }

  return { valid: true, sanitized };
}

// ── INPUT VALIDATION ──────────────────────────────────────────────────────────

export function validateToolCall(call: any): { valid: boolean; reason?: string } {
  if (!call || typeof call !== 'object') {
    return { valid: false, reason: 'Tool call is not an object' };
  }

  if (typeof call.tool !== 'string') {
    return { valid: false, reason: 'Tool name is not a string' };
  }

  const validTools = ['run', 'write', 'read', 'list', 'preview', 'install', 'search', 'open_url', 'sentence_builder', 'vocabulary_builder', 'intent_enhancer'];
  if (!validTools.includes(call.tool)) {
    return { valid: false, reason: `Unknown tool: ${call.tool}` };
  }

  // Validate specific tool parameters
  switch (call.tool) {
    case 'run':
      if (typeof call.command !== 'string' || call.command.length > 500) {
        return { valid: false, reason: 'Invalid or too long command' };
      }
      const safeCheck = isCommandSafe(call.command);
      return { valid: safeCheck.safe, reason: safeCheck.reason };
    
    case 'write':
      if (typeof call.path !== 'string' || typeof call.content !== 'string') {
        return { valid: false, reason: 'Invalid write parameters' };
      }
      if (call.content.length > 1000000) {
        return { valid: false, reason: 'Content too large (max 1MB)' };
      }
      return sanitizeFilePath(call.path);
    
    case 'read':
    case 'preview':
      if (typeof call.path !== 'string') {
        return { valid: false, reason: 'Invalid path' };
      }
      return sanitizeFilePath(call.path);
    
    case 'list':
      if (call.path && typeof call.path !== 'string') {
        return { valid: false, reason: 'Invalid path' };
      }
      if (call.path) {
        return sanitizeFilePath(call.path);
      }
      return { valid: true };
    
    case 'install':
      if (typeof call.manager !== 'string' || !['npm', 'pip', 'apt', 'yarn', 'pnpm'].includes(call.manager)) {
        return { valid: false, reason: 'Invalid package manager' };
      }
      if (!Array.isArray(call.packages) || call.packages.length === 0 || call.packages.length > 20) {
        return { valid: false, reason: 'Invalid packages array' };
      }
      for (const pkg of call.packages) {
        if (typeof pkg !== 'string' || pkg.length > 100 || /[^a-zA-Z0-9@._\-\/]/.test(pkg)) {
          return { valid: false, reason: `Invalid package name: ${pkg}` };
        }
      }
      return { valid: true };
    
    default:
      return { valid: true };
  }
}

// ── API REQUEST HELPER ────────────────────────────────────────────────────────

export function createApiFetch(url: string, options: RequestInit = {}, timeoutMs = 30000): { fetch: Promise<Response>; cancel: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    fetch: fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout)),
    cancel: () => controller.abort(),
  };
}

// ── RETRY WITH BACKOFF ────────────────────────────────────────────────────────

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = Math.random() * delay * 0.3;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

// ── RATE LIMITER ──────────────────────────────────────────────────────────────

export function createRateLimiter(maxCalls: number, windowMs: number) {
  let calls: number[] = [];

  return {
    canCall(): boolean {
      const now = Date.now();
      calls = calls.filter(t => now - t < windowMs);
      return calls.length < maxCalls;
    },
    
    recordCall(): void {
      calls.push(Date.now());
    },
    
    async throttle<T>(fn: () => Promise<T>): Promise<T> {
      while (!this.canCall()) {
        const waitTime = windowMs - (Date.now() - calls[0]);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.recordCall();
      return fn();
    },
  };
}
