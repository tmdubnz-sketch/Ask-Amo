// Complete file parser supporting all document, skill, and dataset formats.
// Every format either parses fully or falls back to raw text gracefully.
//
// Supported:
//   Documents:  .txt .md .html .pdf .docx .rtf .odt
//   Datasets:   .csv .tsv .json .jsonl .xml .yaml .yml .ndjson
//   Code/Other: .js .ts .py .java .cpp .c .cs .go .rb .php .swift .kt
//               .sh .bash .sql .graphql .proto
//   Archives:   not supported — instruct user to extract first

export interface ParsedDocument {
  content: string;
  title: string;
  wordCount: number;
  format: string;
  metadata: Record<string, string>;
}

// ── FORMAT DETECTION ──────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getMimeCategory(file: File): string {
  if (file.type.startsWith('text/')) return 'text';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'application/json') return 'json';
  if (file.type.includes('word') || file.type.includes('document')) return 'docx';
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'spreadsheet';
  return 'unknown';
}

// ── TEXT UTILITIES ─────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cleanWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function truncateIfNeeded(text: string, maxChars = 500_000): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  return truncated + `\n\n[Document truncated at ${maxChars.toLocaleString()} characters]`;
}

// ── PARSERS ───────────────────────────────────────────────────────────────────

// Plain text — passthrough
function parsePlainText(text: string, filename: string): ParsedDocument {
  const content = cleanWhitespace(text);
  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'txt',
    metadata: {},
  };
}

// Markdown — strip frontmatter, preserve structure as readable text
function parseMarkdown(text: string, filename: string): ParsedDocument {
  let content = text;
  const metadata: Record<string, string> = {};

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    content = content.slice(frontmatterMatch[0].length);
    const lines = frontmatterMatch[1].split('\n');
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      if (key && rest.length) {
        metadata[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const title = metadata.title
    || content.match(/^#\s+(.+)/m)?.[1]
    || filename.replace(/\.[^.]+$/, '');

  content = cleanWhitespace(content);
  return {
    content: truncateIfNeeded(content),
    title,
    wordCount: countWords(content),
    format: 'md',
    metadata,
  };
}

// HTML — strip tags, preserve meaningful text
function parseHtml(text: string, filename: string): ParsedDocument {
  // Extract title from <title> tag
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || filename.replace(/\.[^.]+$/, '');

  // Remove script and style blocks entirely
  let content = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '');

  // Convert block elements to newlines before stripping
  content = content
    .replace(/<\/?(h[1-6]|p|div|section|article|header|footer|main|nav|aside|li|tr|blockquote|pre)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(th|td)[^>]*>/gi, '\t')
    .replace(/<hr[^>]*>/gi, '\n---\n');

  // Strip remaining tags
  content = content.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  content = cleanWhitespace(content);
  return {
    content: truncateIfNeeded(content),
    title,
    wordCount: countWords(content),
    format: 'html',
    metadata: {},
  };
}

// CSV — convert to readable key:value format
function parseCsv(text: string, filename: string, delimiter = ','): ParsedDocument {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { content: '', title: filename, wordCount: 0, format: 'csv', metadata: {} };
  }

  // Parse a single CSV line respecting quoted fields
  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = parseLine(lines[0]);
  const rows: string[] = [];

  // For small files — full key:value format
  if (lines.length <= 200) {
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row = headers
        .map((h, idx) => `${h}: ${values[idx] || ''}`)
        .filter(pair => !pair.endsWith(': '))
        .join(', ');
      if (row) rows.push(row);
    }
  } else {
    // For large files — header summary + first 100 rows + last 10 rows
    rows.push(`Headers: ${headers.join(', ')}`);
    rows.push(`Total rows: ${lines.length - 1}`);
    rows.push('');
    rows.push('First 100 rows:');
    for (let i = 1; i <= Math.min(100, lines.length - 1); i++) {
      const values = parseLine(lines[i]);
      const row = headers.map((h, idx) => `${h}: ${values[idx] || ''}`).join(', ');
      if (row) rows.push(row);
    }
    if (lines.length > 110) {
      rows.push(`\n...${lines.length - 110} rows omitted...\n`);
      rows.push('Last 10 rows:');
      for (let i = Math.max(1, lines.length - 10); i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row = headers.map((h, idx) => `${h}: ${values[idx] || ''}`).join(', ');
        if (row) rows.push(row);
      }
    }
  }

  const content = cleanWhitespace(rows.join('\n'));
  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'csv',
    metadata: { headers: headers.join(', '), rowCount: String(lines.length - 1) },
  };
}

