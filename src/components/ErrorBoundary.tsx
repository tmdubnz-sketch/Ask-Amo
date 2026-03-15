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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public resetError = () => {
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