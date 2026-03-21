import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useModelSettingsStore } from '../stores/modelSettingsStore';
import {
  MessageSquare,
  FolderOpen,
  Brain,
  Zap,
  Cpu,
  HelpCircle,
  Settings,
  X,
  Plus,
  Trash2,
  FileText,
  Download,
  RefreshCw,
  Mic,
  Search,
  MessageCircle,
  ChevronRight,
  DownloadCloud,
  HardDrive,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AMO_COMMANDS, AMO_PROMPT_TEMPLATES } from '../data/amoHelpData';
import { ModelDownloadManager, type DownloadableModel } from './ModelDownloadManager';
import { voicePersonaService, VOICE_PERSONAS, type VoicePersonaType } from '../services/voicePersonaService';
import type { ChatSession } from '../types';
import type {
  ConversationMemoryRow,
  MemorySummaryRow,
  SeedPackRow,
} from '../services/knowledgeStoreService';

export type SidebarTab =
  | 'chats'
  | 'files'
  | 'brain'
  | 'tools'
  | 'models'
  | 'help'
  | 'settings';

interface ImportedAsset {
  id: string;
  name: string;
  kind: string;
  source?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  currentChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  uploadedDocs: ImportedAsset[];
  isUploadingDoc: boolean;
  onImportDoc: () => void;
  onImportUrl: () => void;
  onWorkspaceSetup: () => void;
  areStarterPacksImported: boolean;
  isImportingStarterPacks: boolean;
  brainMemoryRows: ConversationMemoryRow[];
  brainSummaryRows: MemorySummaryRow[];
  seedPackRows: SeedPackRow[];
  onRefreshNews: () => void;
  onClearCache: () => void;
  onSwitchView: (view: 'chat' | 'webview' | 'terminal' | 'editor' | 'vocabulary' | 'sentence-builder' | 'intent-enhancer') => void;
  onRunCommand: (cmd: string) => void;
  onSaveCurrentPage: () => void;
  onExportBrain: () => void;
  onImportBrain: (file: File) => void;
  onRestoreDefaultBrain: () => void;
  selectedModelId: string;
  availableModels: Array<{ id: string; name: string; description: string; family: string; isCloud?: boolean }>;
  onSelectModel: (modelId: string) => void;
  nativeModelStatus: string;
  nativeModelName: string;
  hasGroqKey: boolean;
  hasGeminiKey: boolean;
  hasOpenAiKey: boolean;
  hasOpenRouterKey: boolean;
  hasMistralKey: boolean;
  groqApiKey: string;
  geminiApiKey: string;
  openAiApiKey: string;
  openRouterApiKey: string;
  mistralApiKey: string;
  onSetGroqKey: (v: string) => void;
  onSetGeminiKey: (v: string) => void;
  onSetOpenAiKey: (v: string) => void;
  onSetOpenRouterKey: (v: string) => void;
  onSetMistralKey: (v: string) => void;
  downloadedModels: string[];
  onSelectNativeModel?: (modelId: string) => void;
  onDownloadModel: (model: DownloadableModel) => void;
  onDeleteModel: (modelId: string) => void;
  onImportModel: () => void;
  isDownloadingModel: boolean;
  onSendPrompt: (text: string) => void;
  isVoiceMode: boolean;
  onToggleVoiceMode: () => void;
  voiceContinuous: boolean;
  onToggleVoiceContinuous: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  isDeepThinkEnabled: boolean;
  onToggleDeepThink: () => void;
  onClearMemory: () => void;
  onExportHistory: () => void;
  onOpenInChrome: () => void;
  appVersion?: string;
}

