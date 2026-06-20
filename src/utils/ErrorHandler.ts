import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bigid-error-handler' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      stderrLevels: ['error', 'warn', 'info', 'debug'], // Redirect all logs to stderr
    }),
  ],
});

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryOnStatusCodes?: number[];
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  statusCode?: number;
}

export class ErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
    retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
  };

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...ErrorHandler.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const errorInfo = ErrorHandler.analyzeError(error as Error);

        if (attempt === config.maxAttempts || !errorInfo.retryable) {
          logger.error(`Final attempt failed after ${attempt} attempts:`, {
            error: errorInfo,
            attempt,
            maxAttempts: config.maxAttempts,
          });
          throw error;
        }

        const delay = ErrorHandler.calculateDelay(attempt, config);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: errorInfo,
          attempt,
          maxAttempts: config.maxAttempts,
          delay,
        });

        await ErrorHandler.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Analyze an error and determine if it's retryable
   */
  static analyzeError(error: Error): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: false,
    };

    // Network errors
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')) {
      errorInfo.code = 'NETWORK_ERROR';
      errorInfo.retryable = true;
    }

    // HTTP errors
    if ('status' in error || 'response' in error) {
      const status = (error as any).status || (error as any).response?.status;
      errorInfo.statusCode = status;

      if (status >= 500) {
        errorInfo.code = 'SERVER_ERROR';
        errorInfo.retryable = true;
      } else if (status === 429) {
        errorInfo.code = 'RATE_LIMIT_ERROR';
        errorInfo.retryable = true;
      } else if (status === 408) {
        errorInfo.code = 'TIMEOUT_ERROR';
        errorInfo.retryable = true;
      } else if (status === 401) {
        errorInfo.code = 'AUTHENTICATION_ERROR';
        errorInfo.retryable = false;
      } else if (status === 403) {
        errorInfo.code = 'AUTHORIZATION_ERROR';
        errorInfo.retryable = false;
      } else if (status === 404) {
        errorInfo.code = 'NOT_FOUND_ERROR';
        errorInfo.retryable = false;
      } else if (status >= 400) {
        errorInfo.code = 'CLIENT_ERROR';
        errorInfo.retryable = false;
      }
    }

    // Authentication errors
    if (error.message.includes('authentication') || 
        error.message.includes('unauthorized') ||
        error.message.includes('token')) {
      errorInfo.code = 'AUTHENTICATION_ERROR';
      errorInfo.retryable = false;
    }

    // Timeout errors
    if (error.message.includes('timeout') || 
        error.message.includes('ETIMEDOUT')) {
      errorInfo.code = 'TIMEOUT_ERROR';
      errorInfo.retryable = true;
    }

    return errorInfo;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private static calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const delay = options.delayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    return Math.min(delay, options.maxDelayMs);
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle API errors with proper logging
   */
  static handleApiError(error: Error, context: string): ErrorInfo {
    const errorInfo = ErrorHandler.analyzeError(error);
    
    logger.error(`API Error in ${context}:`, {
      error: errorInfo,
      context,
      stack: error.stack,
    });

    return errorInfo;
  }

  /**
   * Create a user-friendly error message
   */
  static createUserFriendlyMessage(errorInfo: ErrorInfo): string {
    switch (errorInfo.code) {
      case 'AUTHENTICATION_ERROR':
        return 'Authentication failed. Please check your BigID credentials.';
      case 'AUTHORIZATION_ERROR':
        return 'Access denied. You may not have permission to perform this action.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. The server may be busy, please try again.';
      case 'RATE_LIMIT_ERROR':
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 'SERVER_ERROR':
        return 'Server error occurred. Please try again later.';
      case 'NOT_FOUND_ERROR':
        return 'The requested resource was not found.';
      case 'CLIENT_ERROR':
        return 'Invalid request. Please check your parameters and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Validate error response and extract useful information
   */
  static validateErrorResponse(response: any): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code: 'API_ERROR',
      message: 'API request failed',
      retryable: false,
    };

    if (response?.data?.message) {
      errorInfo.message = response.data.message;
    }

    if (response?.status) {
      errorInfo.statusCode = response.status;
      errorInfo.retryable = response.status >= 500 || response.status === 429;
    }

    if (response?.data?.error) {
      errorInfo.details = response.data.error;
    }

    return errorInfo;
  }

  /**
   * Circuit breaker pattern implementation
   */
  static createCircuitBreaker(
    failureThreshold: number = 5,
    timeoutMs: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return {
      async execute<T>(fn: () => Promise<T>): Promise<T> {
        const now = Date.now();

        // Check if circuit is open
        if (state === 'OPEN') {
          if (now - lastFailureTime > timeoutMs) {
            state = 'HALF_OPEN';
            logger.info('Circuit breaker transitioning to HALF_OPEN');
          } else {
            throw new Error('Circuit breaker is OPEN');
          }
        }

        try {
          const result = await fn();
          
          // Success - close circuit if it was half-open
          if (state === 'HALF_OPEN') {
            state = 'CLOSED';
            failures = 0;
            logger.info('Circuit breaker transitioning to CLOSED');
          }
          
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = now;

          if (failures >= failureThreshold) {
            state = 'OPEN';
            logger.warn('Circuit breaker transitioning to OPEN', {
              failures,
              threshold: failureThreshold,
            });
          }

          throw error;
        }
      },

      getState() {
        return state;
      },

      getFailures() {
        return failures;
      },
    };
  }
} 