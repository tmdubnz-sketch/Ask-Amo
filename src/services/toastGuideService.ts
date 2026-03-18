import { toastService } from './toastService';

export interface GuideConfig {
  id: string;
  title: string;
  message: string;
  speechText?: string;
  category: 'navigation' | 'feature' | 'workflow' | 'tip' | 'help';
  type: 'info' | 'success' | 'warning' | 'error' | 'guide' | 'tip';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  trigger?: string; // When to show this guide
  conditions?: () => boolean; // Additional conditions
}

class ToastGuideService {
  private guides: Map<string, GuideConfig> = new Map();
  private shownGuides: Set<string> = new Set();
  private viewHistory: string[] = [];
  private sessionStart: number = Date.now();

  constructor() {
    this.initializeGuides();
  }

  // Initialize all available guides
  private initializeGuides() {
    // Navigation Guides
    this.addGuide({
      id: 'welcome-to-amo',
      title: 'Welcome to Ask-Amo!',
      message: 'I have 7 specialized views: Chat, Web Browser, Terminal, Code Editor, Vocabulary Builder, Sentence Builder, and Intent Enhancer. Each view is designed for specific tasks.',
      speechText: 'Welcome to Ask-Amo! I have 7 specialized views, each designed for specific tasks. Let me show you around.',
      category: 'navigation',
      type: 'guide',
      duration: 10000,
      persistent: false,
    });

    this.addGuide({
      id: 'view-navigation',
      title: 'Easy Navigation',
      message: 'Use voice commands like "go to vocabulary" or tap the tabs to switch between views. All tabs are accessible with horizontal scrolling.',
      speechText: 'You can easily navigate between views using voice commands or by tapping the tabs. Try saying "go to vocabulary" to explore the vocabulary builder.',
      category: 'navigation',
      type: 'tip',
      duration: 8000,
    });

    // Vocabulary Builder Guides
    this.addGuide({
      id: 'vocabulary-intro',
      title: 'Vocabulary Builder',
      message: 'Extract words from websites, create AI-powered vocabulary sets, and review with flashcards. Perfect for learning new terminology!',
      speechText: 'The Vocabulary Builder helps you extract words from websites and documents, create themed vocabulary sets with AI, and review them with flashcards.',
      category: 'feature',
      type: 'guide',
      trigger: 'vocabulary',
      duration: 9000,
    });

    this.addGuide({
      id: 'vocabulary-extraction',
      title: 'Web Vocabulary Extraction',
      message: 'Enter any URL to extract vocabulary words automatically. I\'ll find definitions and create example sentences for you.',
      speechText: 'Try extracting vocabulary from a website. Just enter a URL and I\'ll automatically find important words with definitions.',
      category: 'workflow',
      type: 'tip',
      trigger: 'vocabulary',
      conditions: () => this.isFirstTimeInVocabulary(),
    });

    // Sentence Builder Guides
    this.addGuide({
      id: 'sentence-builder-intro',
      title: 'Sentence Builder',
      message: 'Create structured sentences using templates and word variations. Great for improving writing skills and communication!',
      speechText: 'The Sentence Builder helps you create well-structured sentences using templates and word variations. Perfect for improving your writing.',
      category: 'feature',
      type: 'guide',
      trigger: 'sentence-builder',
      duration: 9000,
    });

    this.addGuide({
      id: 'sentence-templates',
      title: 'Sentence Templates',
      message: 'Choose from various sentence structures and customize word options. Generate multiple variations with confidence scoring.',
      speechText: 'Try different sentence templates and word variations. You can generate multiple sentences and see confidence scores for each.',
      category: 'workflow',
      type: 'tip',
      trigger: 'sentence-builder',
    });

    // Intent Enhancer Guides
    this.addGuide({
      id: 'intent-enhancer-intro',
      title: 'Intent Enhancer',
      message: 'Help me understand you better! Add keywords and tags to improve how I interpret your requests and provide more accurate responses.',
      speechText: 'The Intent Enhancer helps me better understand your requests. Add keywords and tags to improve my accuracy and response quality.',
      category: 'feature',
      type: 'guide',
      trigger: 'intent-enhancer',
      duration: 9000,
    });

    this.addGuide({
      id: 'intent-prediction',
      title: 'Test Intent Recognition',
      message: 'Type any request and see how I interpret it. Add keywords to improve accuracy for your specific communication style.',
      speechText: 'Test how I understand your requests by typing them in the Predictor tab. Add keywords to help me learn your communication style.',
      category: 'workflow',
      type: 'tip',
      trigger: 'intent-enhancer',
    });

    // Web Browser Guides
    this.addGuide({
      id: 'web-browser-tips',
      title: 'Web Browser Features',
      message: 'Browse any website, search the web, and save content to your knowledge base. Pages open in your device browser with error handling.',
      speechText: 'Use the Web Browser to search the internet and save useful content to your knowledge base for future reference.',
      category: 'feature',
      type: 'tip',
      trigger: 'webview',
    });

    // Terminal Guides
    this.addGuide({
      id: 'terminal-usage',
      title: 'Terminal Commands',
      message: 'Run shell commands, build projects, and manage files. I maintain your working directory and provide error handling.',
      speechText: 'Use the Terminal to run commands like npm run build or git status. I maintain your working directory between commands.',
      category: 'feature',
      type: 'tip',
      trigger: 'terminal',
    });

    // Code Editor Guides
    this.addGuide({
      id: 'code-editor-features',
      title: 'Code Editor',
      message: 'Write, edit, and execute code in multiple languages. I can generate code, debug issues, and provide explanations.',
      speechText: 'The Code Editor supports multiple languages with syntax highlighting. I can help you write, debug, and understand code.',
      category: 'feature',
      type: 'tip',
      trigger: 'editor',
    });

    // Workflow Guides
    this.addGuide({
      id: 'workflow-vocabulary-learning',
      title: 'Vocabulary Learning Workflow',
      message: '1. Extract words from a relevant website 2. Use AI to create themed sets 3. Review with flashcards 4. Track your progress',
      speechText: 'For vocabulary learning: first extract words from a website, then use AI to create themed sets, review with flashcards, and track your progress.',
      category: 'workflow',
      type: 'guide',
      trigger: 'vocabulary',
      conditions: () => this.getSessionTime() > 300000, // After 5 minutes
    });

    this.addGuide({
      id: 'workflow-sentence-practice',
      title: 'Sentence Building Workflow',
      message: '1. Choose a template 2. Select word options 3. Generate multiple sentences 4. Review confidence scores 5. Create custom templates',
      speechText: 'To practice sentence building: choose a template, select word options, generate multiple sentences, review confidence scores, and create custom templates.',
      category: 'workflow',
      type: 'guide',
      trigger: 'sentence-builder',
      conditions: () => this.getSessionTime() > 300000,
    });

    // Pro Tips
    this.addGuide({
      id: 'pro-tip-voice-commands',
      title: 'Pro Tip: Voice Commands',
      message: 'Try voice commands like "go to vocabulary" or "build vocabulary from example.com" for hands-free navigation and control.',
      speechText: 'Pro tip: Use voice commands for hands-free control. Try saying "go to vocabulary" or "build vocabulary from a website".',
      category: 'tip',
      type: 'tip',
      duration: 7000,
      conditions: () => this.getSessionTime() > 600000, // After 10 minutes
    });

    this.addGuide({
      id: 'pro-tip-knowledge-integration',
      title: 'Pro Tip: Knowledge Integration',
      message: 'Import web pages and documents to your knowledge base. I can then reference this information in conversations.',
      speechText: 'Pro tip: Save web pages and documents to your knowledge base so I can reference them in our conversations.',
      category: 'tip',
      type: 'tip',
      duration: 7000,
      conditions: () => this.getSessionTime() > 600000,
    });
  }

