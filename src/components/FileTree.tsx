import React, { useState, useEffect } from 'react';
import { Folder, FileText, FileCode, File, ChevronRight, ChevronDown, RefreshCw, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

interface FileTreeProps {
  onFileSelect: (path: string, content: string) => void;
  currentFile?: string;
}

// Get file icon based on extension
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'go':
    case 'rs':
    case 'rb':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'html':
    case 'css':
    case 'scss':
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
      return <FileCode className="w-4 h-4 text-green-400" />;
    case 'txt':
    case 'md':
    case 'log':
      return <FileText className="w-4 h-4 text-white/50" />;
    default:
      return <File className="w-4 h-4 text-white/40" />;
  }
};

// Get language from filename
export const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'sh': 'shell',
    'bash': 'shell',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return langMap[ext] || 'text';
};

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, currentFile }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage (workspace files stored there)
      const workspaceFiles: FileItem[] = [];
      
      // Check localStorage for stored files
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('amo-file:')) {
          const name = key.replace('amo-file:', '');
          workspaceFiles.push({
            name,
            path: name,
            isDirectory: false,
          });
        }
      }

      // Also add some default project structure
      if (workspaceFiles.length === 0) {
        workspaceFiles.push(
          { name: 'index.html', path: 'index.html', isDirectory: false },
          { name: 'app.js', path: 'app.js', isDirectory: false },
          { name: 'style.css', path: 'style.css', isDirectory: false },
        );
      }

      setFiles(workspaceFiles.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleFileClick = async (file: FileItem) => {
    if (file.isDirectory) {
      const newExpanded = new Set(expandedDirs);
      if (newExpanded.has(file.path)) {
        newExpanded.delete(file.path);
      } else {
        newExpanded.add(file.path);
      }
      setExpandedDirs(newExpanded);
      return;
    }

    // Load file content
    const content = localStorage.getItem(`amo-file:${file.path}`) || '';
    onFileSelect(file.path, content);
  };

  const renderFile = (file: FileItem, depth: number = 0) => {
    const isExpanded = expandedDirs.has(file.path);
    const isCurrentFile = currentFile === file.path;

    return (
      <div key={file.path}>
        <button
          onClick={() => handleFileClick(file)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
            isCurrentFile
              ? "bg-[#ff4e00]/10 text-[#ff4e00]"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {file.isDirectory ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              )}
              <Folder className="w-4 h-4 text-yellow-400" />
            </>
          ) : (
            <>
              <span className="w-3.5" />
              {getFileIcon(file.name)}
            </>
          )}
          <span className="truncate">{file.name}</span>
        </button>

        {file.isDirectory && isExpanded && file.children?.map(child => 
          renderFile(child, depth + 1)
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-r border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#161b22]">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const name = prompt('New file name:', 'untitled.js');
              if (name) {
                localStorage.setItem(`amo-file:${name}`, '');
                loadFiles();
                onFileSelect(name, '');
              }
            }}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="New file"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadFiles}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-center text-white/30 text-sm">
            No files yet
          </div>
        ) : (
          files.map(file => renderFile(file))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/10 bg-[#161b22]">
        <span className="text-[10px] text-white/30">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};
