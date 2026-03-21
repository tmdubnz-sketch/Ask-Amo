import React, { useRef, useEffect } from 'react';
import { X, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface CodePreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ code, language, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    
    const lang = language.toLowerCase();
    let html = '';

    if (lang === 'html' || lang === 'htm') {
      // HTML - render directly
      html = code;
    } else if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      // JS/TS - wrap in HTML with console capture
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 16px; }
    .log { color: #a8e6cf; margin: 4px 0; }
    .error { color: #ff6b6b; margin: 4px 0; }
    .result { color: #ffd93d; margin: 4px 0; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const origConsole = { log: console.log, error: console.error };
    
    function addLine(text, cls) {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      output.appendChild(div);
    }
    
    console.log = (...args) => {
      origConsole.log(...args);
      addLine(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'log');
    };
    
    console.error = (...args) => {
      origConsole.error(...args);
      addLine(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'error');
    };
    
    try {
      const result = eval(\`${code.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`);
      if (result !== undefined) {
        addLine('→ ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)), 'result');
      }
    } catch(e) {
      addLine('Error: ' + e.message, 'error');
    }
  </script>
</body>
</html>`;
    } else if (lang === 'python') {
      // Python - show code with note about Pyodide
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 16px; }
    .code { background: #0d1117; padding: 12px; border-radius: 8px; white-space: pre-wrap; }
    .note { color: #ffd93d; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="code">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <div class="note">Click "Run" in the editor to execute Python via Pyodide.</div>
</body>
</html>`;
    } else {
      // Other - show code
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 16px; }
    .code { background: #0d1117; padding: 12px; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="code">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</body>
</html>`;
    }

    iframeRef.current.srcdoc = html;
  }, [code, language]);

  const handleOpenExternal = () => {
    const blob = new Blob([iframeRef.current?.srcdoc || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] rounded-xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10">
        <span className="text-xs font-mono text-white/60">
          Preview — {language || 'code'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (iframeRef.current) {
                iframeRef.current.srcdoc = iframeRef.current.srcdoc;
              }
            }}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="Open in external browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="Close preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Code Preview"
      />
    </div>
  );
};