const RAIL_ITEMS: Array<{
  id: SidebarTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  separator?: boolean;
}> = [
  { id: 'chats',    icon: MessageSquare, label: 'Chats' },
  { id: 'files',    icon: FolderOpen,    label: 'Files' },
  { id: 'brain',    icon: Brain,         label: 'Brain' },
  { id: 'tools',    icon: Zap,           label: 'Tools',    separator: true },
  { id: 'models',   icon: Cpu,           label: 'Models' },
  { id: 'help',     icon: HelpCircle,    label: 'Help',     separator: true },
  { id: 'settings', icon: Settings,      label: 'Settings' },
];

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      {subtitle && <div className="text-[10px] text-white/35 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function ToggleRow({ label, description, value, onToggle, icon: Icon }: { label: string; description?: string; value: boolean; onToggle: () => void; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-white/40 shrink-0" />}
        <div className="min-w-0">
          <div className="text-xs font-medium text-white/80">{label}</div>
          {description && <div className="text-[10px] text-white/35 mt-0.5">{description}</div>}
        </div>
      </div>
      <button onClick={onToggle} className={cn('shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all', value ? 'bg-[#ff4e00] text-white border border-[#ff4e00]' : 'border border-white/15 text-white/50 hover:border-white/25')}>
        {value ? 'On' : 'Off'}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ok' | 'warn' | 'off' | string }) {
  const map: Record<string, string> = { ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', warn: 'bg-amber-500/15 text-amber-300 border-amber-500/20', off: 'bg-white/8 text-white/35 border-white/10' };
  const labels: Record<string, string> = { ok: 'set', warn: 'no key', off: 'off' };
  const cls = map[status] || map.off;
  return <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border', cls)}>{labels[status] || status}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-1 pt-3 pb-1.5">{children}</div>;
}

function ActionItem({ icon: Icon, label, description, badge, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; description?: string; badge?: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2.5 px-2 py-2 rounded-xl border border-transparent text-left transition-all hover:bg-white/[0.05] hover:border-white/10 active:scale-[0.99]', danger && 'hover:border-red-500/20 hover:bg-red-500/8')}>
      <Icon className={cn('w-3.5 h-3.5 shrink-0', danger ? 'text-red-400/60' : 'text-white/40')} />
      <div className="flex-1 min-w-0">
        <div className={cn('text-xs font-medium', danger ? 'text-red-300/80' : 'text-white/80')}>{label}</div>
        {description && <div className="text-[10px] text-white/30 mt-0.5 leading-snug">{description}</div>}
      </div>
      {badge}
    </button>
  );
}

function QuickGrid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-1.5">{children}</div>; }

function QuickBtn({ label, description, onClick, accent, loading = false }: { label: string; description?: string; onClick: () => void; accent?: boolean; loading?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={cn(
        'text-left p-2.5 rounded-xl border transition-all active:scale-[0.98] relative overflow-hidden',
        accent ? 'border-[#ff4e00]/25 bg-[#ff4e00]/8 hover:bg-[#ff4e00]/14' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/18',
        loading && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
        </div>
      )}
      <div className={cn('text-xs font-semibold', accent ? 'text-[#ff8a5c]' : 'text-white/80')}>{label}</div>
      {description && <div className="text-[9px] text-white/30 mt-0.5">{description}</div>}
    </button>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-[11px] text-white/45">{label}</span>
      <span className={cn('text-[11px] font-mono font-medium', accent || 'text-white/80')}>{value}</span>
    </div>
  );
}

function KeyRow({ label, value, onChange, placeholder, hasKey }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; hasKey: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-white/10 bg-black/20">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={hasKey ? 'ok' : 'warn'} />
          <button onClick={() => setVisible(!visible)} className="text-white/25 hover:text-white/60 transition-colors">{visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
        </div>
      </div>
      <input type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#ff4e00]/40 transition-colors" />
    </div>
  );
}

