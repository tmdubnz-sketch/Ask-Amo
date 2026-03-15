import { useEffect, useState } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean;

  constructor() {
    // Enable performance monitoring in development or if explicitly enabled via env
    this.enabled = import.meta.env.PERFORMANCE_MONITORING === 'true' || 
                   (import.meta.env.MODE === 'development' && import.meta.env.VITE_PERFORMANCE_MONITORING !== 'false');
    
    if (this.enabled) {
      console.info('[Performance Monitoring] Enabled');
    }
  }

  /**
   * Start measuring a performance metric
   * @param name - Name of the metric
   * @param metadata - Optional metadata to associate with the metric
   * @returns A function to call to end the measurement
   */
  startMeasure(name: string, metadata?: Record<string, any>): () => void {
    if (!this.enabled) return () => {};

    const startTime = performance.now();
    const metric: PerformanceMetric = {
      name,
      startTime,
      metadata,
    };

    this.metrics.push(metric);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      metric.endTime = endTime;
      metric.duration = duration;

      if (this.enabled) {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);
      }
    };
  }

  /**
   * Measure the execution time of a function
   * @param name - Name of the metric
   * @param fn - Function to measure
   * @param metadata - Optional metadata
   * @returns Promise that resolves with the function's result
   */
  async measure<T>(name: string, fn: () => Promise<T> | T, metadata?: Record<string, any>): Promise<T> {
    if (!this.enabled) return await fn();

    const end = this.startMeasure(name, metadata);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * Get all recorded metrics
   * @returns Array of performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Check if performance monitoring is enabled
   * @returns Boolean indicating if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Create a singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Custom hook to use performance monitoring in components
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  useEffect(() => {
    // Update metrics periodically if enabled
    if (performanceMonitoringService.isEnabled()) {
      const interval = setInterval(() => {
        setMetrics(performanceMonitoringService.getMetrics());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  return {
    metrics,
    startMeasure: performanceMonitoringService.startMeasure.bind(performanceMonitoringService),
    measure: performanceMonitoringService.measure.bind(performanceMonitoringService),
  };
}