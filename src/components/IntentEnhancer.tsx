import React, { useState, useEffect } from 'react';
import { intentEnhancementService, type Keyword, type Tag, type IntentPattern, type IntentPrediction, type IntentEnhancementRequest } from '../services/intentEnhancementService';
import {
  Brain,
  Target,
  Zap,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  Settings,
  BarChart3,
  TrendingUp,
  Hash,
  Tag as TagIcon,
  MessageSquare,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Sliders,
  Gauge,
  Lightbulb,
  Database,
  Cpu,
  Users,
  Clock,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IntentEnhancerProps {
  onClose?: () => void;
}

export function IntentEnhancer({ onClose }: IntentEnhancerProps) {
  const [activeTab, setActiveTab] = useState<'predictor' | 'keywords' | 'tags' | 'patterns' | 'analytics'>('predictor');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  // Predictor state
  const [testInput, setTestInput] = useState('');
  const [prediction, setPrediction] = useState<IntentPrediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<IntentPrediction[]>([]);
  
  // Keywords state
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [showKeywordEditor, setShowKeywordEditor] = useState(false);
  
  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  
  // Patterns state
  const [patterns, setPatterns] = useState<IntentPattern[]>([]);
  const [editingPattern, setEditingPattern] = useState<IntentPattern | null>(null);
  const [showPatternEditor, setShowPatternEditor] = useState(false);
  
  // Analytics state
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keywordsData, tagsData, patternsData, statsData] = await Promise.all([
        intentEnhancementService.getKeywords(),
        intentEnhancementService.getTags(),
        intentEnhancementService.getPatterns(),
        intentEnhancementService.getStats()
      ]);
      
      setKeywords(keywordsData);
      setTags(tagsData);
      setPatterns(patternsData);
      setStats(statsData);
    } catch (error) {
      setStatus('Failed to load data');
      console.error(error);
    }
  };

  const handlePredictIntent = async () => {
    if (!testInput.trim()) {
      setStatus('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setStatus('Analyzing intent...');
    
    try {
      const request: IntentEnhancementRequest = {
        userInput: testInput,
        context: 'test',
        userPreferences: {
          commonIntents: ['request_help', 'create_content', 'learn_something'],
          preferredComplexity: 'moderate',
          communicationStyle: 'casual',
          domainExpertise: ['general'],
          avoidIntents: []
        },
        sessionContext: {
          conversationStage: 'middle',
          userMood: 'neutral',
          timeOfDay: 'afternoon',
          deviceType: 'desktop',
          previousQueries: []
        }
      };
      
      const result = await intentEnhancementService.predictIntent(request);
      setPrediction(result);
      setPredictionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
      setStatus(`Intent predicted: ${result.intent} (${result.confidence}% confidence)`);
    } catch (error) {
      setStatus('Failed to predict intent');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeyword = async (keyword: Omit<Keyword, 'id' | 'frequency' | 'successRate' | 'lastUsed' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      if (editingKeyword) {
        // Update existing keyword
        setStatus('Keyword updated successfully');
      } else {
        await intentEnhancementService.addKeyword(keyword);
        setStatus('Keyword added successfully');
      }
      
      await loadData();
      setShowKeywordEditor(false);
      setEditingKeyword(null);
    } catch (error) {
      setStatus('Failed to save keyword');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTag = async (tag: Omit<Tag, 'id' | 'frequency' | 'successRate' | 'lastUsed' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      await intentEnhancementService.addTag(tag);
      setStatus('Tag added successfully');
      await loadData();
      setShowTagEditor(false);
      setEditingTag(null);
    } catch (error) {
      setStatus('Failed to save tag');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async (pattern: Omit<IntentPattern, 'id'>) => {
    try {
      setLoading(true);
      await intentEnhancementService.addPattern(pattern);
      setStatus('Pattern added successfully');
      await loadData();
      setShowPatternEditor(false);
      setEditingPattern(null);
    } catch (error) {
      setStatus('Failed to save pattern');
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
          <h2 className="text-sm font-semibold text-white/90">Intent Enhancer</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-white/40 hover:text-white/60 transition-colors"
            title="How to use Intent Enhancer"
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
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex gap-1 flex-shrink-0">
        {[
          { id: 'predictor', label: 'Predictor', icon: Target },
          { id: 'keywords', label: 'Keywords', icon: Hash },
          { id: 'tags', label: 'Tags', icon: TagIcon },
          { id: 'patterns', label: 'Patterns', icon: MessageSquare },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      {/* Help Section */}
      {showHelp && (
        <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
          <h3 className="text-sm font-semibold text-white/90 mb-3">How to Use Intent Enhancer</h3>
          <div className="space-y-3 text-xs text-white/70">
            <div>
              <strong className="text-white/80">1. Predictor:</strong> Test how Amo understands your requests. Type something and see what intent it detects.
            </div>
            <div>
              <strong className="text-white/80">2. Keywords:</strong> Add important words that trigger specific responses (e.g., "create" → code generation).
            </div>
            <div>
              <strong className="text-white/80">3. Tags:</strong> Group related keywords together (e.g., "greeting", "coding", "help").
            </div>
            <div>
              <strong className="text-white/80">4. Patterns:</strong> Create advanced patterns for complex requests using regular expressions.
            </div>
            <div>
              <strong className="text-white/80">5. Analytics:</strong> See which intents are most common and how well they're being recognized.
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <strong>💡 Tip:</strong> This helps Amo better understand what you want, especially for complex or specific requests!
            </div>
          </div>
        </div>
      )}

      {status && (
          <div className={cn(
            'mb-4 p-3 rounded-lg text-xs',
            status.includes('Failed') ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
            status.includes('predicted') || status.includes('added') || status.includes('updated')
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
          )}>
            {status}
          </div>
        )}

        {activeTab === 'predictor' && (
          <div className="space-y-6">
            {/* Test Input */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Intent Prediction Test
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Test Input</label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter text to analyze for intent prediction..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 resize-none h-20"
                  />
                </div>
                
                <button
                  onClick={handlePredictIntent}
                  disabled={loading || !testInput.trim()}
                  className="w-full py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Predict Intent
                </button>
              </div>
            </div>

            {/* Prediction Result */}
            {prediction && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" />
                  Prediction Result
                </h3>
                
                <div className="bg-white/[0.03] rounded-lg border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white/80">{prediction.intent}</div>
                      <div className="text-[10px] text-white/40">Predicted Intent</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#ff8a5c]">{prediction.confidence}%</div>
                      <div className="text-[10px] text-white/40">Confidence</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div 
                        className="bg-[#ff4e00] h-2 rounded-full transition-all"
                        style={{ width: `${prediction.confidence}%` }}
                      />
                    </div>
                    <Gauge className="w-4 h-4 text-[#ff4e00]" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/40">Context:</div>
                    <div className="text-xs text-white/60">{prediction.context}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/40">Reasoning:</div>
                    <div className="text-xs text-white/60">{prediction.reasoning}</div>
                  </div>
                  
                  {/* Matched Keywords */}
                  {prediction.matchedKeywords.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-white/40">Matched Keywords:</div>
                      <div className="flex flex-wrap gap-1">
                        {prediction.matchedKeywords.map((kw, index) => (
                          <span key={index} className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 text-[10px] border border-blue-500/20">
                            {kw.keyword} ({kw.weight})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Matched Tags */}
                  {prediction.matchedTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-white/40">Matched Tags:</div>
                      <div className="flex flex-wrap gap-1">
                        {prediction.matchedTags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 rounded bg-green-500/10 text-green-300 text-[10px] border border-green-500/20">
                            {tag.tag} ({tag.weight})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Alternatives */}
                  {prediction.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-white/40">Alternative Intents:</div>
                      <div className="space-y-1">
                        {prediction.alternatives.map((alt, index) => (
                          <div key={index} className="flex items-center justify-between text-xs text-white/60">
                            <span>{alt.intent}</span>
                            <span className="text-white/40">{alt.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => copyToClipboard(prediction.intent)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white/80 transition-all text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Intent
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prediction History */}
            {predictionHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Prediction History
                </h3>
                <div className="space-y-2">
                  {predictionHistory.map((pred, index) => (
                    <div
                      key={pred.id || index}
                      className="bg-white/[0.03] rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.05] transition-all"
                      onClick={() => setPrediction(pred)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-medium text-white/80">{pred.intent}</div>
                        <div className="text-[10px] text-white/40">{pred.confidence}%</div>
                      </div>
                      <div className="text-[10px] text-white/30 truncate">
                        {pred.reasoning.split(';')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                Intent Keywords
              </h3>
              <button
                onClick={() => {
                  setEditingKeyword(null);
                  setShowKeywordEditor(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Keyword
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {keywords.map(keyword => (
                <div key={keyword.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-medium text-white/80">{keyword.keyword}</h4>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-white/40">
                          {keyword.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span>Weight: {keyword.weight}</span>
                        <span>Frequency: {keyword.frequency}</span>
                        <span>Success: {keyword.successRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingKeyword(keyword);
                          setShowKeywordEditor(true);
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Synonyms */}
                  {keyword.synonyms.length > 0 && (
                    <div className="text-[9px] text-white/30">
                      <div className="mb-1">Synonyms:</div>
                      <div className="flex flex-wrap gap-1">
                        {keyword.synonyms.map((syn, index) => (
                          <span key={index} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Intent Mapping */}
                  {keyword.intentMapping.length > 0 && (
                    <div className="text-[9px] text-white/30">
                      <div className="mb-1">Intent Mapping:</div>
                      <div className="space-y-1">
                        {keyword.intentMapping.map((mapping, index) => (
                          <div key={index} className="pl-2">
                            • {mapping.intent} ({mapping.confidence}%)
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

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5" />
                Intent Tags
              </h3>
              <button
                onClick={() => {
                  setEditingTag(null);
                  setShowTagEditor(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Tag
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-medium text-white/80">{tag.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-white/40">
                          {tag.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span>Weight: {tag.weight}</span>
                        <span>Frequency: {tag.frequency}</span>
                        <span>Success: {tag.successRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setShowTagEditor(true);
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Keywords */}
                  {tag.keywords.length > 0 && (
                    <div className="text-[9px] text-white/30">
                      <div className="mb-1">Keywords:</div>
                      <div className="flex flex-wrap gap-1">
                        {tag.keywords.map((kw, index) => (
                          <span key={index} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Combinations */}
                  {tag.combinations.length > 0 && (
                    <div className="text-[9px] text-white/30">
                      <div className="mb-1">Combinations:</div>
                      <div className="space-y-1">
                        {tag.combinations.map((comb, index) => (
                          <div key={index} className="pl-2">
                            • {comb.intent} ({comb.confidence}%)
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

        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Intent Patterns
              </h3>
              <button
                onClick={() => {
                  setEditingPattern(null);
                  setShowPatternEditor(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Pattern
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {patterns.map(pattern => (
                <div key={pattern.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-white/80 mb-1">{pattern.intent}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-white/40">
                        <span>Confidence: {pattern.confidence}%</span>
                        <span>Weight: {pattern.weight}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPattern(pattern);
                          setShowPatternEditor(true);
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-[9px] text-white/30">
                    <div className="mb-1">Pattern:</div>
                    <div className="font-mono bg-black/20 p-1 rounded text-white/60">
                      {pattern.pattern}
                    </div>
                  </div>
                  
                  {pattern.examples.length > 0 && (
                    <div className="text-[9px] text-white/30 mt-2">
                      <div className="mb-1">Examples:</div>
                      <div className="space-y-0.5">
                        {pattern.examples.map((example, index) => (
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

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics & Statistics
            </h3>
            
            {stats && (
              <div className="space-y-4">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                    <div className="text-[10px] text-white/40 mb-1">Total Predictions</div>
                    <div className="text-lg font-semibold text-white/80">{stats.totalPredictions}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                    <div className="text-[10px] text-white/40 mb-1">Accuracy Rate</div>
                    <div className="text-lg font-semibold text-[#ff8a5c]">{stats.accuracyRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                    <div className="text-[10px] text-white/40 mb-1">Avg Confidence</div>
                    <div className="text-lg font-semibold text-white/80">{stats.averageConfidence.toFixed(1)}%</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                    <div className="text-[10px] text-white/40 mb-1">Improvement Trend</div>
                    <div className="text-lg font-semibold text-green-400">+{stats.improvementTrend.toFixed(1)}%</div>
                  </div>
                </div>
                
                {/* Top Intents */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-white/60">Top Intents</h4>
                  <div className="space-y-1">
                    {stats.topIntents.map((intent: any, index: number) => (
                      <div key={intent.intent} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-white/40">#{index + 1}</span>
                          <span className="text-xs text-white/80">{intent.intent}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-white/40">
                          <span>{intent.count} uses</span>
                          <span>{intent.accuracy.toFixed(1)}% acc</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Top Keywords */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-white/60">Top Keywords</h4>
                  <div className="space-y-1">
                    {stats.topKeywords.map((kw: any, index: number) => (
                      <div key={kw.keyword} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-white/40">#{index + 1}</span>
                          <span className="text-xs text-white/80">{kw.keyword}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-white/40">
                          <span>{kw.frequency} uses</span>
                          <span>{kw.successRate.toFixed(1)}% success</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Top Tags */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-white/60">Top Tags</h4>
                  <div className="space-y-1">
                    {stats.topTags.map((tag: any, index: number) => (
                      <div key={tag.tag} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-white/40">#{index + 1}</span>
                          <span className="text-xs text-white/80">{tag.tag}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-white/40">
                          <span>{tag.frequency} uses</span>
                          <span>{tag.successRate.toFixed(1)}% success</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyword Editor Modal */}
      {showKeywordEditor && (
        <KeywordEditor
          keyword={editingKeyword}
          onSave={handleSaveKeyword}
          onCancel={() => {
            setShowKeywordEditor(false);
            setEditingKeyword(null);
          }}
        />
      )}

      {/* Tag Editor Modal */}
      {showTagEditor && (
        <TagEditor
          tag={editingTag}
          onSave={handleSaveTag}
          onCancel={() => {
            setShowTagEditor(false);
            setEditingTag(null);
          }}
        />
      )}

      {/* Pattern Editor Modal */}
      {showPatternEditor && (
        <PatternEditor
          pattern={editingPattern}
          onSave={handleSavePattern}
          onCancel={() => {
            setShowPatternEditor(false);
            setEditingPattern(null);
          }}
        />
      )}
    </div>
  );
}

// Keyword Editor Component
function KeywordEditor({ keyword, onSave, onCancel }: { keyword: Keyword | null; onSave: (keyword: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    keyword: keyword?.keyword || '',
    category: keyword?.category || 'action',
    weight: keyword?.weight || 50,
    synonyms: keyword?.synonyms?.join(', ') || '',
    patterns: keyword?.patterns?.join(', ') || '',
    contexts: keyword?.contexts?.join(', ') || '',
    intentMapping: keyword?.intentMapping?.map((m: any) => `${m.intent}:${m.confidence}:${m.boost}`).join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const intentMapping = formData.intentMapping.split(',').filter(Boolean).map((mapping: string) => {
      const [intent, confidence, boost] = mapping.split(':');
      return {
        intent: intent.trim(),
        confidence: parseInt(confidence) || 50,
        required: false,
        boost: parseInt(boost) || 10
      };
    });

    onSave({
      ...formData,
      synonyms: formData.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      patterns: formData.patterns.split(',').map(p => p.trim()).filter(Boolean),
      contexts: formData.contexts.split(',').map(c => c.trim()).filter(Boolean),
      intentMapping
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#050505] rounded-[1.75rem] border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {keyword ? 'Edit Keyword' : 'Add Keyword'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Keyword</label>
              <input
                type="text"
                value={formData.keyword}
                onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
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
                <option value="action">Action</option>
                <option value="subject">Subject</option>
                <option value="modifier">Modifier</option>
                <option value="context">Context</option>
                <option value="emotion">Emotion</option>
                <option value="technical">Technical</option>
                <option value="custom">Custom</option>
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
            <label className="text-[10px] text-white/40 block mb-1">Synonyms (comma-separated)</label>
            <input
              type="text"
              value={formData.synonyms}
              onChange={(e) => setFormData(prev => ({ ...prev, synonyms: e.target.value }))}
              placeholder="e.g., help, assist, support"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Patterns (comma-separated)</label>
            <input
              type="text"
              value={formData.patterns}
              onChange={(e) => setFormData(prev => ({ ...prev, patterns: e.target.value }))}
              placeholder="e.g., \\bhelp\\b, \\bassist\\b"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Contexts (comma-separated)</label>
            <input
              type="text"
              value={formData.contexts}
              onChange={(e) => setFormData(prev => ({ ...prev, contexts: e.target.value }))}
              placeholder="e.g., general, support, learning"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Intent Mapping (intent:confidence:boost, comma-separated)</label>
            <input
              type="text"
              value={formData.intentMapping}
              onChange={(e) => setFormData(prev => ({ ...prev, intentMapping: e.target.value }))}
              placeholder="e.g., request_help:85:25, get_information:70:15"
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
              Save Keyword
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tag Editor Component
function TagEditor({ tag, onSave, onCancel }: { tag: Tag | null; onSave: (tag: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    type: tag?.type || 'user',
    weight: tag?.weight || 50,
    keywords: tag?.keywords?.join(', ') || '',
    patterns: tag?.patterns?.join(', ') || '',
    intentMapping: tag?.intentMapping?.map((m: any) => `${m.intent}:${m.confidence}:${m.boost}`).join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const intentMapping = formData.intentMapping.split(',').filter(Boolean).map((mapping: string) => {
      const [intent, confidence, boost] = mapping.split(':');
      return {
        intent: intent.trim(),
        confidence: parseInt(confidence) || 50,
        required: false,
        boost: parseInt(boost) || 10
      };
    });

    onSave({
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      patterns: formData.patterns.split(',').map(p => p.trim()).filter(Boolean),
      intentMapping,
      combinations: []
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#050505] rounded-[1.75rem] border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {tag ? 'Edit Tag' : 'Add Tag'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Tag Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
              >
                <option value="user">User</option>
                <option value="system">System</option>
                <option value="context">Context</option>
                <option value="emotion">Emotion</option>
                <option value="domain">Domain</option>
                <option value="complexity">Complexity</option>
                <option value="urgency">Urgency</option>
                <option value="custom">Custom</option>
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
            <label className="text-[10px] text-white/40 block mb-1">Keywords (comma-separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="e.g., help, assist, support"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Patterns (comma-separated)</label>
            <input
              type="text"
              value={formData.patterns}
              onChange={(e) => setFormData(prev => ({ ...prev, patterns: e.target.value }))}
              placeholder="e.g., \\burgent\\b, \\bquickly\\b"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Intent Mapping (intent:confidence:boost, comma-separated)</label>
            <input
              type="text"
              value={formData.intentMapping}
              onChange={(e) => setFormData(prev => ({ ...prev, intentMapping: e.target.value }))}
              placeholder="e.g., urgent_request:85:25, time_sensitive:70:15"
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
              Save Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Pattern Editor Component
function PatternEditor({ pattern, onSave, onCancel }: { pattern: IntentPattern | null; onSave: (pattern: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    pattern: pattern?.pattern || '',
    intent: pattern?.intent || '',
    confidence: pattern?.confidence || 50,
    examples: pattern?.examples?.join(', ') || '',
    weight: pattern?.weight || 50
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      examples: formData.examples.split(',').map(e => e.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#050505] rounded-[1.75rem] border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {pattern ? 'Edit Pattern' : 'Add Pattern'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Intent</label>
              <input
                type="text"
                value={formData.intent}
                onChange={(e) => setFormData(prev => ({ ...prev, intent: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Confidence</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.confidence}
                onChange={(e) => setFormData(prev => ({ ...prev, confidence: parseInt(e.target.value) || 50 }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
              />
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
            <label className="text-[10px] text-white/40 block mb-1">Regex Pattern</label>
            <input
              type="text"
              value={formData.pattern}
              onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
              placeholder="e.g., \\?\\s*$"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 font-mono"
              required
            />
          </div>
          
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Examples (comma-separated)</label>
            <textarea
              value={formData.examples}
              onChange={(e) => setFormData(prev => ({ ...prev, examples: e.target.value }))}
              placeholder="e.g., What is this?, How do I fix this?, Can you help?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 resize-none h-16"
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
              Save Pattern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