function ChatsPanel(props: SidebarProps) {
  return (
    <>
      <PanelHeader title="Conversations" subtitle="All your chats with Amo" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        <button onClick={props.onNewChat} className="w-full py-2.5 mb-2 rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:border-[#ff4e00]/40 hover:text-white/80 transition-all flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New conversation
        </button>
        {props.chats.map(chat => (
          <div key={chat.id} onClick={() => { props.onSelectChat(chat.id); props.onClose(); }} className={cn('group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all', chat.id === props.currentChatId ? 'bg-white/[0.07] text-[#ff4e00]' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80')}>
            <MessageCircle className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="flex-1 truncate text-xs font-medium">{chat.title}</span>
            <button onClick={e => props.onDeleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function FilesPanel(props: SidebarProps) {
  const workspaceFiles = props.uploadedDocs.filter(d => d.source !== 'system' && d.kind !== 'system');
  const systemFiles = props.uploadedDocs.filter(d => d.source === 'system' || d.kind === 'system');

  return (
    <>
      <PanelHeader title="Workspace files" subtitle="Imported docs and created files" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <SectionLabel>Knowledge imports</SectionLabel>
        <ActionItem icon={HardDrive} label="Superbrain pack" description={props.areStarterPacksImported ? 'Loaded — reasoning engine, builder patterns, conversation guides' : 'Tap to load bundled knowledge'} badge={<StatusBadge status={props.areStarterPacksImported ? 'ok' : 'warn'} />} onClick={props.onWorkspaceSetup} />
        {systemFiles.map(doc => <ActionItem key={doc.id} icon={Brain} label={doc.name} description="System · loaded" badge={<StatusBadge status="ok" />} />)}
        {workspaceFiles.length > 0 && (
          <>
            <SectionLabel>Your files</SectionLabel>
            {workspaceFiles.map(doc => <ActionItem key={doc.id} icon={FileText} label={doc.name} description={doc.kind} />)}
          </>
        )}
        <SectionLabel>Add knowledge</SectionLabel>
        <QuickGrid>
          <QuickBtn label="Import file" description="PDF, TXT, MD" onClick={props.onImportDoc} accent />
          <QuickBtn label="Import URL" description="Fetch any page" onClick={props.onImportUrl} accent />
          <QuickBtn label="Save page" description="Current browser page" onClick={props.onSaveCurrentPage} />
          <QuickBtn label="Sync brain" description="Reload all packs" onClick={props.onWorkspaceSetup} />
        </QuickGrid>
      </div>
    </>
  );
}

function BrainPanel(props: SidebarProps) {
  return (
    <>
      <PanelHeader title="Brain status" subtitle="Memory, knowledge, and cognition" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <SectionLabel>Memory</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 py-2 mb-2">
          <StatRow label="Memory notes" value={props.brainMemoryRows.length} />
          <StatRow label="Summaries" value={props.brainSummaryRows.length} />
          <StatRow label="Permanent facts" value={props.brainMemoryRows.filter(r => r.weight >= 8).length} />
        </div>
        <SectionLabel>Knowledge</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 py-2 mb-2">
          <StatRow label="Seed packs" value={props.seedPackRows.length} />
          <StatRow label="Packs loaded" value={props.seedPackRows.length > 0 ? 'yes' : 'no'} accent={props.seedPackRows.length > 0 ? 'text-emerald-300' : 'text-amber-300'} />
        </div>
        <SectionLabel>Actions</SectionLabel>
        <QuickGrid>
          <QuickBtn label="Refresh news" description="Fetch latest news" onClick={props.onRefreshNews} accent />
          <QuickBtn label="Clear cache" description="Reset web cache" onClick={props.onClearCache} />
        </QuickGrid>
        <SectionLabel>How Amo thinks</SectionLabel>
        <div className="space-y-2">
          {[{ title: 'Universal source of data', desc: 'Atlas, history, reference, live search context' }, { title: 'Single source of truth', desc: 'Identity, core rules, grounded tone, boundaries' }, { title: 'Multiple sources of wisdom', desc: 'Reasoning, empathy, synthesis, decision support' }].map(item => (
            <div key={item.title} className="p-2.5 rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="text-[10px] font-semibold text-white/60 mb-0.5">{item.title}</div>
              <div className="text-[10px] text-white/30 leading-snug">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ToolsPanel(props: SidebarProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleQuickAction = async (action: string, type: 'command' | 'prompt' = 'command') => {
    setLoadingAction(action);
    try {
      if (type === 'command') {
        props.onRunCommand(action);
      } else {
        props.onSendPrompt(action);
      }
      props.onClose();
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  return (
    <>
      <PanelHeader title="Quick actions" subtitle="Tap to activate any tool instantly" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <SectionLabel>Switch view</SectionLabel>
        <QuickGrid>
          <QuickBtn label="Chat" description="Return to main chat" onClick={() => { props.onSwitchView('chat'); props.onClose(); }} />
          <QuickBtn label="Terminal" description="Open shell" onClick={() => { props.onSwitchView('terminal'); props.onClose(); }} accent />
          <QuickBtn label="Browser" description="Open web browser" onClick={() => { props.onSwitchView('webview'); props.onClose(); }} accent />
          <QuickBtn label="Editor" description="Open code editor" onClick={() => { props.onSwitchView('editor'); props.onClose(); }} accent />
          <QuickBtn label="Vocabulary" description="Build vocabulary" onClick={() => { props.onSwitchView('vocabulary'); props.onClose(); }} accent />
          <QuickBtn label="Sentence Builder" description="Build sentences" onClick={() => { props.onSwitchView('sentence-builder'); props.onClose(); }} accent />
          <QuickBtn label="Intent Enhancer" description="Enhance intent prediction" onClick={() => { props.onSwitchView('intent-enhancer'); props.onClose(); }} accent />
        </QuickGrid>
        
        <SectionLabel>Development</SectionLabel>
        <QuickGrid>
          {Capacitor.isNativePlatform() ? (
            <>
              <QuickBtn label="List files" description="Show workspace" loading={loadingAction === 'ls -la'} onClick={() => handleQuickAction('ls -la')} />
              <QuickBtn label="Show path" description="Current directory" loading={loadingAction === 'pwd'} onClick={() => handleQuickAction('pwd')} />
              <QuickBtn label="Disk space" description="Storage info" loading={loadingAction === 'df -h'} onClick={() => handleQuickAction('df -h')} />
              <QuickBtn label="Memory" description="RAM usage" loading={loadingAction === 'free -h'} onClick={() => handleQuickAction('free -h')} />
              <QuickBtn label="Processes" description="Running tasks" loading={loadingAction === 'ps aux | head -20'} onClick={() => handleQuickAction('ps aux | head -20')} />
              <QuickBtn label="Network" description="Check connectivity" loading={loadingAction === 'ping -c 1 google.com'} onClick={() => handleQuickAction('ping -c 1 google.com')} />
            </>
          ) : (
            <>
              <QuickBtn label="Run build" description="npm run build" loading={loadingAction === 'npm run build'} onClick={() => handleQuickAction('npm run build')} />
              <QuickBtn label="Git status" description="Check changes" loading={loadingAction === 'git status'} onClick={() => handleQuickAction('git status')} />
              <QuickBtn label="Install deps" description="npm install" loading={loadingAction === 'npm install'} onClick={() => handleQuickAction('npm install')} />
              <QuickBtn label="Run lint" description="npm run lint" loading={loadingAction === 'npm run lint'} onClick={() => handleQuickAction('npm run lint')} />
              <QuickBtn label="Git log" description="Recent commits" loading={loadingAction === 'git log --oneline -10'} onClick={() => handleQuickAction('git log --oneline -10')} />
              <QuickBtn label="List files" description="Show workspace" loading={loadingAction === 'ls -la amo-workspace/'} onClick={() => handleQuickAction('ls -la amo-workspace/')} />
            </>
          )}
        </QuickGrid>
        
        <SectionLabel>Knowledge & Web</SectionLabel>
        <QuickGrid>
          <QuickBtn label="Save page" description="Import to brain" onClick={props.onSaveCurrentPage} accent />
          <QuickBtn label="Refresh news" description="Update feeds" onClick={props.onRefreshNews} accent />
          <QuickBtn label="Import file" description="Add document" onClick={props.onImportDoc} />
          <QuickBtn label="Clear cache" description="Reset web cache" onClick={props.onClearCache} />
        </QuickGrid>
        
        <SectionLabel>Quick Commands</SectionLabel>
        <div className="space-y-1">
          {[
            { cmd: 'Amo', desc: 'Instant attention call', type: 'prompt' as const },
            { cmd: 'stop', desc: 'Cancel current action', type: 'prompt' as const },
            { cmd: 'new chat', desc: 'Start fresh conversation', type: 'prompt' as const },
            { cmd: 'clear chat', desc: 'Wipe current messages', type: 'prompt' as const },
            { cmd: 'go to terminal', desc: 'Switch to terminal view', type: 'prompt' as const },
            { cmd: 'show my files', desc: 'List workspace files', type: 'command' as const },
          ].map(item => (
            <button 
              key={item.cmd} 
              onClick={() => handleQuickAction(item.cmd, item.type)} 
              disabled={loadingAction === item.cmd}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-all text-left group disabled:opacity-50"
            >
              <code className="text-[11px] font-mono text-[#ff8a5c] bg-[#ff4e00]/10 px-1.5 py-0.5 rounded">{item.cmd}</code>
              <span className="text-[10px] text-white/35">{item.desc}</span>
              {loadingAction === item.cmd && <Loader2 className="w-3 h-3 text-white/40 animate-spin" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ModelsPanel(props: SidebarProps) {
  return (
    <>
      <PanelHeader title="AI models" subtitle="Runtime selection and API keys" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <SectionLabel>Download models</SectionLabel>
        <ModelDownloadManager
          downloadedModels={props.downloadedModels}
          isDownloading={props.isDownloadingModel}
          onDownload={props.onDownloadModel}
          onDelete={props.onDeleteModel}
        />
        <SectionLabel>Active model</SectionLabel>
        <div className="mb-3">
          <select
            value={props.selectedModelId}
            onChange={(e) => {
              props.onSelectModel(e.target.value);
            }}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff4e00]/50 cursor-pointer"
          >
            <optgroup label="Cloud">
              {props.availableModels.filter(m => m.isCloud).map((model) => {
                const hasKey = (model.family === 'groq' && props.hasGroqKey) || 
                              (model.family === 'gemini' && props.hasGeminiKey) || 
                              (model.family === 'openai' && props.hasOpenAiKey) || 
                              (model.family === 'openrouter' && props.hasOpenRouterKey) ||
                              (model.family === 'mistral' && props.hasMistralKey);
                return (
                  <option key={model.id} value={model.id} disabled={!hasKey}>
                    {model.name} {!hasKey && '(needs key)'}
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="Offline">
              {props.availableModels.filter(m => !m.isCloud).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          </select>
          <div className="text-[9px] text-white/30 mt-1.5 ml-1">
            {props.availableModels.find(m => m.id === props.selectedModelId)?.description || 'Local offline model'}
          </div>
        </div>
        <SectionLabel>Cloud providers</SectionLabel>
        <div className="space-y-2">
          <KeyRow label="Groq" value={props.groqApiKey} onChange={props.onSetGroqKey} placeholder="gsk_..." hasKey={props.hasGroqKey} />
          <KeyRow label="Gemini" value={props.geminiApiKey} onChange={props.onSetGeminiKey} placeholder="AIza..." hasKey={props.hasGeminiKey} />
          <KeyRow label="OpenAI" value={props.openAiApiKey} onChange={props.onSetOpenAiKey} placeholder="sk-..." hasKey={props.hasOpenAiKey} />
          <KeyRow label="OpenRouter" value={props.openRouterApiKey} onChange={props.onSetOpenRouterKey} placeholder="sk-or-..." hasKey={props.hasOpenRouterKey} />
          <KeyRow label="Mistral" value={props.mistralApiKey} onChange={props.onSetMistralKey} placeholder="p_..." hasKey={props.hasMistralKey} />
        </div>
      </div>
    </>
  );
}

function HelpPanel(props: SidebarProps) {
  const [tab, setTab] = useState<'commands' | 'templates'>('commands');
  const [search, setSearch] = useState('');

  const filteredCmds = AMO_COMMANDS.filter(c => !search || c.text.toLowerCase().includes(search) || c.description.toLowerCase().includes(search));
  const filteredTpls = AMO_PROMPT_TEMPLATES.filter(t => !search || t.title.toLowerCase().includes(search) || t.prompt.toLowerCase().includes(search));
  const cmdGroups: Record<string, typeof filteredCmds> = {};
  for (const cmd of filteredCmds) { if (!cmdGroups[cmd.section]) cmdGroups[cmd.section] = []; cmdGroups[cmd.section].push(cmd); }

  return (
    <>
      <PanelHeader title="Help" subtitle="Commands and prompt templates" />
      <div className="shrink-0 px-3 pt-2 pb-0">
        <input type="text" value={search} onChange={e => setSearch(e.target.value.toLowerCase())} placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 mb-2" />
        <div className="flex gap-1.5 mb-2">
          <button onClick={() => setTab('commands')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all', tab === 'commands' ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30' : 'text-white/35 border border-white/8')}>Commands</button>
          <button onClick={() => setTab('templates')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all', tab === 'templates' ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30' : 'text-white/35 border border-white/8')}>Templates</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
        {tab === 'commands' && (
          <div className="space-y-3">
            {Object.entries(cmdGroups).map(([section, cmds]) => (
              <div key={section}>
                <SectionLabel>{section}</SectionLabel>
                <div className="space-y-0.5">
                  {cmds.map(cmd => (
                    <button key={cmd.text} onClick={() => { props.onSendPrompt(cmd.text); props.onClose(); }} className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.05] transition-all text-left group">
                      <ChevronRight className="w-3 h-3 text-white/20 mt-0.5 shrink-0 group-hover:text-[#ff4e00] transition-colors" />
                      <div>
                        <div className="text-[11px] font-mono font-medium text-white/75 group-hover:text-white/90 transition-colors">{cmd.text}</div>
                        <div className="text-[9px] text-white/30 mt-0.5">{cmd.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'templates' && (
          <div className="space-y-2">
            {filteredTpls.map(tpl => (
              <div key={tpl.id} className="p-3 rounded-xl border border-white/8 bg-white/[0.02] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[11px] font-semibold text-white/80 leading-snug">{tpl.title}</div>
                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/8 text-white/40">{tpl.category}</span>
                </div>
                <div className="text-[10px] font-mono text-white/45 bg-black/25 rounded-lg px-2.5 py-2 leading-relaxed">{tpl.prompt}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/25 leading-snug flex-1 pr-2">{tpl.why}</span>
                  <button onClick={() => { props.onSendPrompt(tpl.prompt); props.onClose(); }} className="shrink-0 px-2.5 py-1 rounded-lg border border-[#ff4e00]/20 bg-[#ff4e00]/8 text-[9px] font-bold uppercase tracking-widest text-[#ff8a5c] hover:bg-[#ff4e00]/15 transition-all">Use ↗</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SettingsPanel(props: SidebarProps) {
  const { temperature, topP, maxTokens, setTemperature, setTopP, setMaxTokens } = useModelSettingsStore();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activePersona, setActivePersona] = useState(() => voicePersonaService.getActivePersona());
  
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setImportFile(file);
        props.onImportBrain(file);
      }
    };
    input.click();
  };
  
  const handlePersonaChange = (personaId: string) => {
    voicePersonaService.setActivePersona(personaId as VoicePersonaType);
    setActivePersona(voicePersonaService.getActivePersona());
  };
  
  return (
    <>
      <PanelHeader title="Settings" subtitle="App preferences and configuration" />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <SectionLabel>Behaviour</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 divide-y divide-white/[0.06]">
          <ToggleRow label="Voice mode" description="Speak replies automatically" value={props.isVoiceMode} onToggle={props.onToggleVoiceMode} icon={Mic} />
          <ToggleRow label="Continuous voice" description="Keep mic open after requests" value={props.voiceContinuous} onToggle={props.onToggleVoiceContinuous} icon={Mic} />
          <ToggleRow label="Web search" description="Search before answering" value={props.isWebSearchEnabled} onToggle={props.onToggleWebSearch} icon={Search} />
          <ToggleRow label="Deep think" description="More careful reasoning" value={props.isDeepThinkEnabled} onToggle={props.onToggleDeepThink} icon={Brain} />
        </div>
        
        <SectionLabel>Voice Personality</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 py-3 space-y-2">
          <div className="text-[10px] text-white/60 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-3.5 h-3.5 text-[#ff4e00]" />
              <span className="font-semibold">Select Amo's personality mode</span>
            </div>
            <p className="text-white/40">Changes voice characteristics, speech patterns, and response style</p>
          </div>
          <div className="space-y-2">
            {Object.entries(VOICE_PERSONAS).map(([id, persona]) => (
              <button
                key={id}
                onClick={() => handlePersonaChange(id)}
                className={cn(
                  'w-full p-2.5 rounded-lg border text-left transition-all',
                  activePersona.id === id
                    ? 'bg-[#ff4e00]/20 border-[#ff4e00]/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[11px] font-semibold', activePersona.id === id ? 'text-[#ff4e00]' : 'text-white/80')}>
                      {persona.displayName}
                    </div>
                    <div className="text-[9px] text-white/40 mt-0.5 leading-tight">
                      {persona.description}
                    </div>
                  </div>
                  {activePersona.id === id && (
                    <div className="text-[9px] font-bold text-[#ff4e00] mt-0.5 shrink-0">ACTIVE</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <SectionLabel>Model Inference</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 py-3 space-y-4">
          <div>
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>Temperature</span>
              <span>{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-[#ff4e00]"
            />
            <p className="text-[9px] text-white/40 mt-1">Higher = more creative, Lower = more focused</p>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>Top P</span>
              <span>{topP.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={topP}
              onChange={(e) => setTopP(Number(e.target.value))}
              className="w-full accent-[#ff4e00]"
            />
            <p className="text-[9px] text-white/40 mt-1">Nucleus sampling threshold</p>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>Max Tokens</span>
              <span>{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-[#ff4e00]"
            />
            <p className="text-[9px] text-white/40 mt-1">Maximum response length</p>
          </div>
        </div>
        
        <SectionLabel>Brain Data</SectionLabel>
        <div className="space-y-0.5">
          <ActionItem icon={RefreshCw} label="Reset brain" description="Restore Amo's knowledge" onClick={props.onRestoreDefaultBrain} />
          <ActionItem icon={Download} label="Export brain" description="Download backup" onClick={props.onExportBrain} />
          <ActionItem icon={HardDrive} label="Import brain" description="Restore from file" onClick={handleImportClick} />
          <ActionItem icon={Trash2} label="Clear memory" description="Wipe brain data" onClick={props.onClearMemory} danger />
        </div>
        
        <SectionLabel>Tools</SectionLabel>
        <div className="space-y-0.5">
          <ActionItem icon={Download} label="Export chat" description="Save conversations" onClick={props.onExportHistory} />
          <ActionItem icon={RefreshCw} label="Refresh news" description="Get latest news" onClick={props.onRefreshNews} />
          <ActionItem icon={ExternalLink} label="Open in Chrome" description="Use Chrome browser" onClick={props.onOpenInChrome} />
        </div>
        
        <SectionLabel>About</SectionLabel>
        <div className="bg-white/[0.03] rounded-xl border border-white/8 px-3 py-1">
          <StatRow label="App" value="Ask-Amo" />
          <StatRow label="Version" value={props.appVersion || '1.0.0'} />
          <StatRow label="Created by" value="Te Amo Wilson" />
          <StatRow label="Assistant" value="Amo" />
          <StatRow label="Origin" value="Aotearoa NZ" />
        </div>
      </div>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chats');

  const panelMap: Record<SidebarTab, React.ReactNode> = {
    chats:    <ChatsPanel {...props} />,
    files:    <FilesPanel {...props} />,
    brain:    <BrainPanel {...props} />,
    tools:    <ToolsPanel {...props} />,
    models:   <ModelsPanel {...props} />,
    help:     <HelpPanel {...props} />,
    settings: <SettingsPanel {...props} />,
  };

  return (
    <>
      {props.isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" onClick={props.onClose} aria-hidden="true" />}
      <div className={cn('fixed inset-y-0 left-0 z-50 flex transform transition-transform duration-300 shadow-2xl', props.isOpen ? 'translate-x-0' : '-translate-x-full')} style={{ width: '19rem' }}>
        <div className="w-13 flex flex-col items-center py-3 gap-1 bg-black/60 border-r border-white/8 shrink-0" style={{ width: '52px' }}>
          <button onClick={props.onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all mb-2"><X className="w-3.5 h-3.5" /></button>
           <div className="flex flex-col space-y-1 w-full">
             {RAIL_ITEMS.map((item, index) => (
               <>
                 {item.separator && index > 0 && <div className="h-px bg-white/10 my-1" />}
                 <button onClick={() => setActiveTab(item.id)} title={item.label} className={cn('w-full h-12 flex items-center justify-center rounded-xl transition-all', activeTab === item.id ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.05] border border-transparent')}>
                   <item.icon className="w-6 h-6" />
                 </button>
               </>
             ))}
           </div>
        </div>
        <div className="flex-1 flex flex-col bg-[#050505] border-r border-white/10 overflow-hidden">
          {panelMap[activeTab]}
        </div>
      </div>
    </>
  );
}
