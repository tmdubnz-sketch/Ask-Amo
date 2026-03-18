import React, { createContext, useContext, useState, useEffect } from 'react';

interface TourContextType {
  hasSeenTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    return localStorage.getItem('amo_tour_completed') === 'true';
  });
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps = [
    {
      target: 'vocabulary',
      title: 'Vocabulary Builder',
      content: 'Extract words from websites, generate vocabulary sets for any topic, and review with flashcards. Words saved here appear in Sentence Builder!',
      tab: 'vocabulary'
    },
    {
      target: 'sentence-builder',
      title: 'Sentence Builder',
      content: 'Create practice sentences with AI help. Use templates, word tables, and your vocabulary to build perfect sentences.',
      tab: 'sentence-builder'
    },
    {
      target: 'intent-enhancer',
      title: 'Intent Enhancer',
      content: 'Teach Amo to understand your specific requests better. Add keywords and patterns to improve recognition.',
      tab: 'intent-enhancer'
    }
  ];

  const startTour = () => {
    setCurrentStep(0);
  };

  const completeTour = () => {
    setHasSeenTour(true);
    localStorage.setItem('amo_tour_completed', 'true');
    setCurrentStep(0);
  };

  const skipTour = () => {
    completeTour();
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <TourContext.Provider value={{
      hasSeenTour,
      startTour,
      completeTour,
      skipTour,
      currentStep,
      nextStep,
      prevStep
    }}>
      {children}
    </TourContext.Provider>
  );
}
