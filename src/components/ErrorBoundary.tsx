import React, { Component, ReactNode } from 'react';

interface Props {
  fallback: React.ComponentType<{ error: Error; resetError: () => void }> | ReactNode;
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    };

    console.error('ErrorBoundary caught an error:', errorData);
    
    // Store error for potential reporting
    try {
      const errors = JSON.parse(localStorage.getItem('amo_errors') || '[]');
      errors.push(errorData);
      // Keep only last 10 errors
      if (errors.length > 10) errors.shift();
      localStorage.setItem('amo_errors', JSON.stringify(errors));
    } catch (storageError) {
      console.warn('Failed to store error data:', storageError);
    }
  }

  public resetError = () => {
    // Clear any stored errors for this session
    try {
      localStorage.removeItem('amo_errors');
    } catch (storageError) {
      console.warn('Failed to clear stored errors:', storageError);
    }
    
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      
      if (typeof fallback === 'function') {
        return React.createElement(fallback, {
          error: this.state.error,
          resetError: this.resetError,
        });
      }

      return fallback;
    }

    return this.props.children || (<></>);
  }
}

// Default error fallback component
const DefaultFallback: React.ComponentType<{ error: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => (
  <div className="p-6 text-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
    <div className="flex flex-col items-center space-y-4">
      <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
        Something went wrong
      </h2>
      <p className="text-red-500 dark:text-red-300">
        {error.message}
      </p>
      <button
        onClick={resetError}
        className="mt-4 px-4 py-2 bg-[#ff4e00] text-white rounded hover:bg-[#ff4e00]/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

export default ErrorBoundary;
export { DefaultFallback };