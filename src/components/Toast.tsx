import React, { useEffect, useState } from 'react';
import { X, Volume2, VolumeX, Info, HelpCircle, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'guide' | 'tip';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  speechEnabled?: boolean;
  speechText?: string;
  persistent?: boolean;
  category?: 'navigation' | 'feature' | 'workflow' | 'tip' | 'help';
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
  onSpeechToggle?: (id: string, enabled: boolean) => void;
}

export function Toast({ toast, onClose, onSpeechToggle }: ToastProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(toast.speechEnabled ?? true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation on mount
    setIsVisible(true);
    
    // Auto-close if not persistent
    if (!toast.persistent && toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, toast.persistent]);

  useEffect(() => {
    // Auto-speak if enabled and text provided
    if (speechEnabled && toast.speechText && isVisible) {
      speak(toast.speechText);
    }
  }, [speechEnabled, toast.speechText, isVisible]);

  const speak = async (text: string) => {
    if (!('speechSynthesis' in window)) return;

    try {
      setIsSpeaking(true);
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Get available voices and prefer female voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Karen') ||
        voice.lang.includes('en') && voice.name.includes('Google')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  };

  const toggleSpeech = () => {
    const newSpeechEnabled = !speechEnabled;
    setSpeechEnabled(newSpeechEnabled);
    onSpeechToggle?.(toast.id, newSpeechEnabled);
    
    if (newSpeechEnabled && toast.speechText) {
      speak(toast.speechText);
    } else if (!newSpeechEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'guide':
        return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/20 bg-emerald-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      case 'guide':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'tip':
        return 'border-purple-500/20 bg-purple-500/5';
      default:
        return 'border-white/10 bg-white/[0.03]';
    }
  };

  const getCategoryBadge = () => {
    if (!toast.category) return null;
    
    const categoryStyles = {
      navigation: 'bg-[#ff4e00]/10 text-[#ff4e00] border border-[#ff4e00]/20',
      feature: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      workflow: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      tip: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      help: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
    };

    return (
      <span className={cn(
        'text-[9px] px-2 py-0.5 rounded-full border',
        categoryStyles[toast.category]
      )}>
        {toast.category}
      </span>
    );
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 max-w-md',
        getTypeStyles(),
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title and Category */}
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-white/90">
            {toast.title}
          </h4>
          {getCategoryBadge()}
        </div>

        {/* Message */}
        <p className="text-xs text-white/70 leading-relaxed">
          {toast.message}
        </p>

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs text-[#ff4e00] hover:text-[#ff4e00]/80 transition-colors"
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Speech Toggle */}
        {toast.speechText && (
          <button
            onClick={toggleSpeech}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              speechEnabled 
                ? 'text-white/60 hover:text-white/80 bg-white/5' 
                : 'text-white/20 hover:text-white/40'
            )}
            title={speechEnabled ? 'Mute voice guide' : 'Enable voice guide'}
          >
            {isSpeaking ? (
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            ) : speechEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-white/20 hover:text-white/40 hover:bg-white/5 transition-all"
          title="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
  onSpeechToggle?: (id: string, enabled: boolean) => void;
}

export function ToastContainer({ toasts, onClose, onSpeechToggle }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            toast={toast}
            onClose={onClose}
            onSpeechToggle={onSpeechToggle}
          />
        </div>
      ))}
    </div>
  );
}
