export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccesses: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 3,
      resetTimeoutMs: config.resetTimeoutMs ?? 60000,
      halfOpenRequests: config.halfOpenRequests ?? 2
    };
  }

  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log('[CircuitBreaker] Transitioning to CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log('[CircuitBreaker] HALF_OPEN failure, returning to OPEN');
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.log(`[CircuitBreaker] Threshold reached (${this.failureCount}), transitioning to OPEN`);
    }

    console.error('[CircuitBreaker] Recorded failure:', error.message);
  }

  getState(): CircuitState {
    return this.state;
  }

  getTimeUntilRetry(): number {
    if (this.state !== 'OPEN') return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.config.resetTimeoutMs - elapsed);
  }
}

let claudeCircuitBreaker: CircuitBreaker | null = null;

export function getClaudeCircuitBreaker(): CircuitBreaker {
  if (!claudeCircuitBreaker) {
    claudeCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      halfOpenRequests: 2
    });
  }
  return claudeCircuitBreaker;
}

export function createCircuitOpenResponse(retryAfterMs: number): object {
  return {
    success: false,
    error: 'service_unavailable',
    message: 'The AI service is temporarily unavailable. Please try again in a moment.',
    retryAfterMs,
    report: null,
    toolExecutions: []
  };
}