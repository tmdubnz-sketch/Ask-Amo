import React, { useState, useEffect } from 'react';
import { sentenceBuilderService, type SentenceTemplate, type WeightedWordTable, type SentenceGenerationRequest, type GeneratedSentence, type CustomRule } from '../services/sentenceBuilderService';
import {
  Brain,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  Settings,
  BarChart3,
  Zap,
  Target,
  Sliders,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Upload,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Star,
  TrendingUp,
  Hash,
  Type,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SentenceBuilderProps {
  onClose?: () => void;
}

export function SentenceBuilder({ onClose }: SentenceBuilderProps) {
  const [activeTab, setActiveTab] = useState<'generator' | 'templates' | 'word-tables' | 'rules' | 'stats'>('generator');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  // Generator state
  const [generationRequest, setGenerationRequest] = useState<SentenceGenerationRequest>({
    intent: '',
    style: 'casual',
    complexity: 'moderate',
    length: 'medium'
  });
  const [generatedSentences, setGeneratedSentences] = useState<GeneratedSentence[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<GeneratedSentence | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<SentenceTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SentenceTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  
  // Word tables state
  const [wordTables, setWordTables] = useState<WeightedWordTable[]>([]);
  const [editingWordTable, setEditingWordTable] = useState<WeightedWordTable | null>(null);
  const [showWordTableEditor, setShowWordTableEditor] = useState(false);
  
  // Rules state
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  
  // Stats state
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, wordTablesData, statsData] = await Promise.all([
        sentenceBuilderService.getTemplates(),
        sentenceBuilderService.getWordTables(),
        sentenceBuilderService.getStats()
      ]);
      
      setTemplates(templatesData);
      setWordTables(wordTablesData);
      setStats(statsData);
    } catch (error) {
      setStatus('Failed to load data');
      console.error(error);
    }
  };

  const handleGenerateSentence = async () => {
    if (!generationRequest.intent) {
      setStatus('Please enter an intent for the sentence');
      return;
    }

    setLoading(true);
    setStatus('Generating sentence...');
    
    try {
      const sentence = await sentenceBuilderService.generateSentence(generationRequest);
      setGeneratedSentences(prev => [sentence, ...prev.slice(0, 9)]); // Keep last 10
      setStatus(`Generated: "${sentence.text}"`);
      setSelectedSentence(sentence);
    } catch (error) {
      setStatus('Failed to generate sentence');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Omit<SentenceTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'successRate'>) => {
    try {
      setLoading(true);
      if (editingTemplate) {
        await sentenceBuilderService.updateTemplate(editingTemplate.id, template);
        setStatus('Template updated successfully');
      } else {
        await sentenceBuilderService.createTemplate(template);
        setStatus('Template created successfully');
      }
      
      await loadData();
      setShowTemplateEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      setStatus('Failed to save template');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await sentenceBuilderService.deleteTemplate(templateId);
      setStatus('Template deleted successfully');
      await loadData();
    } catch (error) {
      setStatus('Failed to delete template');
      console.error(error);
    }
  };

  const handleSaveWordTable = async (wordTable: WeightedWordTable) => {
    try {
      setLoading(true);
      await sentenceBuilderService.saveWordTable(wordTable);
      setStatus('Word table saved successfully');
      await loadData();
      setShowWordTableEditor(false);
      setEditingWordTable(null);
    } catch (error) {
      setStatus('Failed to save word table');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard');
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] rounded-[1.75rem] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#ff4e00]" />
          <h2 className="text-sm font-semibold text-white/90">Sentence Builder</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-white/40 hover:text-white/60 transition-colors"
            title="How to use Sentence Builder"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white/60 transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 shrink-0">
        {[
          { id: 'generator', label: 'Generator', icon: Zap },
          { id: 'templates', label: 'Templates', icon: Type },
          { id: 'word-tables', label: 'Word Tables', icon: MessageSquare },
          { id: 'rules', label: 'Rules', icon: Settings },
          { id: 'stats', label: 'Statistics', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-[#ff4e00]/20 text-[#ff4e00] border border-[#ff4e00]/30'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      {/* Help Section */}
      {showHelp && (
        <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
          <h3 className="text-sm font-semibold text-white/90 mb-3">How to Use Sentence Builder</h3>
          <div className="space-y-3 text-xs text-white/70">
            <div>
              <strong className="text-white/80">1. Generator:</strong> Create sentences by describing what you want to say (e.g., "I need to order coffee"). The AI will generate variations.
            </div>
            <div>
              <strong className="text-white/80">2. Templates:</strong> Create sentence patterns with placeholders (e.g., "I want to [action] a [item]"). These can be reused with different words.
            </div>
            <div>
              <strong className="text-white/80">3. Word Tables:</strong> Organize words by category (verbs, nouns, adjectives). Use vocabulary from the Vocabulary Builder!
            </div>
            <div>
              <strong className="text-white/80">4. Rules:</strong> Set grammar and style rules (e.g., "always use formal tone" or "avoid slang").
            </div>
            <div>
              <strong className="text-white/80">5. Statistics:</strong> Track your sentence diversity and usage patterns.
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <strong>💡 Tip:</strong> Combine with Vocabulary Builder words to create personalized practice sentences!
            </div>
          </div>
        </div>
      )}

      {status && (
          <div className={cn(
            'mb-4 p-3 rounded-lg text-xs',
            status.includes('Failed') ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
            status.includes('Generated') || status.includes('saved') || status.includes('updated') || status.includes('deleted')
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
          )}>
            {status}
          </div>
        )}

        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* Generation Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Sentence Generation
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Intent</label>
                  <input
                    type="text"
                    value={generationRequest.intent}
                    onChange={(e) => setGenerationRequest(prev => ({ ...prev, intent: e.target.value }))}
                    placeholder="e.g., greet user, ask question, make statement..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Style</label>
                  <select
                    value={generationRequest.style}
                    onChange={(e) => setGenerationRequest(prev => ({ ...prev, style: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="formal">Formal</option>
                    <option value="informal">Informal</option>
                    <option value="technical">Technical</option>
                    <option value="creative">Creative</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Complexity</label>
                  <select
                    value={generationRequest.complexity}
                    onChange={(e) => setGenerationRequest(prev => ({ ...prev, complexity: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Length</label>
                  <select
                    value={generationRequest.length}
                    onChange={(e) => setGenerationRequest(prev => ({ ...prev, length: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleGenerateSentence}
                disabled={loading || !generationRequest.intent}
                className="w-full py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Generate Sentence
              </button>
            </div>

            {/* Generated Sentences */}
            {generatedSentences.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Generated Sentences
                </h3>
                <div className="space-y-2">
                  {generatedSentences.map((sentence, index) => (
                    <div
                      key={sentence.id}
                      className={cn(
                        'p-3 rounded-lg border transition-all cursor-pointer',
                        selectedSentence?.id === sentence.id
                          ? 'border-[#ff4e00]/30 bg-[#ff4e00]/5'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                      )}
                      onClick={() => setSelectedSentence(sentence)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-white/80 mb-1">{sentence.text}</p>
                          <div className="flex items-center gap-2 text-[9px] text-white/40">
                            <span>Confidence: {sentence.confidence}%</span>
                            <span>•</span>
                            <span>Template: {templates.find(t => t.id === sentence.templateId)?.name || 'Unknown'}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(sentence.text);
                          }}
                          className="text-white/30 hover:text-white/60 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Alternatives */}
                      {sentence.alternatives && sentence.alternatives.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="text-[9px] text-white/40 mb-1">Alternatives:</div>
                          <div className="space-y-1">
                            {sentence.alternatives.map((alt, altIndex) => (
                              <div key={altIndex} className="text-[10px] text-white/30 pl-2">
                                • {alt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Sentence Details */}
            {selectedSentence && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  Sentence Details
                </h3>
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3 space-y-2">
                  <div className="text-xs text-white/80">{selectedSentence.text}</div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-white/40">
                    <div>Template: {templates.find(t => t.id === selectedSentence.templateId)?.name}</div>
                    <div>Confidence: {selectedSentence.confidence}%</div>
                    <div>Style: {selectedSentence.metadata.style}</div>
                    <div>Complexity: {selectedSentence.metadata.complexity}</div>
                    <div>Length: {selectedSentence.metadata.length}</div>
                    <div>Generation Time: {selectedSentence.metadata.generationTime}ms</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <Type className="w-3.5 h-3.5" />
                Sentence Templates
              </h3>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateEditor(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Template
              </button>
            </div>
            
            <div className="space-y-2">
              {templates.map(template => (
                <div key={template.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-white/80">{template.name}</h4>
                      <p className="text-[10px] text-white/30 mb-2">{template.description}</p>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span className="px-2 py-0.5 rounded bg-white/5">{template.category}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5">{template.difficulty}</span>
                        <span>Weight: {template.weight}</span>
                        <span>Usage: {template.usageCount}</span>
                        <span>Success: {template.successRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateEditor(true);
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Structure preview */}
                  <div className="text-[9px] text-white/30">
                    <div className="mb-1">Structure:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.structure.map((struct, index) => (
                        <span key={struct.id} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                          {struct.type} {struct.required ? '*' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Examples */}
                  {template.examples.length > 0 && (
                    <div className="mt-2 text-[9px] text-white/30">
                      <div className="mb-1">Examples:</div>
                      <div className="space-y-0.5">
                        {template.examples.map((example, index) => (
                          <div key={index} className="pl-2">• {example}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'word-tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Weighted Word Tables
              </h3>
              <button
                onClick={() => {
                  setEditingWordTable(null);
                  setShowWordTableEditor(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Word Table
              </button>
            </div>
            
            <div className="space-y-2">
              {wordTables.map(table => (
                <div key={table.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-white/80">{table.name}</h4>
                      <p className="text-[10px] text-white/30 mb-2">{table.description}</p>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span className="px-2 py-0.5 rounded bg-white/5">{table.category}</span>
                        <span>{table.words.length} words</span>
                        <span>Total weight: {table.totalWeight}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingWordTable(table);
                          setShowWordTableEditor(true);
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Word preview */}
                  <div className="text-[9px] text-white/30">
                    <div className="mb-1">Sample words:</div>
                    <div className="flex flex-wrap gap-1">
                      {table.words.slice(0, 10).map((word, index) => (
                        <span key={word.id} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                          {word.word} ({word.weight})
                        </span>
                      ))}
                      {table.words.length > 10 && <span className="text-white/20">...{table.words.length - 10} more</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Custom Rules
            </h3>
            <div className="text-[10px] text-white/30">
              Custom rules allow you to modify sentence generation behavior based on conditions.
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Statistics
            </h3>
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="text-[10px] text-white/40 mb-1">Total Templates</div>
                  <div className="text-lg font-semibold text-white/80">{stats.totalTemplates}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="text-[10px] text-white/40 mb-1">Total Words</div>
                  <div className="text-lg font-semibold text-white/80">{stats.totalWords}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="text-[10px] text-white/40 mb-1">Average Weight</div>
                  <div className="text-lg font-semibold text-white/80">{stats.averageWeight.toFixed(1)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="text-[10px] text-white/40 mb-1">Success Rate</div>
                  <div className="text-lg font-semibold text-white/80">{stats.successRate.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Word Table Editor Modal */}
      {showWordTableEditor && (
        <WordTableEditor
          wordTable={editingWordTable}
          onSave={handleSaveWordTable}
          onCancel={() => {
            setShowWordTableEditor(false);
            setEditingWordTable(null);
          }}
        />
      )}
    </div>
  );
}

// Template Editor Component
function TemplateEditor({ template, onSave, onCancel }: { template: SentenceTemplate | null; onSave: (template: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    weight: template?.weight || 50,
    category: template?.category || 'custom',
    difficulty: template?.difficulty || 'basic',
    tags: template?.tags?.join(', ') || '',
    structure: template?.structure || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      structure: formData.structure,
      examples: template?.examples || []
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#050505] rounded-[1.75rem] border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
              >
                <option value="greeting">Greeting</option>
                <option value="question">Question</option>
                <option value="statement">Statement</option>
                <option value="command">Command</option>
                <option value="response">Response</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
              >
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Weight</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 50 }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 resize-none h-16"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., formal, casual, technical"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all"
            >
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Word Table Editor Component
function WordTableEditor({ wordTable, onSave, onCancel }: { wordTable: WeightedWordTable | null; onSave: (wordTable: WeightedWordTable) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    id: wordTable?.id || '',
    name: wordTable?.name || '',
    description: wordTable?.description || '',
    category: wordTable?.category || 'custom',
    words: wordTable?.words || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalWeight = formData.words.reduce((sum, w) => sum + w.weight, 0);
    onSave({
      ...formData,
      totalWeight,
      lastUpdated: Date.now()
    });
  };

  const addWord = () => {
    setFormData(prev => ({
      ...prev,
      words: [...prev.words, {
        id: `word-${Date.now()}`,
        word: '',
        weight: 50,
        frequency: 0,
        partOfSpeech: 'noun',
        difficulty: 'basic',
        tags: []
      }]
    }));
  };

  const updateWord = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      words: prev.words.map((word, i) => 
        i === index ? { ...word, [field]: value } : word
      )
    }));
  };

  const removeWord = (index: number) => {
    setFormData(prev => ({
      ...prev,
      words: prev.words.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#050505] rounded-[1.75rem] border border-white/10 w-full max-w-3xl max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {wordTable ? 'Edit Word Table' : 'Create Word Table'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
              >
                <option value="nouns">Nouns</option>
                <option value="verbs">Verbs</option>
                <option value="adjectives">Adjectives</option>
                <option value="adverbs">Adverbs</option>
                <option value="prepositions">Prepositions</option>
                <option value="conjunctions">Conjunctions</option>
                <option value="articles">Articles</option>
                <option value="interjections">Interjections</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 resize-none h-16"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-white/40">Words ({formData.words.length})</label>
              <button
                type="button"
                onClick={addWord}
                className="px-3 py-1 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Word
              </button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {formData.words.map((word, index) => (
                <div key={word.id} className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-2">
                  <input
                    type="text"
                    value={word.word}
                    onChange={(e) => updateWord(index, 'word', e.target.value)}
                    placeholder="Word"
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={word.weight}
                    onChange={(e) => updateWord(index, 'weight', parseInt(e.target.value) || 0)}
                    placeholder="Weight"
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                  />
                  <select
                    value={word.partOfSpeech}
                    onChange={(e) => updateWord(index, 'partOfSpeech', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="noun">Noun</option>
                    <option value="verb">Verb</option>
                    <option value="adjective">Adjective</option>
                    <option value="adverb">Adverb</option>
                    <option value="preposition">Preposition</option>
                    <option value="conjunction">Conjunction</option>
                    <option value="article">Article</option>
                    <option value="interjection">Interjection</option>
                    <option value="custom">Custom</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeWord(index)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all"
            >
              Save Word Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