  // Add a new guide
  addGuide(config: GuideConfig) {
    this.guides.set(config.id, config);
  }

  // Show a specific guide
  showGuide(id: string, options?: { force?: boolean; overrideSpeech?: boolean }) {
    const guide = this.guides.get(id);
    if (!guide) return false;

    // Check if already shown (unless forced)
    if (!options?.force && this.shownGuides.has(id)) return false;

    // Check conditions
    if (guide.conditions && !guide.conditions()) return false;

    const toastId = toastService.add(guide.title, guide.message, {
      type: guide.type,
      duration: guide.duration,
      persistent: guide.persistent,
      speechEnabled: options?.overrideSpeech ?? true,
      speechText: guide.speechText,
      category: guide.category,
      action: guide.action,
    });

    this.shownGuides.add(id);
    return toastId;
  }

  // Trigger guides based on view or action
  triggerGuides(trigger: string, options?: { force?: boolean }) {
    const triggeredGuides: string[] = [];

    this.guides.forEach((guide, id) => {
      if (guide.trigger === trigger) {
        const toastId = this.showGuide(id, options);
        if (toastId) triggeredGuides.push(id);
      }
    });

    return triggeredGuides;
  }

  // Track view navigation
  trackViewNavigation(view: string) {
    this.viewHistory.push(view);
    
    // Trigger view-specific guides
    this.triggerGuides(view);
    
    // Show contextual guides based on view history
    this.showContextualGuides(view);
  }

