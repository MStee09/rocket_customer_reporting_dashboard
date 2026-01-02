# PHASE 2: TOKEN BUDGET (Cost Control)

## Time: ~10 minutes
## Risk: Low
## Impact: Prevents runaway AI loops from burning through API credits

---

## PASTE 1 of 2: Create Token Budget Service

**Instruction for Bolt:**
> Create new file `supabase/functions/generate-report/services/tokenBudget.ts` with this content:

```typescript
/**
 * TOKEN BUDGET SERVICE
 * Prevents cost runaway in agentic AI loops
 */

const PRICING = {
  inputTokenCost: 0.000003,   // $3 per 1M input tokens
  outputTokenCost: 0.000015,  // $15 per 1M output tokens
};

export interface BudgetConfig {
  maxTotalTokens: number;
  maxCostUsd: number;
  maxTurns: number;
  warningThresholdPercent: number;
}

const DEFAULT_CONFIG: BudgetConfig = {
  maxTotalTokens: 50000,          // 50K total tokens per request
  maxCostUsd: 0.50,               // $0.50 max per request
  maxTurns: 10,                   // Max 10 tool turns
  warningThresholdPercent: 80,
};

export class TokenBudgetService {
  private config: BudgetConfig;
  private tokensUsed: number = 0;
  private costUsed: number = 0;
  private turnCount: number = 0;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return inputTokens * PRICING.inputTokenCost + outputTokens * PRICING.outputTokenCost;
  }

  canProceed(estimatedTokens: number = 10000): { allowed: boolean; reason?: string } {
    if (this.turnCount >= this.config.maxTurns) {
      return { allowed: false, reason: `Maximum turns reached (${this.config.maxTurns})` };
    }

    if (this.tokensUsed + estimatedTokens > this.config.maxTotalTokens) {
      return { allowed: false, reason: `Token budget exhausted (${this.tokensUsed}/${this.config.maxTotalTokens})` };
    }

    const estimatedCost = this.calculateCost(estimatedTokens * 0.3, estimatedTokens * 0.7);
    if (this.costUsed + estimatedCost > this.config.maxCostUsd) {
      return { allowed: false, reason: `Cost budget exhausted ($${this.costUsed.toFixed(4)}/$${this.config.maxCostUsd})` };
    }

    return { allowed: true };
  }

  recordUsage(inputTokens: number, outputTokens: number): void {
    this.tokensUsed += inputTokens + outputTokens;
    this.costUsed += this.calculateCost(inputTokens, outputTokens);
    this.turnCount++;
  }

  getStatus(): { tokensUsed: number; costUsed: number; turnCount: number; percentUsed: number } {
    const tokenPercent = (this.tokensUsed / this.config.maxTotalTokens) * 100;
    const costPercent = (this.costUsed / this.config.maxCostUsd) * 100;
    const turnPercent = (this.turnCount / this.config.maxTurns) * 100;
    return {
      tokensUsed: this.tokensUsed,
      costUsed: this.costUsed,
      turnCount: this.turnCount,
      percentUsed: Math.max(tokenPercent, costPercent, turnPercent),
    };
  }

  getStatusMessage(): string {
    const status = this.getStatus();
    if (status.percentUsed >= 100) {
      return `I've used my analysis budget for this request. Here's what I found so far.`;
    }
    if (status.percentUsed >= this.config.warningThresholdPercent) {
      return `Note: Approaching analysis limit (${Math.round(status.percentUsed)}% used).`;
    }
    return '';
  }

  getTurnCount(): number {
    return this.turnCount;
  }
}

export function createBudgetExhaustedResponse(
  message: string,
  partialResults?: { toolExecutions?: unknown[]; learnings?: unknown[] }
): {
  report: null;
  message: string;
  budgetExhausted: true;
  toolExecutions?: unknown[];
  learnings?: unknown[];
} {
  return {
    report: null,
    message,
    budgetExhausted: true,
    toolExecutions: partialResults?.toolExecutions,
    learnings: partialResults?.learnings,
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
> import { TokenBudgetService, createBudgetExhaustedResponse } from './services/tokenBudget.ts';
> ```
>
> 2. Inside the `if (useTools)` block (around line 768), RIGHT AFTER this line:
> ```typescript
> const MAX_TURNS = 10;
> ```
> ADD this line:
> ```typescript
> const budgetService = new TokenBudgetService();
> ```
>
> 3. Inside the `for (let turn = 0; turn < MAX_TURNS; turn++)` loop, RIGHT AT THE START of the loop (around line 783), ADD this check:
> ```typescript
>       // Check budget before making API call
>       const budgetCheck = budgetService.canProceed();
>       if (!budgetCheck.allowed) {
>         console.log(`[AI] Budget exhausted: ${budgetCheck.reason}`);
>         finalMessage = budgetService.getStatusMessage();
>         break;
>       }
> ```
>
> 4. RIGHT AFTER the `anthropic.messages.create` call (around line 795), after these lines:
> ```typescript
>       totalInputTokens += response.usage.input_tokens;
>       totalOutputTokens += response.usage.output_tokens;
> ```
> ADD this line:
> ```typescript
>       budgetService.recordUsage(response.usage.input_tokens, response.usage.output_tokens);
> ```

---

## ✅ PHASE 2 COMPLETE

**What this does:**
- Stops the AI loop after 50K tokens OR $0.50 OR 10 turns (whichever comes first)
- Returns partial results gracefully instead of failing
- Logs when budget is exhausted

**Test by:**
1. Ask the AI to do something complex that requires many tool calls
2. Check logs for budget tracking messages
3. Verify the AI stops gracefully if it hits limits

**Deploy:**
```bash
supabase functions deploy generate-report
```

---

## Ready for Phase 3?
Phase 3 adds circuit breaker for graceful degradation when Claude API has issues.
