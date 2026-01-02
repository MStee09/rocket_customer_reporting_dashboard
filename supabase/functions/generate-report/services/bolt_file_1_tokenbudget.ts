// File: supabase/functions/generate-report/services/tokenBudget.ts
// REPLACE the getStatusMessage() method with this version

/**
 * TOKEN BUDGET SERVICE
 * Manages token consumption and provides natural user messages
 */

interface TokenBudgetConfig {
  maxTokens: number;
  warningThresholdPercent: number;
}

export class TokenBudgetService {
  private config: TokenBudgetConfig;
  private tokensUsed: number = 0;

  constructor(config: Partial<TokenBudgetConfig> = {}) {
    this.config = {
      maxTokens: config.maxTokens ?? 50000,
      warningThresholdPercent: config.warningThresholdPercent ?? 80,
    };
  }

  addTokens(count: number): void {
    this.tokensUsed += count;
  }

  getStatus(): { tokensUsed: number; maxTokens: number; percentUsed: number; exhausted: boolean } {
    const percentUsed = (this.tokensUsed / this.config.maxTokens) * 100;
    return {
      tokensUsed: this.tokensUsed,
      maxTokens: this.config.maxTokens,
      percentUsed,
      exhausted: this.tokensUsed >= this.config.maxTokens,
    };
  }

  isExhausted(): boolean {
    return this.tokensUsed >= this.config.maxTokens;
  }

  shouldWarn(): boolean {
    const percentUsed = (this.tokensUsed / this.config.maxTokens) * 100;
    return percentUsed >= this.config.warningThresholdPercent;
  }

  // UPDATED: Natural, user-friendly messages
  getStatusMessage(): string {
    const status = this.getStatus();
    
    if (status.percentUsed >= 100) {
      return "I've gathered enough information to give you a solid answer. Want me to dig deeper into any specific area? Just ask a follow-up question.";
    }
    
    if (status.percentUsed >= this.config.warningThresholdPercent) {
      return "I'm wrapping up my analysis. Let me know if you need more detail on anything specific.";
    }
    
    return '';
  }

  getRemainingTokens(): number {
    return Math.max(0, this.config.maxTokens - this.tokensUsed);
  }

  reset(): void {
    this.tokensUsed = 0;
  }
}
