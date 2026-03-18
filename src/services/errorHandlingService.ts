export interface AmoError extends Error {
  code: string;
  service: string;
  recoverable: boolean;
  userMessage: string;
}

export class ServiceError extends Error implements AmoError {
  code: string;
  service: string;
  recoverable: boolean;
  userMessage: string;

  constructor(
    service: string,
    code: string,
    message: string,
    userMessage?: string,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ServiceError';
    this.service = service;
    this.code = code;
    this.recoverable = recoverable;
    this.userMessage = userMessage || message;
  }
}

export function createError(
  service: string,
  code: string,
  message: string,
  userMessage?: string,
  recoverable: boolean = true
): ServiceError {
  return new ServiceError(service, code, message, userMessage, recoverable);
}

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ServiceError) {
    return error.recoverable;
  }
  return false;
}

export function getUserMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function logError(service: string, error: unknown, context?: string): void {
  const errorInfo = {
    service,
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  };
  
  console.error(`[${service}] Error:`, errorInfo);
}

export async function withErrorHandling<T>(
  service: string,
  operation: () => Promise<T>,
  context?: string,
  fallback?: T
): Promise<{ result?: T; error?: ServiceError }> {
  try {
    const result = await operation();
    return { result };
  } catch (error) {
    const serviceError = error instanceof ServiceError 
      ? error 
      : createError(service, 'UNKNOWN', String(error), 'Operation failed');
    
    logError(service, error, context);
    return { error: serviceError };
  }
}

export const ERROR_CODES = {
  // Terminal errors
  TERMINAL_COMMAND_FAILED: 'TERMINAL_COMMAND_FAILED',
  TERMINAL_TIMEOUT: 'TERMINAL_TIMEOUT',
  TERMINAL_PERMISSION_DENIED: 'TERMINAL_PERMISSION_DENIED',
  
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',
  
  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  
  // Model errors
  MODEL_NOT_LOADED: 'MODEL_NOT_LOADED',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  MODEL_GENERATION_FAILED: 'MODEL_GENERATION_FAILED',
  
  // Service errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
  SERVICE_CONFIGURATION_ERROR: 'SERVICE_CONFIGURATION_ERROR',
} as const;
