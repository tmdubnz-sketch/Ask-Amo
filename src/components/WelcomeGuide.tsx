import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, MessageCircle, Code, Terminal, Globe, Brain, Mic, BookOpen, Sparkles } from 'lucide-react';

interface WelcomeGuideProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: <MessageCircle className="w-8 h-8 text-[#ff4e00]" />,
    title: 'Welcome to Amo',
    description: 'Your AI assistant that runs on your device. Chat, code, search, and learn.',
    detail: 'Amo works with cloud models (needs internet) or local models (works offline).',
  },
  {
    icon: <Code className="w-8 h-8 text-blue-400" />,
    title: 'Code Editor',
    description: 'Write and run code in 20+ languages. JavaScript and Python run directly in the browser.',
    tip: 'Say "write a hello world" and Amo will create it in the editor.',
  },
  {
    icon: <Terminal className="w-8 h-8 text-green-400" />,
    title: 'Terminal',
    description: 'Run shell commands directly. Execute scripts, manage files, and run builds.',
    tip: 'Say "run npm install" or "list files" and Amo executes the command.',
  },
  {
    icon: <Globe className="w-8 h-8 text-purple-400" />,
    title: 'Web Search',
    description: 'Cloud models search the web automatically. Just ask about current events or facts.',
    tip: 'Try: "What is the latest AI news?"',
  },
  {
    icon: <Brain className="w-8 h-8 text-pink-400" />,
    title: 'Knowledge Brain',
    description: 'Amo remembers conversations and learns from your documents. Upload PDFs to build your knowledge base.',
    tip: 'Say "learn this: my name is [name]" to teach Amo something permanently.',
  },
  {
    icon: <Mic className="w-8 h-8 text-orange-400" />,
    title: 'Voice Mode',
    description: 'Speak to Amo and hear responses aloud. Toggle voice mode for hands-free operation.',
    tip: 'Say "voice on" to enable spoken responses.',
  },
  {
    icon: <BookOpen className="w-8 h-8 text-yellow-400" />,
    title: 'Instant Commands',
    description: 'Say "terminal", "editor", "browser", "settings", or "help" to navigate instantly.',
    tip: 'Say "help" anytime to see all available commands.',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-[#ff4e00]" />,
    title: 'You\'re Ready!',
    description: 'Start chatting with Amo. Ask anything, write code, search the web, or build your knowledge.',
    tip: 'Try: "What can you do?" to see all capabilities.',
  },
];

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the guide
    const hasSeenGuide = localStorage.getItem('amo_welcome_guide_seen');
    if (!hasSeenGuide) {
      setIsVisible(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('amo_welcome_guide_seen', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              {currentStep.icon}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {currentStep.title}
            </h2>
            <p className="text-white/70 text-sm mb-4">
              {currentStep.description}
            </p>
            {currentStep.tip && (
              <div className="bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-xl px-4 py-3 text-sm text-[#ff4e00]">
                {currentStep.tip}
              </div>
            )}
            {currentStep.detail && (
              <p className="text-white/50 text-xs mt-3">
                {currentStep.detail}
              </p>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === step ? 'bg-[#ff4e00] w-4' : i < step ? 'bg-white/40' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className="flex items-center gap-1 px-3 py-2 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#ff4e00] text-white font-medium text-sm hover:bg-[#ff4e00]/80 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-all"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
