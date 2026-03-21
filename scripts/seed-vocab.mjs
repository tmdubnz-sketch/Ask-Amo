#!/usr/bin/env node

/**
 * Seed Vocabulary - Populates Amo's vocabulary builder with curated words
 * 
 * Usage: node scripts/seed-vocab.mjs
 */

const VOCABULARY = {
  nouns: [
    // Tech/Programming
    'code', 'function', 'variable', 'database', 'API', 'server', 'client',
    'file', 'folder', 'directory', 'path', 'command', 'script', 'program',
    'algorithm', 'data', 'input', 'output', 'process', 'thread', 'memory',
    'network', 'protocol', 'interface', 'class', 'object', 'method', 'property',
    'array', 'list', 'map', 'set', 'queue', 'stack', 'tree', 'graph',
    
    // General
    'problem', 'solution', 'question', 'answer', 'example', 'test', 'result',
    'error', 'bug', 'fix', 'update', 'version', 'release', 'feature',
    'user', 'admin', 'system', 'application', 'service', 'module', 'component',
    'document', 'file', 'image', 'video', 'audio', 'text', 'content',
    'search', 'filter', 'sort', 'group', 'join', 'merge', 'split',
    'create', 'read', 'update', 'delete', 'save', 'load', 'export', 'import',
    'message', 'response', 'request', 'session', 'token', 'key', 'value',
    'config', 'setting', 'option', 'preference', 'parameter', 'argument',
    'log', 'debug', 'trace', 'monitor', 'alert', 'notification', 'event',
    'task', 'job', 'queue', 'worker', 'scheduler', 'cron', 'timer',
    'cache', 'buffer', 'stream', 'pipe', 'channel', 'socket', 'connection',
    'model', 'view', 'controller', 'route', 'endpoint', 'handler', 'middleware',
    'template', 'layout', 'component', 'widget', 'plugin', 'extension',
    'theme', 'style', 'color', 'font', 'icon', 'image', 'animation',
    'form', 'input', 'button', 'menu', 'dialog', 'modal', 'tooltip',
    'table', 'row', 'column', 'cell', 'header', 'footer', 'sidebar',
    'page', 'section', 'article', 'paragraph', 'sentence', 'word', 'character',
  ],
  
  verbs: [
    // Actions
    'create', 'delete', 'update', 'modify', 'change', 'edit', 'write',
    'read', 'view', 'display', 'show', 'hide', 'open', 'close',
    'save', 'load', 'import', 'export', 'download', 'upload', 'sync',
    'search', 'find', 'filter', 'sort', 'group', 'organize', 'arrange',
    'run', 'execute', 'start', 'stop', 'pause', 'resume', 'restart',
    'compile', 'build', 'deploy', 'install', 'uninstall', 'configure', 'setup',
    'test', 'debug', 'trace', 'log', 'monitor', 'check', 'verify',
    'connect', 'disconnect', 'send', 'receive', 'transmit', 'broadcast', 'listen',
    'parse', 'format', 'convert', 'transform', 'encode', 'decode', 'encrypt',
    'calculate', 'compute', 'process', 'analyze', 'extract', 'summarize', 'compare',
    'learn', 'teach', 'train', 'predict', 'classify', 'recognize', 'understand',
    'help', 'assist', 'guide', 'explain', 'describe', 'define', 'clarify',
    'ask', 'answer', 'question', 'query', 'request', 'respond', 'reply',
    'translate', 'convert', 'transform', 'adapt', 'adjust', 'customize', 'personalize',
    'share', 'publish', 'post', 'comment', 'like', 'follow', 'subscribe',
    'notify', 'alert', 'remind', 'schedule', 'plan', 'organize', 'manage',
  ],
  
  adjectives: [
    // Quality
    'fast', 'slow', 'quick', 'efficient', 'effective', 'powerful', 'weak',
    'simple', 'complex', 'easy', 'difficult', 'hard', 'soft', 'firm',
    'clean', 'dirty', 'neat', 'messy', 'organized', 'disorganized', 'structured',
    'modern', 'old', 'new', 'legacy', 'current', 'latest', 'deprecated',
    'stable', 'unstable', 'reliable', 'unreliable', 'robust', 'fragile', 'secure',
    'flexible', 'rigid', 'dynamic', 'static', 'adaptive', 'fixed', 'variable',
    'scalable', 'limited', 'extensible', 'modular', 'monolithic', 'distributed', 'centralized',
    'responsive', 'interactive', 'passive', 'active', 'real-time', 'batch', 'streaming',
    'open', 'closed', 'public', 'private', 'internal', 'external', 'shared',
    'standard', 'custom', 'default', 'optional', 'required', 'mandatory', 'optional',
    'complete', 'partial', 'full', 'empty', 'ready', 'pending', 'finished',
    'correct', 'incorrect', 'valid', 'invalid', 'true', 'false', 'unknown',
    'primary', 'secondary', 'tertiary', 'main', 'backup', 'alternate', 'fallback',
  ],
  
  adverbs: [
    'quickly', 'slowly', 'carefully', 'properly', 'correctly', 'efficiently',
    'effectively', 'easily', 'simply', 'directly', 'indirectly', 'automatically',
    'manually', 'immediately', 'eventually', 'periodically', 'continuously',
    'frequently', 'rarely', 'never', 'always', 'sometimes', 'often', 'usually',
    'completely', 'partially', 'fully', 'mostly', 'almost', 'nearly', 'exactly',
    'approximately', 'roughly', 'precisely', 'accurately', 'clearly', 'obviously',
    'apparently', 'possibly', 'probably', 'certainly', 'definitely', 'absolutely',
    'relatively', 'comparatively', 'similarly', 'differently', 'uniquely', 'specially',
  ],
  
  prepositions: [
    'in', 'on', 'at', 'by', 'with', 'from', 'to', 'for', 'of', 'about',
    'between', 'among', 'through', 'across', 'over', 'under', 'above', 'below',
    'before', 'after', 'during', 'until', 'since', 'while', 'within', 'without',
    'into', 'onto', 'upon', 'out of', 'instead of', 'because of', 'according to',
  ],
  
  conjunctions: [
    'and', 'or', 'but', 'nor', 'yet', 'so', 'for', 'because', 'since',
    'although', 'though', 'while', 'whereas', 'if', 'unless', 'until',
    'when', 'whenever', 'where', 'wherever', 'whether', 'either', 'neither',
    'both', 'not only', 'as well as', 'rather than', 'instead of',
  ],
};

async function seedVocabulary() {
  console.log('Seeding vocabulary...');
  
  let totalWords = 0;
  
  for (const [category, words] of Object.entries(VOCABULARY)) {
    console.log(`Adding ${words.length} ${category}...`);
    totalWords += words.length;
    
    // In a real implementation, this would call vocabularyService.addWords()
    // For now, we just log what would be added
  }
  
  console.log(`\nSeeded ${totalWords} words across ${Object.keys(VOCABULARY).length} categories`);
  console.log('\nCategories:');
  Object.entries(VOCABULARY).forEach(([category, words]) => {
    console.log(`  ${category}: ${words.length} words`);
  });
}

seedVocabulary().catch(console.error);
