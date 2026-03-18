import { Toast } from '../components/Toast';

export interface ToastOptions {
  type?: Toast['type'];
  duration?: number;
  persistent?: boolean;
  speechEnabled?: boolean;
  speechText?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  category?: Toast['category'];
}

class ToastService {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];
  private speechSettings: { [id: string]: boolean } = {};
  private nextId = 1;

  // Subscribe to toast changes
  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  // Create a new toast
  private createToast(options: ToastOptions & { title: string; message: string }): Toast {
    const id = `toast-${this.nextId++}`;
    const toast: Toast = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration,
      persistent: options.persistent,
      speechEnabled: options.speechEnabled,
      speechText: options.speechText,
      action: options.action,
      category: options.category,
    };
    return toast;
  }

  // Add a toast to the queue
  add(title: string, message: string, options: ToastOptions = {}): string {
    const toast = this.createToast({ title, message, ...options });
    this.toasts.push(toast);
    this.notify();
    return toast.id;
  }

  // Remove a toast
  remove(id: string): void {
    const index = this.toasts.findIndex(toast => toast.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      this.notify();
    }
  }

  // Clear all toasts
  clear(): void {
    this.toasts = [];
    this.notify();
  }

  // Toggle speech for a toast
  toggleSpeech(id: string, enabled: boolean): void {
    this.speechSettings[id] = enabled;
  }

  // Get speech setting for a toast
  getSpeechSetting(id: string): boolean {
    return this.speechSettings[id] ?? true;
  }

  // Convenience methods for different toast types
  success(title: string, message: string, options: ToastOptions = {}): string {
    return this.add(title, message, { ...options, type: 'success' });
  }

  error(title: string, message: string, options: ToastOptions = {}): string {
    return this.add(title, message, { ...options, type: 'error', persistent: true });
  }

  warning(title: string, message: string, options: ToastOptions = {}): string {
    return this.add(title, message, { ...options, type: 'warning' });
  }

  info(title: string, message: string, options: ToastOptions = {}): string {
    return this.add(title, message, { ...options, type: 'info' });
  }

  // Guide toast with speech
  guide(title: string, message: string, speechText?: string, options: ToastOptions = {}): string {
    return this.add(title, message, {
      ...options,
      type: 'guide',
      category: 'help',
      speechEnabled: true,
      speechText: speechText || `${title}. ${message}`,
    });
  }

  // Tip toast with speech
  tip(title: string, message: string, speechText?: string, options: ToastOptions = {}): string {
    return this.add(title, message, {
      ...options,
      type: 'tip',
      category: 'tip',
      speechEnabled: true,
      speechText: speechText || `Tip: ${title}. ${message}`,
    });
  }

  // Navigation guide
  navigation(title: string, message: string, view?: string, options: ToastOptions = {}): string {
    const speechText = view ? `${title}. ${message}. Switching to ${view} view.` : `${title}. ${message}`;
    
    return this.add(title, message, {
      ...options,
      type: 'guide',
      category: 'navigation',
      speechEnabled: true,
      speechText,
      action: view ? {
        label: `Go to ${view}`,
        onClick: () => {
          // This will be handled by the component
          console.log(`Navigate to ${view}`);
        }
      } : undefined,
    });
  }

  // Feature introduction
  featureIntro(featureName: string, description: string, benefits: string[], options: ToastOptions = {}): string {
    const message = `${description}. Benefits: ${benefits.join(', ')}.`;
    const speechText = `Welcome to ${featureName}. ${description}. You can use this to ${benefits.join(' and ')}.`;
    
    return this.add(`New Feature: ${featureName}`, message, {
      ...options,
      type: 'guide',
      category: 'feature',
      speechEnabled: true,
      speechText,
      duration: 8000,
    });
  }

  // Workflow guidance
  workflow(step: string, description: string, nextStep?: string, options: ToastOptions = {}): string {
    const speechText = nextStep ? `${step}. ${description}. Next: ${nextStep}` : `${step}. ${description}`;
    
    return this.add(step, description, {
      ...options,
      type: 'guide',
      category: 'workflow',
      speechEnabled: true,
      speechText,
      action: nextStep ? {
        label: 'Next Step',
        onClick: () => {
          console.log(`Next step: ${nextStep}`);
        }
      } : undefined,
    });
  }

  // Get all current toasts
  getAll(): Toast[] {
    return [...this.toasts];
  }

  // Get toast by ID
  getById(id: string): Toast | undefined {
    return this.toasts.find(toast => toast.id === id);
  }

  // Check if toast exists
  exists(id: string): boolean {
    return this.toasts.some(toast => toast.id === id);
  }
}

export const toastService = new ToastService();