// TSV — same as CSV but tab-delimited
function parseTsv(text: string, filename: string): ParsedDocument {
  return parseCsv(text, filename, '\t');
}

// JSON — intelligent flattening to readable text
function parseJson(text: string, filename: string): ParsedDocument {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // Not valid JSON — treat as plain text
    return parsePlainText(text, filename);
  }

  const lines: string[] = [];

  function flatten(obj: unknown, prefix = '', depth = 0): void {
    if (depth > 4) return; // prevent infinite depth
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return;
      // Array of primitives — list them
      if (typeof obj[0] !== 'object') {
        lines.push(`${prefix}: ${obj.join(', ')}`);
        return;
      }
      // Array of objects — flatten each with index
      obj.slice(0, 200).forEach((item, i) => {
        flatten(item, prefix ? `${prefix}[${i}]` : `[${i}]`, depth + 1);
      });
      if (obj.length > 200) {
        lines.push(`${prefix}: ... ${obj.length - 200} more items`);
      }
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          flatten(value, fullKey, depth + 1);
        } else {
          lines.push(`${fullKey}: ${value}`);
        }
      }
      return;
    }

    lines.push(prefix ? `${prefix}: ${obj}` : String(obj));
  }

  flatten(data);
  const content = cleanWhitespace(lines.join('\n'));

  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'json',
    metadata: { type: Array.isArray(data) ? 'array' : 'object', entries: String(lines.length) },
  };
}

// JSONL / NDJSON — one JSON object per line
function parseJsonl(text: string, filename: string): ParsedDocument {
  const lines = text.split('\n').filter(line => line.trim());
  const parsed: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    try {
      const obj = JSON.parse(lines[i]);
      if (typeof obj === 'object' && obj !== null) {
        const row = Object.entries(obj as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        parsed.push(row);
      } else {
        parsed.push(String(obj));
      }
    } catch {
      parsed.push(lines[i]);
    }
  }

  if (lines.length > 500) {
    parsed.push(`\n[${lines.length - 500} more records omitted]`);
  }

  const content = cleanWhitespace(parsed.join('\n'));
  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'jsonl',
    metadata: { lineCount: String(lines.length) },
  };
}

// XML — strip tags, preserve text content with element names as context
function parseXml(text: string, filename: string): ParsedDocument {
  // Extract title from common title elements
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i)
    || text.match(/<name[^>]*>([^<]+)<\/name>/i);
  const title = titleMatch?.[1]?.trim() || filename.replace(/\.[^.]+$/, '');

  // Remove XML declaration and comments
  let content = text
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert elements to readable format
  // Self-closing tags with attributes — extract attribute values
  content = content.replace(/<(\w+)([^/]*?)\/>/g, (_, tag, attrs) => {
    const attrText = attrs.replace(/(\w+)="([^"]*)"/g, '$1: $2').trim();
    return attrText ? `${tag}: ${attrText}\n` : '';
  });

  // Closing block tags get newlines
  content = content.replace(/<\/(\w+)>/g, (_, tag) => {
    const blockTags = ['item', 'entry', 'record', 'row', 'article', 'book', 'product', 'element'];
    return blockTags.includes(tag.toLowerCase()) ? '\n' : ' ';
  });

  // Strip remaining tags
  content = content.replace(/<[^>]+>/g, ' ');

  // Decode XML entities
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  content = cleanWhitespace(content);
  return {
    content: truncateIfNeeded(content),
    title,
    wordCount: countWords(content),
    format: 'xml',
    metadata: {},
  };
}