  // Show contextual guides based on user behavior
  private showContextualGuides(currentView: string) {
    const sessionTime = this.getSessionTime();
    const viewCount = this.viewHistory.filter(v => v === currentView).length;

    // First time in a view - show intro guide
    if (viewCount === 1 && !this.shownGuides.has(`${currentView}-intro`)) {
      const introGuideId = `${currentView}-intro`;
      const introGuide = this.guides.get(introGuideId);
      if (introGuide) {
        this.showGuide(introGuideId);
      }
    }

    // After spending time in a view - show workflow tips
    if (sessionTime > 300000 && viewCount > 2) { // 5 minutes, visited 3+ times
      const workflowGuideId = `workflow-${currentView}`;
      const workflowGuide = this.guides.get(workflowGuideId);
      if (workflowGuide) {
        this.showGuide(workflowGuideId);
      }
    }
  }

  // Show welcome guide for new users
  showWelcomeGuide() {
    return this.showGuide('welcome-to-amo');
  }

  // Show navigation tips
  showNavigationTips() {
    return this.showGuide('view-navigation');
  }

  // Show pro tips for experienced users
  showProTips() {
    const proTips = ['pro-tip-voice-commands', 'pro-tip-knowledge-integration'];
    return proTips.map(id => this.showGuide(id));
  }

  // Get session time in milliseconds
  private getSessionTime(): number {
    return Date.now() - this.sessionStart;
  }

  // Check if first time in vocabulary
  private isFirstTimeInVocabulary(): boolean {
    return this.viewHistory.filter(v => v === 'vocabulary').length === 1;
  }

  // Get guides for a specific category
  getGuidesByCategory(category: GuideConfig['category']): GuideConfig[] {
    return Array.from(this.guides.values()).filter(guide => guide.category === category);
  }

  // Get all available guides
  getAllGuides(): GuideConfig[] {
    return Array.from(this.guides.values());
  }

  // Reset guide history (for testing)
  resetHistory() {
    this.shownGuides.clear();
    this.viewHistory = [];
    this.sessionStart = Date.now();
  }

  // Check if guide has been shown
  hasBeenShown(id: string): boolean {
    return this.shownGuides.has(id);
  }

  // Get guide statistics
  getStats() {
    const totalGuides = this.guides.size;
    const shownGuides = this.shownGuides.size;
    const categories = Array.from(new Set(Array.from(this.guides.values()).map(g => g.category)));
    
    return {
      totalGuides,
      shownGuides,
      completionRate: totalGuides > 0 ? (shownGuides / totalGuides) * 100 : 0,
      categories,
      sessionTime: this.getSessionTime(),
      viewsVisited: [...new Set(this.viewHistory)],
    };
  }
}

export const toastGuideService = new ToastGuideService();
