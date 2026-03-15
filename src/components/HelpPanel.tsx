// src/components/HelpPanel.tsx
//
// In-app interactive help system.
// Shows all commands and prompt templates with search, filter, and one-tap send.
// Add to the sidebar Tools tab and to the Cognition settings section.
//
// Usage:
//   import { HelpPanel } from './HelpPanel';
//   <HelpPanel onSend={(text) => { setInput(text); handleSend(); }} />

import React, { useState, useMemo } from 'react';
import { AMO_COMMANDS, AMO_PROMPT_TEMPLATES, type AmoCommand, type AmoPromptTemplate } from '../data/amoHelpData';
import { cn } from '../lib/utils';

interface HelpPanelProps {
  onSend: (text: string) => void;
}

type HelpTab = 'commands' | 'templates';

const CATEGORY_LABELS: Record<string, string> = {
  nav: 'Navigate',
  voice: 'Voice',
  ide: 'IDE',
  knowledge: 'Knowledge',
  web: 'Web',
  chat: 'Chat',
};

const CATEGORY_COLORS: Record<string, string> = {
  nav:       'bg-sky-500/10 text-sky-300 border-sky-500/20',
  voice:     'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  ide:       'bg-amber-500/10 text-amber-300 border-amber-500/20',
  knowledge: 'bg-white/10 text-white/60 border-white/10',
  web:       'bg-teal-500/10 text-teal-300 border-teal-500/20',
  chat:      'bg-[#ff4e00]/10 text-[#ff8a5c] border-[#ff4e00]/20',
};

const TPL_COLORS: Record<string, string> = {
  IDE:       'bg-amber-500/10 text-amber-300',
  Web:       'bg-teal-500/10 text-teal-300',
  Knowledge: 'bg-sky-500/10 text-sky-300',
  Voice:     'bg-emerald-500/10 text-emerald-300',
  Chat:      'bg-[#ff4e00]/10 text-[#ff8a5c]',
  Terminal:  'bg-white/10 text-white/50',
};

export function HelpPanel({ onSend }: HelpPanelProps) {
  const [tab, setTab] = useState<HelpTab>('commands');
  const [search, setSearch] = useState('');
  const [tplCat, setTplCat] = useState<string>('all');

  // ── Commands ───────────────────────────────────────────────────────────────

  const groupedCommands = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = AMO_COMMANDS.filter(c =>
      !q || c.text.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
    const groups: Record<string, AmoCommand[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.section]) groups[cmd.section] = [];
      groups[cmd.section].push(cmd);
    }
    return groups;
  }, [search]);

  // ── Templates ──────────────────────────────────────────────────────────────

  const tplCategories = useMemo(() => {
    return ['all', ...new Set(AMO_PROMPT_TEMPLATES.map(t => t.category))];
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase();
    return AMO_PROMPT_TEMPLATES.filter(t => {
      const matchCat = tplCat === 'all' || t.category === tplCat;
      const matchQ = !q || t.title.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
      return matchCat && matchQ;
    });
  }, [search, tplCat]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-2 p-3 border-b border-white/10">
        <button
          onClick={() => setTab('commands')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
            tab === 'commands'
              ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30'
              : 'text-white/40 border border-white/10 hover:text-white/70'
          )}
        >
          Commands
        </button>
        <button
          onClick={() => setTab('templates')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
            tab === 'templates'
              ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30'
              : 'text-white/40 border border-white/10 hover:text-white/70'
          )}
        >
          Templates
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'commands' ? 'Search commands...' : 'Search templates...'}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#ff4e00]/40"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">

        {/* ── COMMANDS TAB ──────────────────────────────────────────────────── */}
        {tab === 'commands' && (
          <>
            <p className="text-[10px] text-white/30 leading-relaxed">
              Tap any command to send it instantly.
            </p>
            {Object.entries(groupedCommands).map(([section, cmds]) => (
              <div key={section}>
                <div className="text-[9px] uppercase tracking-widest text-white/25 font-medium mb-2 px-1">
                  {section}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {cmds.map(cmd => (
                    <button
                      key={cmd.text}
                      onClick={() => onSend(cmd.text)}
                      className="text-left p-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-medium text-white/90 group-hover:text-[#ff8a5c] transition-colors">
                          {cmd.text}
                        </span>
                        <span className={cn(
                          'shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border',
                          CATEGORY_COLORS[cmd.category] || CATEGORY_COLORS.chat
                        )}>
                          {CATEGORY_LABELS[cmd.category] || cmd.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/35 leading-snug">
                        {cmd.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedCommands).length === 0 && (
              <p className="text-xs text-white/30 text-center py-8">No commands match your search.</p>
            )}
          </>
        )}

        {/* ── TEMPLATES TAB ─────────────────────────────────────────────────── */}
        {tab === 'templates' && (
          <>
            <p className="text-[10px] text-white/30 leading-relaxed">
              Tap "Use" to send a template. Replace words in [brackets] with your details.
            </p>

            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap">
              {tplCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTplCat(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all border',
                    tplCat === cat
                      ? 'bg-white/10 text-white border-white/20'
                      : 'text-white/30 border-white/10 hover:text-white/60'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white/90 leading-snug">
                      {tpl.title}
                    </span>
                    <span className={cn(
                      'shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded',
                      TPL_COLORS[tpl.category] || 'bg-white/10 text-white/50'
                    )}>
                      {tpl.category}
                    </span>
                  </div>

                  <div className="bg-black/30 rounded-xl p-3 font-mono text-[10px] text-white/60 leading-relaxed">
                    {tpl.prompt}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/30 leading-snug flex-1">
                      {tpl.why}
                    </span>
                    <button
                      onClick={() => onSend(tpl.prompt)}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-[#ff4e00]/25 bg-[#ff4e00]/8 text-[10px] font-bold uppercase tracking-widest text-[#ff8a5c] hover:bg-[#ff4e00]/15 transition-all"
                    >
                      Use ↗
                    </button>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <p className="text-xs text-white/30 text-center py-8">No templates match.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
