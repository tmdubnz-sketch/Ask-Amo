import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, FileText, FileCode, File, ChevronRight, ChevronDown, RefreshCw, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { workspaceService, type WorkspaceEntry } from '../services/workspaceService';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

interface FileTreeProps {
  onFileSelect: (path: string, content: string) => void;
  currentFile?: string;
  refreshKey?: number | string;
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

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, currentFile, refreshKey }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['__workspace_root__']));
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceRootPath, setWorkspaceRootPath] = useState('workspace');

  const buildTree = (entries: WorkspaceEntry[]): FileItem[] => {
    const root: FileItem[] = [];
    const lookup = new Map<string, FileItem>();

    const ensureDir = (dirPath: string): FileItem => {
      const normalized = dirPath.replace(/\\/g, '/');
      const existing = lookup.get(normalized);
      if (existing) return existing;

      const name = normalized.split('/').pop() || normalized;
      const item: FileItem = { name, path: normalized, isDirectory: true, children: [] };
      lookup.set(normalized, item);

      const parentPath = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '';
      if (parentPath) {
        const parent = ensureDir(parentPath);
        parent.children = parent.children || [];
        if (!parent.children.some((child) => child.path === normalized)) {
          parent.children.push(item);
        }
      } else {
        root.push(item);
      }

      return item;
    };

    for (const entry of entries) {
      const normalized = entry.path.replace(/\\/g, '/');
      const parts = normalized.split('/');

      if (parts.length > 1) {
        ensureDir(parts.slice(0, -1).join('/'));
      }

      if (entry.isDirectory) {
        ensureDir(normalized);
        continue;
      }

      const fileItem: FileItem = {
        name: entry.name,
        path: normalized,
        isDirectory: false,
      };

      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      if (parentPath) {
        const parent = ensureDir(parentPath);
        parent.children = parent.children || [];
        parent.children.push(fileItem);
      } else {
        root.push(fileItem);
      }
    }

    const sortItems = (items: FileItem[]): FileItem[] => items
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((item) => ({
        ...item,
        children: item.children ? sortItems(item.children) : undefined,
      }));

    return sortItems(root);
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const rootPath = await workspaceService.getWorkspacePath();
      setWorkspaceRootPath(rootPath);

      const entries = await workspaceService.listWorkspaceEntries();

      if (entries.length === 0) {
        await Promise.all([
          workspaceService.createWorkspaceFile('index.html'),
          workspaceService.createWorkspaceFile('app.js'),
          workspaceService.createWorkspaceFile('style.css'),
        ]);
      }

      const refreshedEntries = await workspaceService.listWorkspaceEntries();
      setFiles(buildTree(refreshedEntries));
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [refreshKey]);

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
    const content = await workspaceService.readWorkspaceFile(file.path) || '';
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

  const rootExpanded = expandedDirs.has('__workspace_root__');
  const workspaceRootLabel = workspaceRootPath.split('/').filter(Boolean).pop() || workspaceRootPath;

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-r border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#161b22]">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              const name = prompt('New folder path from workspace root:', 'src');
              if (name) {
                const normalizedName = name.replace(/\\/g, '/');
                await workspaceService.createWorkspaceDirectory(normalizedName);
                await loadFiles();
                setExpandedDirs((previous) => new Set(previous).add('__workspace_root__').add(normalizedName));
              }
            }}
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
            title="New folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={async () => {
              const name = prompt('New file path from workspace root:', 'untitled.js');
              if (name) {
                const normalizedName = name.replace(/\\/g, '/');
                await workspaceService.createWorkspaceFile(normalizedName);
                await loadFiles();
                const parentPath = normalizedName.includes('/') ? normalizedName.slice(0, normalizedName.lastIndexOf('/')) : '';
                setExpandedDirs((previous) => {
                  const next = new Set(previous);
                  next.add('__workspace_root__');
                  if (parentPath) next.add(parentPath);
                  return next;
                });
                onFileSelect(normalizedName, '');
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

      <button
        onClick={() => {
          const next = new Set(expandedDirs);
          if (next.has('__workspace_root__')) {
            next.delete('__workspace_root__');
          } else {
            next.add('__workspace_root__');
          }
          setExpandedDirs(next);
        }}
        className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.02] text-left text-white/75 hover:bg-white/[0.04] transition-colors"
        title={workspaceRootPath}
      >
        {rootExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
        )}
        <Folder className="w-4 h-4 text-[#ffb347]" />
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">{workspaceRootLabel}</div>
          <div className="truncate text-[10px] text-white/35">{workspaceRootPath}</div>
        </div>
      </button>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-1">
        {!rootExpanded ? null : files.length === 0 ? (
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
