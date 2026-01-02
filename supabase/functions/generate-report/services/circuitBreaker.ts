/**
 * CIRCUIT BREAKER SERVICE
 * Provides graceful degradation when Claude API is unavailable
 *
 * States:
 * - CLOSED: Normal operation
 * - OPEN: Failing fast (too many recent failures)
 * - HALF_OPEN: Testing recovery
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  resetTimeoutMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowMs: 60000,
  resetTimeoutMs: 60000,
};

class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private openedAt?: number;
  private halfOpenSuccesses: number = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  canExecute(): boolean {
    this.cleanupOldFailures();

    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (this.openedAt && Date.now() - this.openedAt >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        console.log('[CircuitBreaker] OPEN -> HALF_OPEN');
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= 2) {
        this.state = 'CLOSED';
        this.failures = [];
        console.log('[CircuitBreaker] HALF_OPEN -> CLOSED');
      }
    }
  }

  recordFailure(error?: Error): void {
    this.failures.push(Date.now());
    console.error(`[CircuitBreaker] Failure: ${error?.message || 'Unknown'}`);

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.log('[CircuitBreaker] HALF_OPEN -> OPEN');
      return;
    }

    if (this.state === 'CLOSED' && this.getRecentFailures().length >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.log('[CircuitBreaker] CLOSED -> OPEN');
    }
  }

  getTimeUntilRetry(): number {
    if (this.state !== 'OPEN' || !this.openedAt) return 0;
    return Math.max(0, this.config.resetTimeoutMs - (Date.now() - this.openedAt));
  }

  getState(): CircuitState {
    return this.state;
  }

  private getRecentFailures(): number[] {
    const windowStart = Date.now() - this.config.failureWindowMs;
    return this.failures.filter(t => t >= windowStart);
  }

  private cleanupOldFailures(): void {
    const windowStart = Date.now() - this.config.failureWindowMs;
    this.failures = this.failures.filter(t => t >= windowStart);
  }
}

let _instance: CircuitBreaker | null = null;

export function getClaudeCircuitBreaker(): CircuitBreaker {
  if (!_instance) {
    _instance = new CircuitBreaker();
  }
  return _instance;
}

export function createCircuitOpenResponse(retryAfterMs: number): {
  success: false;
  error: string;
  message: string;
  retryAfterSeconds: number;
} {
  return {
    success: false,
    error: 'ai_temporarily_unavailable',
    message: "AI analysis is temporarily unavailable. Please try again in a few minutes.",
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
}