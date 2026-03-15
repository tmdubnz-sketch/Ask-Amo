import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Save, 
  FolderOpen, 
  Copy, 
  Check, 
  X,
  FileCode,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { terminalService } from '../services/terminalService';
import { cn } from '../lib/utils';

export type CodeLanguage = 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'json'
  | 'markdown'
  | 'html' 
  | 'css'
  | 'java'
  | 'kotlin'
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'swift'
  | 'dart'
  | 'php'
  | 'ruby'
  | 'lua'
  | 'shell'
  | 'sql'
  | 'unknown';

interface CodeEditorProps {
  initialCode?: string;
  initialFileName?: string;
  onRun?: (code: string, language: CodeLanguage) => void;
  onGenerate?: (prompt: string, context: string) => void;
}

const LANGUAGE_EXTENSIONS: Record<string, CodeLanguage> = {
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  css: 'css',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  dart: 'dart',
  php: 'php',
  rb: 'ruby',
  lua: 'lua',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
};

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  json: 'JSON',
  markdown: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  java: 'Java',
  kotlin: 'Kotlin',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  swift: 'Swift',
  dart: 'Dart',
  php: 'PHP',
  ruby: 'Ruby',
  lua: 'Lua',
  shell: 'Shell',
  sql: 'SQL',
  unknown: 'Plain Text',
};

const LANGUAGE_COMMANDS: Record<CodeLanguage, string> = {
  python: 'python3',
  javascript: 'node',
  typescript: 'npx ts-node',
  json: 'cat',
  markdown: 'cat',
  html: 'open',
  css: 'open',
  java: 'java',
  kotlin: 'kotlin',
  csharp: 'dotnet run',
  cpp: './a.out',
  c: './a.out',
  go: 'go run',
  rust: 'cargo run',
  swift: 'swift',
  dart: 'dart',
  php: 'php',
  ruby: 'ruby',
  lua: 'lua',
  shell: 'bash',
  sql: 'sqlite3',
  unknown: '',
};

export function detectLanguage(fileName: string): CodeLanguage {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_EXTENSIONS[ext] || 'unknown';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  initialFileName = 'untitled.py',
  onRun,
  onGenerate,
}) => {
  const [code, setCode] = useState(initialCode);
  const [fileName, setFileName] = useState(initialFileName);
  const [language, setLanguage] = useState<CodeLanguage>(detectLanguage(initialFileName));
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState('');
  const editorParentRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    const lang = detectLanguage(fileName);
    setLanguage(lang);
  }, [fileName]);

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFileName(newName);
    setLanguage(detectLanguage(newName));
  };

  const getLanguageExtension = useCallback(() => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return javascript({ jsx: true, typescript: language === 'typescript' });
      case 'json':
        return json();
      case 'markdown':
        return markdown();
      case 'python':
        return python();
      default:
        return javascript({ jsx: true });
    }
  }, [language]);

  useEffect(() => {
    if (!editorParentRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle),
      getLanguageExtension(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setCode(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '13px' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content': { fontFamily: 'monospace' },
      }),
    ];

    const state = EditorState.create({
      doc: code,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorParentRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [language]); // Re-create editor when language changes

  useEffect(() => {
    // Update content when code prop changes externally
    if (editorViewRef.current) {
      const currentDoc = editorViewRef.current.state.doc.toString();
      if (currentDoc !== code) {
        editorViewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: code }
        });
      }
    }
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    if (!code.trim()) return;
    
    setIsRunning(true);
    setRunOutput('');
    
    try {
      let command: string;
      
      if (language === 'python') {
        const tempFile = `/tmp/${fileName}`;
        await terminalService.exec({
          command: `echo '${code.replace(/'/g, "'\\''")}' > ${tempFile}`,
          sessionId: sessionIdRef.current,
          timeoutMs: 5000,
        });
        command = `python3 ${tempFile}`;
      } else if (language === 'javascript' || language === 'typescript') {
        const tempFile = `/tmp/${fileName}`;
        await terminalService.exec({
          command: `echo '${code.replace(/'/g, "'\\''")}' > ${tempFile}`,
          sessionId: sessionIdRef.current,
          timeoutMs: 5000,
        });
        if (language === 'typescript') {
          command = `npx ts-node ${tempFile}`;
        } else {
          command = `node ${tempFile}`;
        }
      } else if (language === 'shell') {
        command = `echo '${code.replace(/'/g, "'\\''")}' | bash`;
      } else {
        const cmd = LANGUAGE_COMMANDS[language];
        if (cmd) {
          command = `${cmd} ${fileName}`;
        } else {
          setRunOutput(`Run command not configured for ${LANGUAGE_LABELS[language]}`);
          setIsRunning(false);
          return;
        }
      }

      const result = await terminalService.exec({
        command,
        sessionId: sessionIdRef.current,
        timeoutMs: 30000,
      });

      setRunOutput(result.output || (result.exitCode === 0 ? 'Done.' : `[exit ${result.exitCode}]`));
    } catch (error) {
      setRunOutput(error instanceof Error ? error.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerate = () => {
    if (onGenerate && prompt.trim()) {
      onGenerate(prompt, code);
      setPrompt('');
    }
  };

  const handleClear = () => {
    setCode('');
    setRunOutput('');
  };

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 glass-panel border border-white/10 rounded-xl px-3 py-2">
          <FileCode className="w-4 h-4 text-[#ff4e00]" />
          <input
            type="text"
            value={fileName}
            onChange={handleFileNameChange}
            className="bg-transparent border-none outline-none text-sm text-white w-32 font-mono"
            placeholder="filename.py"
          />
        </div>
        
        <div className="glass-panel border border-white/10 rounded-xl px-3 py-2">
          <span className="text-xs text-white/50">Language:</span>
          <span className="text-sm text-[#ff4e00] ml-2 font-medium">{LANGUAGE_LABELS[language]}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg glass-panel border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleClear}
            className="p-2 rounded-lg glass-panel border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            title="Clear code"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleRun}
            disabled={!code.trim() || isRunning}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
              code.trim() && !isRunning
                ? "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
                : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
            )}
          >
            <Play className={cn("w-4 h-4", isRunning && "animate-pulse")} />
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col glass-panel border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <span className="text-xs text-white/40 font-mono">Editor</span>
            <span className="text-xs text-[#ff4e00] font-mono">{LANGUAGE_LABELS[language]}</span>
          </div>
          <div 
            ref={editorParentRef} 
            className="flex-1 overflow-hidden"
          />
        </div>

        <div className="w-80 flex flex-col gap-3">
          <div className="flex-1 flex flex-col glass-panel border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-xs text-white/40 font-mono">Output</span>
              {runOutput && (
                <button 
                  onClick={() => setRunOutput('')}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto custom-scrollbar">
              {runOutput ? (
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{runOutput}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-white/30 text-sm">
                  {isRunning ? 'Running...' : 'Click Run to execute'}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#ff4e00]" />
              <span className="text-sm text-white/80 font-medium">Generate Code</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Amo to generate or edit code..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none outline-none focus:border-[#ff4e00]/50"
              rows={2}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30 hover:bg-[#ff4e00]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