// YAML — parse key-value structure to readable text
function parseYaml(text: string, filename: string): ParsedDocument {
  // Basic YAML to text — handles common patterns without a full parser
  const lines = text.split('\n');
  const output: string[] = [];
  const stack: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (trimmed.startsWith('#')) {
        output.push(trimmed.slice(1).trim()); // comments as context
      }
      continue;
    }

    // Detect indent level
    const indent = line.search(/\S/);
    const level = Math.floor(indent / 2);
    stack.length = level;

    // Key: value
    const kvMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value.trim()) {
        const prefix = stack.filter(Boolean).join(' > ');
        output.push(prefix ? `${prefix} > ${key}: ${value}` : `${key}: ${value}`);
        stack[level] = key.trim();
      } else {
        stack[level] = key.trim();
      }
      continue;
    }

    // List item
    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      const prefix = stack.filter(Boolean).join(' > ');
      output.push(prefix ? `${prefix}: ${listMatch[1]}` : listMatch[1]);
    }
  }

  const content = cleanWhitespace(output.join('\n'));
  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'yaml',
    metadata: {},
  };
}

// RTF — strip RTF control words, extract plain text
function parseRtf(text: string, filename: string): ParsedDocument {
  let content = text
    // Remove RTF header and font tables
    .replace(/\{\\fonttbl[\s\S]*?\}/g, '')
    .replace(/\{\\colortbl[\s\S]*?\}/g, '')
    .replace(/\{\\stylesheet[\s\S]*?\}/g, '')
    .replace(/\{\\info[\s\S]*?\}/g, '')
    // Convert paragraph markers to newlines
    .replace(/\\par\b/g, '\n')
    .replace(/\\pard\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    // Remove control words
    .replace(/\\[a-z]+\-?\d*\s?/g, '')
    // Remove remaining braces
    .replace(/[{}]/g, '')
    // Clean up
    .replace(/\\\*/g, '')
    .replace(/\\/g, '');

  content = cleanWhitespace(content);
  return {
    content: truncateIfNeeded(content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'rtf',
    metadata: {},
  };
}

// PDF — uses PDF.js with fallback to raw text extraction
async function parsePdf(file: File): Promise<ParsedDocument> {
  const filename = file.name;

  try {
    // Dynamic import to avoid bundle issues
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker — try CDN first, fall back to no worker
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } catch {}

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];
    const numPages = Math.min(pdf.numPages, 100); // cap at 100 pages

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    if (pdf.numPages > 100) {
      textParts.push(`\n[PDF truncated — showing 100 of ${pdf.numPages} pages]`);
    }

    const content = cleanWhitespace(textParts.join('\n\n'));
    const metadata = await pdf.getMetadata().catch(() => ({ info: {} }));
    const info = (metadata?.info || {}) as Record<string, unknown>;

    return {
      content: truncateIfNeeded(content),
      title: String(info.Title || filename.replace(/\.[^.]+$/, '')),
      wordCount: countWords(content),
      format: 'pdf',
      metadata: {
        author:   String(info.Author  || ''),
        subject:  String(info.Subject || ''),
        pages:    String(pdf.numPages),
      },
    };

  } catch (pdfError) {
    console.warn('[DocumentService] PDF.js failed, attempting raw text extraction:', pdfError);

    // Fallback — try to extract any readable text from the binary
    try {
      const text = await file.text();
      // Find readable ASCII chunks
      const readable = text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .trim();

      if (readable.length > 100) {
        return {
          content: truncateIfNeeded(readable),
          title: filename.replace(/\.[^.]+$/, ''),
          wordCount: countWords(readable),
          format: 'pdf',
          metadata: { note: 'Extracted via fallback — formatting may be imperfect' },
        };
      }
    } catch {}

    throw new Error(
      `Could not read ${filename}. ` +
      `PDF parsing is limited in this environment. ` +
      `Try exporting the PDF as a .txt file and importing that instead.`
    );
  }
}

