import React, { useState } from 'react';
import { vocabularyService, type VocabularyWord, type VocabularySet, type ComposerRequest } from '../services/vocabularyService';
import { 
  BookOpen, 
  Upload, 
  Globe, 
  Brain, 
  Plus, 
  Search, 
  Filter,
  BarChart3,
  Clock,
  TrendingUp,
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  FileText,
  Settings,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface VocabularyBuilderProps {
  onClose?: () => void;
}

export function VocabularyBuilder({ onClose }: VocabularyBuilderProps) {
  const [activeTab, setActiveTab] = useState<'extract' | 'composer' | 'library' | 'review'>('extract');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [extractedWords, setExtractedWords] = useState<VocabularyWord[]>([]);
  const [vocabularySets, setVocabularySets] = useState<VocabularySet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Extract from web state
  const [webUrl, setWebUrl] = useState('');
  const [webOptions, setWebOptions] = useState<Partial<ComposerRequest>>({});

  // Composer state
  const [composerRequest, setComposerRequest] = useState<ComposerRequest>({
    topic: '',
    difficulty: 'intermediate',
    category: 'general',
    wordCount: 10,
    includeDefinitions: true,
    includeExamples: true,
    includeRelations: true
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    loadVocabularySets();
  }, []);

  const loadVocabularySets = async () => {
    try {
      const sets = await vocabularyService.getVocabularyStats();
      // Load sets from storage
      const stored = localStorage.getItem('amo_vocabulary_sets');
      if (stored) {
        setVocabularySets(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load vocabulary sets:', error);
    }
  };

  const handleExtractFromWeb = async () => {
    if (!webUrl) {
      setStatus('Please enter a URL');
      return;
    }

    setLoading(true);
    setStatus('Extracting vocabulary from web...');
    
    try {
      const words = await vocabularyService.extractFromWeb(webUrl, webOptions as any);
      setExtractedWords(words);
      setStatus(`Extracted ${words.length} words from web`);
    } catch (error) {
      setStatus('Failed to extract from web. Please check the URL and try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractFromFile = async () => {
    if (!selectedFile) {
      setStatus('Please select a file');
      return;
    }

    setLoading(true);
    setStatus('Extracting vocabulary from file...');
    
    try {
      const words = await vocabularyService.extractFromFile(selectedFile, webOptions as any);
      setExtractedWords(words);
      setStatus(`Extracted ${words.length} words from file`);
    } catch (error) {
      setStatus('Failed to extract from file. Please check the file format.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithComposer = async () => {
    if (!composerRequest.topic) {
      setStatus('Please enter a topic');
      return;
    }

    setLoading(true);
    setStatus('Generating vocabulary set...');
    
    try {
      const vocabularySet = await vocabularyService.generateVocabularySet(composerRequest);
      setVocabularySets(prev => [...prev, vocabularySet]);
      setExtractedWords(vocabularySet.words);
      setStatus(`Generated vocabulary set with ${vocabularySet.words.length} words`);
    } catch (error) {
      setStatus('Failed to generate vocabulary set. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWords = async () => {
    if (selectedWords.size === 0) {
      setStatus('Please select words to save');
      return;
    }

    setLoading(true);
    setStatus('Saving selected words...');
    
    try {
      const wordsToSave = extractedWords.filter(w => selectedWords.has(w.id));
      await vocabularyService.saveVocabularyWords(wordsToSave);
      setStatus(`Saved ${wordsToSave.length} words to vocabulary`);
      setSelectedWords(new Set());
    } catch (error) {
      setStatus('Failed to save words');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleWordSelection = (wordId: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      newSelected.add(wordId);
    }
    setSelectedWords(newSelected);
  };

  const selectAllWords = () => {
    if (selectedWords.size === extractedWords.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(extractedWords.map(w => w.id)));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] rounded-[1.75rem] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#ff4e00]" />
          <h2 className="text-sm font-semibold text-white/90">Vocabulary Builder</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-white/40 hover:text-white/60 transition-colors"
            title="How to use Vocabulary Builder"
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
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 shrink-0 overflow-x-auto custom-scroll">
        <div className="flex gap-1 flex-shrink-0">
        {[
          { id: 'extract', label: 'Extract', icon: Upload },
          { id: 'composer', label: 'Composer', icon: Brain },
          { id: 'library', label: 'Library', icon: BookOpen },
          { id: 'review', label: 'Review', icon: Clock }
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
      <div className="flex-1 overflow-y-auto custom-scroll p-4">
      {/* Help Section */}
      {showHelp && (
        <div className="mb-4 p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-lg">
          <h3 className="text-sm font-semibold text-white/90 mb-3">How to Use Vocabulary Builder</h3>
          <div className="space-y-3 text-xs text-white/70">
            <div>
              <strong className="text-white/80">1. Extract:</strong> Pull vocabulary from websites, documents, or existing text. Just paste a URL or upload a file.
            </div>
            <div>
              <strong className="text-white/80">2. Composer:</strong> Generate custom vocabulary sets for any topic (e.g., "business English", "medical terms").
            </div>
            <div>
              <strong className="text-white/80">3. Library:</strong> View and manage all your saved vocabulary sets.
            </div>
            <div>
              <strong className="text-white/80">4. Review:</strong> Practice your vocabulary with flashcards and quizzes.
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <strong>💡 Tip:</strong> Words you save here will be available in the Sentence Builder to create practice sentences!
            </div>
          </div>
        </div>
      )}

      {status && (
          <div className={cn(
            'mb-4 p-3 rounded-lg text-xs',
            status.includes('Failed') ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
            status.includes('Saved') || status.includes('Generated') || status.includes('Extracted')
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
          )}>
            {status}
          </div>
        )}

        {activeTab === 'extract' && (
          <div className="space-y-6">
            {/* Web Extraction */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Extract from Web
              </h3>
              <div className="space-y-2">
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="Enter URL to extract vocabulary from..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={webOptions.difficulty || ''}
                    onChange={(e) => setWebOptions(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="">Any Difficulty</option>
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                  <select
                    value={webOptions.category || ''}
                    onChange={(e) => setWebOptions(prev => ({ ...prev, category: e.target.value as any }))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="">Any Category</option>
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="academic">Academic</option>
                    <option value="business">Business</option>
                    <option value="creative">Creative</option>
                    <option value="scientific">Scientific</option>
                  </select>
                </div>
                <button
                  onClick={handleExtractFromWeb}
                  disabled={loading || !webUrl}
                  className="w-full py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Extract from Web
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Extract from File
              </h3>
              <div className="space-y-2">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".txt,.md,.pdf,.doc,.docx"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#ff4e00]/20 file:text-[#ff8a5c] placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                />
                {selectedFile && (
                  <div className="text-[10px] text-white/40">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                <button
                  onClick={handleExtractFromFile}
                  disabled={loading || !selectedFile}
                  className="w-full py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Extract from File
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'composer' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              AI Vocabulary Composer
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Topic</label>
                <input
                  type="text"
                  value={composerRequest.topic}
                  onChange={(e) => setComposerRequest(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Machine Learning, Business English, Scientific Terms..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Difficulty</label>
                  <select
                    value={composerRequest.difficulty}
                    onChange={(e) => setComposerRequest(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Category</label>
                  <select
                    value={composerRequest.category}
                    onChange={(e) => setComposerRequest(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#ff4e00]/40"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="academic">Academic</option>
                    <option value="business">Business</option>
                    <option value="creative">Creative</option>
                    <option value="scientific">Scientific</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Number of Words</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={composerRequest.wordCount}
                  onChange={(e) => setComposerRequest(prev => ({ ...prev, wordCount: parseInt(e.target.value) || 10 }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Context (Optional)</label>
                <textarea
                  value={composerRequest.context || ''}
                  onChange={(e) => setComposerRequest(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Provide context for better vocabulary generation..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 resize-none h-16"
                />
              </div>
              <button
                onClick={handleGenerateWithComposer}
                disabled={loading || !composerRequest.topic}
                className="w-full py-2 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-xs font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                Generate Vocabulary Set
              </button>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Vocabulary Library
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vocabulary..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#ff4e00]/40 w-48"
                />
                <button className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/60">
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Vocabulary Sets */}
            <div className="space-y-2">
              {vocabularySets.map(set => (
                <div key={set.id} className="bg-white/[0.03] rounded-lg border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-white/80">{set.name}</h4>
                    <span className="text-[9px] text-white/40">{set.wordCount} words</span>
                  </div>
                  <p className="text-[10px] text-white/30 mb-2">{set.description}</p>
                  <div className="flex items-center gap-2 text-[9px] text-white/40">
                    <span className="px-2 py-0.5 rounded bg-white/5">{set.difficulty}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5">{set.category}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5">{set.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Review Vocabulary
            </h3>
            <div className="text-[10px] text-white/30">
              Review words to improve mastery and retention.
            </div>
          </div>
        )}

        {/* Extracted Words */}
        {extractedWords.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white/80">
                Extracted Words ({extractedWords.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllWords}
                  className="text-[10px] text-white/40 hover:text-white/60"
                >
                  {selectedWords.size === extractedWords.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleSaveWords}
                  disabled={loading || selectedWords.size === 0}
                  className="px-3 py-1 rounded-lg border border-[#ff4e00]/30 bg-[#ff4e00]/10 text-[#ff8a5c] text-[10px] font-medium hover:bg-[#ff4e00]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Save Selected ({selectedWords.size})
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
              {extractedWords.map(word => (
                <div
                  key={word.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all cursor-pointer',
                    selectedWords.has(word.id)
                      ? 'border-[#ff4e00]/30 bg-[#ff4e00]/5'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                  )}
                  onClick={() => toggleWordSelection(word.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-medium text-white/80">{word.word}</h4>
                        <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-white/5">
                          {word.partOfSpeech}
                        </span>
                        <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-white/5">
                          {word.difficulty}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 mb-2">{word.definition}</p>
                      {word.examples.length > 0 && (
                        <div className="text-[9px] text-white/30">
                          <strong>Example:</strong> {word.examples[0]}
                        </div>
                      )}
                    </div>
                    <div className="ml-2">
                      {selectedWords.has(word.id) ? (
                        <CheckCircle className="w-4 h-4 text-[#ff4e00]" />
                      ) : (
                        <div className="w-4 h-4 border border-white/20 rounded" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
