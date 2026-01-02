const PRICING = {
  inputTokenCost: 0.000003,
  outputTokenCost: 0.000015,
};

export interface BudgetConfig {
  maxTotalTokens: number;
  maxCostUsd: number;
  maxTurns: number;
  warningThresholdPercent: number;
}

const DEFAULT_CONFIG: BudgetConfig = {
  maxTotalTokens: 50000,
  maxCostUsd: 0.50,
  maxTurns: 10,
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