// DOCX — uses mammoth for proper Word document extraction
async function parseDocx(file: File): Promise<ParsedDocument> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.info('[DocumentService] DOCX messages:', result.messages);
    }

    const content = cleanWhitespace(result.value);
    return {
      content: truncateIfNeeded(content),
      title: file.name.replace(/\.[^.]+$/, ''),
      wordCount: countWords(content),
      format: 'docx',
      metadata: {},
    };
  } catch (e) {
    console.warn('[DocumentService] mammoth not available, trying raw text:', e);
    // Fallback — DOCX is a ZIP — try to extract any readable text
    const text = await file.text();
    const readable = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n').trim();
    if (readable.length > 50) {
      return {
        content: truncateIfNeeded(readable),
        title: file.name.replace(/\.[^.]+$/, ''),
        wordCount: countWords(readable),
        format: 'docx',
        metadata: { note: 'Fallback extraction — install mammoth for full DOCX support' },
      };
    }
    throw new Error('Could not read DOCX file. Run: npm install mammoth');
  }
}

// Code files — preserve as-is with language tag
function parseCode(text: string, filename: string, ext: string): ParsedDocument {
  const languageMap: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java',
    cpp: 'C++', c: 'C', cs: 'C#', go: 'Go', rb: 'Ruby', php: 'PHP',
    swift: 'Swift', kt: 'Kotlin', rs: 'Rust', sh: 'Shell', bash: 'Bash',
    sql: 'SQL', graphql: 'GraphQL', proto: 'Protobuf', r: 'R',
    scala: 'Scala', dart: 'Dart', lua: 'Lua', ex: 'Elixir', hs: 'Haskell',
  };

  const language = languageMap[ext] || ext.toUpperCase();
  const content = `File: ${filename}\nLanguage: ${language}\n\n${cleanWhitespace(text)}`;

  return {
    content: truncateIfNeeded(content),
    title: filename,
    wordCount: countWords(text),
    format: ext,
    metadata: { language },
  };
}

// SQL — special handling to extract table/column info
function parseSql(text: string, filename: string): ParsedDocument {
  const content = cleanWhitespace(text);
  const tables: string[] = [];

  // Extract CREATE TABLE statements for summary
  const tableMatches = text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([^)]+)\)/gi);
  for (const match of tableMatches) {
    const tableName = match[1];
    const columns = match[2]
      .split(',')
      .map(col => col.trim().split(/\s+/)[0])
      .filter(col => col && !col.startsWith('--'))
      .join(', ');
    tables.push(`Table ${tableName}: ${columns}`);
  }

  const summary = tables.length > 0
    ? `Schema summary:\n${tables.join('\n')}\n\n`
    : '';

  return {
    content: truncateIfNeeded(summary + content),
    title: filename.replace(/\.[^.]+$/, ''),
    wordCount: countWords(content),
    format: 'sql',
    metadata: { tableCount: String(tables.length) },
  };
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

