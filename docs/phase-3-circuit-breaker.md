# PHASE 3: CIRCUIT BREAKER (Reliability)

## Time: ~10 minutes
## Risk: Low
## Impact: Graceful degradation when Claude API is slow or unavailable

---

## PASTE 1 of 2: Create Circuit Breaker Service

**Instruction for Bolt:**
> Create new file `supabase/functions/generate-report/services/circuitBreaker.ts` with this content:

```typescript
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
  failureThreshold: 5,      // 5 failures to open
  failureWindowMs: 60000,   // within 1 minute
  resetTimeoutMs: 60000,    // wait 1 minute before trying again
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

    // HALF_OPEN - allow one request to test
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

// Singleton instance - persists across warm invocations
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
```

---

## PASTE 2 of 2: Integrate into Edge Function

**Instruction for Bolt:**
> In `supabase/functions/generate-report/index.ts`, make these changes:
>
> 1. Add this import near the top (after the other service imports):
> ```typescript
> import { getClaudeCircuitBreaker, createCircuitOpenResponse } from './services/circuitBreaker.ts';
> ```
>
> 2. Inside the main handler, RIGHT AFTER creating the Anthropic client (around line 766, after `const anthropic = new Anthropic({ apiKey: anthropicApiKey });`), ADD this check:
> ```typescript
>     // Check circuit breaker before making any Claude calls
>     const circuitBreaker = getClaudeCircuitBreaker();
>     if (!circuitBreaker.canExecute()) {
>       console.log('[AI] Circuit breaker OPEN - failing fast');
>       return new Response(
>         JSON.stringify(createCircuitOpenResponse(circuitBreaker.getTimeUntilRetry())),
>         { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
>       );
>     }
> ```
>
> 3. WRAP the `anthropic.messages.create` call (around line 785) in a try/catch that records success/failure. Change FROM:
> ```typescript
>       const response = await anthropic.messages.create({
>         model: "claude-sonnet-4-20250514",
>         max_tokens: 8192,
>         system: fullSystemPrompt,
>         messages: currentMessages,
>         tools: AI_TOOLS,
>         tool_choice: { type: "auto" }
>       });
> ```
> TO:
> ```typescript
>       let response;
>       try {
>         response = await anthropic.messages.create({
>           model: "claude-sonnet-4-20250514",
>           max_tokens: 8192,
>           system: fullSystemPrompt,
>           messages: currentMessages,
>           tools: AI_TOOLS,
>           tool_choice: { type: "auto" }
>         });
>         circuitBreaker.recordSuccess();
>       } catch (apiError) {
>         circuitBreaker.recordFailure(apiError instanceof Error ? apiError : new Error(String(apiError)));
>         throw apiError;
>       }
> ```
>
> 4. Do the same wrap for the NON-tool mode `anthropic.messages.create` call (around line 928). Change FROM:
> ```typescript
>     const response = await anthropic.messages.create({
>       model: "claude-sonnet-4-20250514",
>       max_tokens: 8192,
>       system: fullSystemPrompt,
>       messages,
>     });
> ```
> TO:
> ```typescript
>     let response;
>     try {
>       response = await anthropic.messages.create({
>         model: "claude-sonnet-4-20250514",
>         max_tokens: 8192,
>         system: fullSystemPrompt,
>         messages,
>       });
>       circuitBreaker.recordSuccess();
>     } catch (apiError) {
>       circuitBreaker.recordFailure(apiError instanceof Error ? apiError : new Error(String(apiError)));
>       throw apiError;
>     }
> ```

---

## ✅ PHASE 3 COMPLETE

**What this does:**
- If Claude API fails 5 times in 1 minute, the circuit "opens"
- While open, requests fail immediately with a friendly message (no waiting)
- After 1 minute, it tries one request to see if things are better
- If that works, normal operation resumes

**Test by:**
1. Normal operation should work as before
2. If you want to test the circuit breaker, you could temporarily break the API key

**Deploy:**
```bash
supabase functions deploy generate-report
```

---

## Ready for Phase 4?
Phase 4 adds rate limiting to prevent abuse and ensure fair access.
