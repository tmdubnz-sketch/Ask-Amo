import React, { useState } from 'react';
import { Copy, Check, Play, FileCode } from 'lucide-react';
import { cn } from '../lib/utils';

interface CodeSnippetProps {
  code: string;
  language?: string;
  onCopy?: (code: string) => void;
  onRun?: (code: string) => void;
  compact?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  rb: 'Ruby',
  ruby: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  rust: 'Rust',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  php: 'PHP',
  sh: 'Shell',
  bash: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  md: 'Markdown',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  txt: 'Text',
};

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language = '',
  onCopy,
  onRun,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact || code.split('\n').length <= 5);

  const lang = language.toLowerCase();
  const displayLang = LANGUAGE_LABELS[lang] || lang.toUpperCase() || 'Code';
  const lineCount = code.split('\n').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs font-mono text-white/60">{displayLang}</span>
          {lineCount > 1 && (
            <span className="text-[10px] text-white/30">{lineCount} lines</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRun && (lang === 'javascript' || lang === 'python' || lang === 'js' || lang === 'py') && (
            <button
              onClick={() => onRun(code)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-green-400 hover:bg-green-400/10 transition-colors"
              title="Run code"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
              copied
                ? "text-green-400 bg-green-400/10"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="relative">
        {compact && !isExpanded && lineCount > 5 ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full px-4 py-3 text-left text-xs text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            Click to expand {lineCount} lines...
          </button>
        ) : (
          <pre className="p-4 overflow-x-auto text-sm font-mono text-[#e6edf3] leading-relaxed">
            <code>{code}</code>
          </pre>
        )}
      </div>

      {/* Footer with copy-to-terminal hint */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-t border-white/5">
        <span className="text-[10px] text-white/20">
          {copied ? '✓ Copied — paste into editor or terminal' : 'Click Copy to paste elsewhere'}
        </span>
      </div>
    </div>
  );
};