export const documentService = {

  async parseFile(file: File): Promise<ParsedDocument> {
    const ext = getExtension(file.name);
    const mimeCategory = getMimeCategory(file);

    // ── Text-based formats ───────────────────────────────────────────────────
    const textFormats = [
      'txt', 'text', 'log', 'env', 'ini', 'cfg', 'conf',
      'md', 'mdx', 'markdown',
      'html', 'htm', 'xhtml',
      'csv',
      'tsv',
      'json',
      'jsonl', 'ndjson',
      'xml', 'rss', 'atom', 'svg',
      'yaml', 'yml',
      'rtf',
      'sql',
      'js', 'jsx', 'mjs', 'cjs',
      'ts', 'tsx',
      'py', 'pyw',
      'java', 'kt', 'kts',
      'cpp', 'cc', 'cxx', 'c', 'h', 'hpp',
      'cs',
      'go',
      'rb',
      'php',
      'swift',
      'rs',
      'sh', 'bash', 'zsh', 'fish',
      'graphql', 'gql',
      'proto',
      'r', 'rmd',
      'scala',
      'dart',
      'lua',
      'ex', 'exs',
      'hs',
    ];

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (ext === 'pdf' || mimeCategory === 'pdf') {
      return parsePdf(file);
    }

    // ── DOCX ─────────────────────────────────────────────────────────────────
    if (ext === 'docx' || ext === 'doc' || mimeCategory === 'docx') {
      return parseDocx(file);
    }

    // ── ODT (OpenDocument Text) ───────────────────────────────────────────────
    if (ext === 'odt') {
      // ODT is a ZIP — mammoth can't read it, try raw text extraction
      const text = await file.text();
      const xmlContent = text.match(/<text:[\s\S]*?<\/office:text>/)?.[0] || text;
      const parsed = parseXml(xmlContent, file.name);
      return { ...parsed, format: 'odt' };
    }

    // ── Text-based formats ────────────────────────────────────────────────────
    if (textFormats.includes(ext) || mimeCategory === 'text') {
      const text = await file.text();

      switch (ext) {
        case 'md': case 'mdx': case 'markdown':
          return parseMarkdown(text, file.name);

        case 'html': case 'htm': case 'xhtml':
          return parseHtml(text, file.name);

        case 'csv':
          return parseCsv(text, file.name, ',');

        case 'tsv':
          return parseTsv(text, file.name);

        case 'json':
          return parseJson(text, file.name);

        case 'jsonl': case 'ndjson':
          return parseJsonl(text, file.name);

        case 'xml': case 'rss': case 'atom':
          return parseXml(text, file.name);

        case 'yaml': case 'yml':
          return parseYaml(text, file.name);

        case 'rtf':
          return parseRtf(text, file.name);

        case 'sql':
          return parseSql(text, file.name);

        case 'js': case 'jsx': case 'mjs': case 'cjs':
        case 'ts': case 'tsx':
        case 'py': case 'pyw':
        case 'java': case 'kt': case 'kts':
        case 'cpp': case 'cc': case 'cxx': case 'c': case 'h': case 'hpp':
        case 'cs':
        case 'go':
        case 'rb':
        case 'php':
        case 'swift':
        case 'rs':
        case 'sh': case 'bash': case 'zsh': case 'fish':
        case 'graphql': case 'gql':
        case 'proto':
        case 'r': case 'rmd':
        case 'scala':
        case 'dart':
        case 'lua':
        case 'ex': case 'exs':
        case 'hs':
          return parseCode(text, file.name, ext);

        default:
          // Unknown extension — try as plain text
          return parsePlainText(text, file.name);
      }
    }

    // ── Audio/Video — not parseable for text content ──────────────────────────
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      throw new Error(
        `Audio and video files cannot be imported as knowledge documents. ` +
        `To use audio with Amo, use the microphone button for voice input instead.`
      );
    }

    // ── Image — not parseable for text content ────────────────────────────────
    if (file.type.startsWith('image/')) {
      throw new Error(
        `Image files cannot be imported as knowledge documents. ` +
        `To analyse an image, attach it directly in the chat using the + button.`
      );
    }

    // ── Last resort — try reading as text ─────────────────────────────────────
    try {
      const text = await file.text();
      if (text.length > 10) {
        console.warn(`[DocumentService] Unknown format ${ext} — reading as plain text`);
        return parsePlainText(text, file.name);
      }
    } catch {}

    throw new Error(
      `Unsupported file type: .${ext}. ` +
      `Supported: txt, md, html, pdf, docx, csv, tsv, json, jsonl, xml, yaml, rtf, sql, ` +
      `and all common code file types.`
    );
  },

  // Convenience method — returns just the content string
  async parseFileContent(file: File): Promise<string> {
    const result = await this.parseFile(file);
    return result.content;
  },

  // Returns supported extensions for file input accept attribute
  getSupportedExtensions(): string {
    return [
      '.txt', '.md', '.html', '.htm',
      '.pdf', '.docx', '.rtf', '.odt',
      '.csv', '.tsv', '.json', '.jsonl', '.xml', '.yaml', '.yml',
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.kt',
      '.cpp', '.c', '.cs', '.go', '.rb', '.php', '.swift', '.rs',
      '.sh', '.bash', '.sql', '.graphql', '.proto',
    ].join(',');
  },
};

// Keep chunkDocument for backward compatibility
function generateChunkId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  metadata: any;
}

export function chunkDocument(content: string, documentId: string, documentName: string): DocumentChunk[] {
  const chunkSize = 1000;
  const chunkOverlap = 200;
  const chunks: DocumentChunk[] = [];
  
  let start = 0;
  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    const chunkContent = content.substring(start, end);
    
    chunks.push({
      id: generateChunkId(),
      documentId,
      documentName,
      content: chunkContent,
      metadata: {
        start,
        end
      }
    });
    
    start += chunkSize - chunkOverlap;
  }
  
  return chunks;
}
