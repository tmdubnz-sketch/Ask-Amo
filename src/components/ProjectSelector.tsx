import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Check, X, Folder } from 'lucide-react';
import { workspaceService, Workspace } from '../services/workspaceService';
import { cn } from '../lib/utils';

interface ProjectSelectorProps {
  onSelect: (workspace: Workspace) => void;
  onCreateNew?: () => void;
  currentWorkspace?: Workspace | null;
}

export function ProjectSelector({ onSelect, onCreateNew, currentWorkspace }: ProjectSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    const all = workspaceService.getAllWorkspaces();
    setWorkspaces(all);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const workspace = await workspaceService.createWorkspace(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
      await loadWorkspaces();
      onSelect(workspace);
    } catch (e) {
      console.error('Failed to create workspace:', e);
    }
  };

  const handleSelect = (workspace: Workspace) => {
    workspaceService.switchWorkspace(workspace.id);
    onSelect(workspace);
  };

  const handleDelete = async (e: React.MouseEvent, workspace: Workspace) => {
    e.stopPropagation();
    if (workspace.isDefault) return;
    
    try {
      await workspaceService.deleteWorkspace(workspace.id);
      await loadWorkspaces();
    } catch (e) {
      console.error('Failed to delete workspace:', e);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white/40">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-[#ff4e00]" />
          <div>
            <h2 className="text-sm font-semibold text-white/90">Select Project</h2>
            <p className="text-xs text-white/50">{workspaces.length} project{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCreating ? (
            <>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Project name..."
                className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#ff4e00]"
                autoFocus
              />
              <button
                onClick={handleCreate}
                className="p-1.5 rounded-lg bg-[#ff4e00] text-white hover:bg-[#ff4e00]/80"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewProjectName(''); }}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff4e00] text-white text-xs font-medium hover:bg-[#ff4e00]/80 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
        {workspaces.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No projects yet</p>
            <p className="text-xs mt-1">Create a project to get started</p>
          </div>
        ) : (
          workspaces.map(workspace => (
            <div
              key={workspace.id}
              onClick={() => handleSelect(workspace)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all",
                currentWorkspace?.id === workspace.id
                  ? "bg-[#ff4e00]/10 border-[#ff4e00]/30"
                  : "bg-white/[0.03] border-white/8 hover:border-white/15 hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  currentWorkspace?.id === workspace.id
                    ? "bg-[#ff4e00]/20 text-[#ff4e00]"
                    : "bg-white/10 text-white/60"
                )}>
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white/90">{workspace.name}</h3>
                    {workspace.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-[10px]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-1 truncate">{workspace.path}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">
                    Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {currentWorkspace?.id === workspace.id && (
                    <Check className="w-4 h-4 text-[#ff4e00]" />
                  )}
                  {!workspace.isDefault && (
                    <button
                      onClick={(e) => handleDelete(e, workspace)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
