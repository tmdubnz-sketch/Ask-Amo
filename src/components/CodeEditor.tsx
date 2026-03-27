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
  Eye,
} from 'lucide-react';
import { CodePreview } from './CodePreview';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { workspaceService } from '../services/workspaceService';
import { executeCode } from '../utils/codeExecutor';
import { FileTree, getLanguageFromPath } from './FileTree';
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
  suggestedCode?: string | null;
  autoRun?: boolean;
  autoPreview?: boolean;
  onOutputCapture?: (output: string) => void;
  refreshKey?: number | string;
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

const RUNNABLE_LANGUAGES = new Set<CodeLanguage>([
  'javascript',
  'typescript',
  'python',
  'shell',
  'json',
  'html',
  'css',
  'markdown',
]);

export function detectLanguage(fileName: string): CodeLanguage {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_EXTENSIONS[ext] || 'unknown';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  initialFileName = 'untitled.py',
  onRun,
  onGenerate,
  suggestedCode: initialSuggestedCode,
  autoRun = false,
  autoPreview = false,
  onOutputCapture,
  refreshKey,
}) => {
  const [code, setCode] = useState(initialCode);
  const [suggestedCode, setSuggestedCode] = useState<string | null>(initialSuggestedCode || null);
  const [fileName, setFileName] = useState(initialFileName);
  const [language, setLanguage] = useState<CodeLanguage>(detectLanguage(initialFileName));
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showPreview, setShowPreview] = useState(autoPreview);
  const [prompt, setPrompt] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorParentRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Update editor when initialCode prop changes (e.g., from processCodeBlocks)
  useEffect(() => {
    const nextCode = initialCode ?? '';
    setCode(nextCode);

    if (editorViewRef.current) {
      editorViewRef.current.dispatch({
        changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: nextCode }
      });
    }
  }, [initialCode]);

  // Update filename when prop changes
  useEffect(() => {
    const nextFileName = initialFileName || 'untitled.py';
    setFileName(nextFileName);
    setLanguage(detectLanguage(nextFileName));
  }, [initialFileName]);

  // Auto-run code when autoRun flag is set (Amo-controlled execution)
  useEffect(() => {
    if (autoRun && initialCode && code) {
      // Small delay to let editor render
      const timer = setTimeout(() => {
        handleRun();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoRun, initialCode]);

  useEffect(() => {
    const lang = detectLanguage(fileName);
    setLanguage(lang);
  }, [fileName]);

  useEffect(() => {
    void workspaceService.getWorkspacePath().then(setWorkspacePath).catch(() => setWorkspacePath('./workspace'));
  }, []);

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
      const result = await executeCode(code, language);
      
      let output = `[${result.method}] `;
      if (result.error) {
        output += `Error: ${result.error}`;
      } else {
        output += result.output || 'Done.';
      }
      
      setRunOutput(output);
      if (onOutputCapture) onOutputCapture(result.output || result.error || '');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Run failed';
      setRunOutput(errorMsg);
      if (onOutputCapture) onOutputCapture(errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  const canRun = code.trim().length > 0 && RUNNABLE_LANGUAGES.has(language);

  const handleSave = async () => {
    if (!fileName.trim()) return;

    setIsSaving(true);
    try {
      const savedPath = await workspaceService.saveToWorkspace(fileName, code);
      setRunOutput(`Saved to ${savedPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save failed';
      setRunOutput(`Save error: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = () => {
    if (onGenerate && prompt.trim()) {
      onGenerate(prompt, code);
      setPrompt('');
    }
  };

  const handleApplySuggestion = () => {
    if (suggestedCode) {
      setCode(suggestedCode);
      setSuggestedCode(null);
    }
  };

  const handleRejectSuggestion = () => {
    setSuggestedCode(null);
  };

  const handleClear = () => {
    setCode('');
    setRunOutput('');
    setSuggestedCode(null);
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
            onClick={() => setShowFileTree(!showFileTree)}
            className={cn(
              "p-2 rounded-lg border transition-all",
              showFileTree 
                ? "bg-[#ff4e00]/20 border-[#ff4e00]/30 text-[#ff4e00]"
                : "glass-panel border-white/10 text-white/60 hover:text-white hover:border-white/20"
            )}
            title="Toggle file tree"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

           <button
            onClick={handleSave}
            disabled={!fileName.trim() || isSaving}
            className={cn(
              "p-2 rounded-lg border transition-all",
              fileName.trim() && !isSaving
                ? "glass-panel border-white/10 text-white/60 hover:text-white hover:border-white/20"
                : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
            )}
            title="Save file"
          >
            <Save className={cn("w-4 h-4", isSaving && "animate-pulse")} />
          </button>

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
          
          {(language === 'html' || language === 'javascript' || language === 'css') && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "p-2 rounded-lg border transition-all",
                showPreview
                  ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                  : "glass-panel border-white/10 text-white/60 hover:text-white hover:border-white/20"
              )}
              title="Toggle preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          
            <button
              onClick={handleRun}
              disabled={!canRun || isRunning}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
                canRun && !isRunning
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
        {/* File Tree Panel - shown when toggled */}
        {showFileTree && (
          <div className="w-56 flex-shrink-0">
            <FileTree 
              onFileSelect={(path, content) => {
                setCode(content);
                setFileName(path);
                const newLang = getLanguageFromPath(path);
                setLanguage(newLang as CodeLanguage);
                if (editorViewRef.current) {
                  editorViewRef.current.dispatch({
                    changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: content }
                  });
                }
                setShowFileTree(false);
              }}
              currentFile={fileName}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {/* Editor Panel */}
        <div className={cn("flex flex-col bg-[#1e1e1e]", showPreview ? "w-1/2" : "flex-1")}>
          <div className="px-4 py-2 border-b border-white/10 bg-[#252526] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 font-mono">{fileName || 'untitled'}</span>
              {showFileTree && (
                <span className="text-[9px] text-white/20 truncate max-w-[200px]">
                  {workspacePath}
                </span>
              )}
            </div>
            <span className="text-xs text-[#ff4e00] font-mono">{LANGUAGE_LABELS[language]}</span>
          </div>
          <div 
            ref={editorParentRef} 
            className="flex-1 overflow-hidden"
          />
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
            <div className="px-4 py-2 border-b border-white/10 bg-[#252526] flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-white/40 font-mono">Preview</span>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CodePreview 
                code={code} 
                language={language} 
                onClose={() => setShowPreview(false)} 
              />
            </div>
          </div>
        )}

        <div className="w-80 flex flex-col gap-3 flex-shrink-0">
          <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            <div className="px-4 py-2 border-b border-white/10 bg-[#252526] flex items-center justify-between">
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

          {suggestedCode && (
            <div className="glass-panel border border-[#ff4e00]/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff4e00]" />
                  <span className="text-sm text-white/80 font-medium">AI Suggested Edit</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRejectSuggestion}
                    className="px-3 py-1 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleApplySuggestion}
                    className="px-3 py-1 rounded-lg text-xs bg-[#ff4e00] text-white hover:bg-[#ff4e00]/80 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
              <pre className="text-xs font-mono text-white/70 bg-black/30 rounded-lg p-3 max-h-40 overflow-auto custom-scrollbar">
                {suggestedCode}
              </pre>
            </div>
          )}

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
