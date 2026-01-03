export interface TokenBudgetConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  warningThreshold: number;
}

export const DEFAULT_BUDGET_CONFIG: TokenBudgetConfig = {
  maxInputTokens: 100000,
  maxOutputTokens: 32000,
  maxTotalTokens: 130000,
  warningThreshold: 0.8
};

export class TokenBudgetService {
  private config: TokenBudgetConfig;
  private usedInputTokens: number = 0;
  private usedOutputTokens: number = 0;

  constructor(config: Partial<TokenBudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  recordUsage(inputTokens: number, outputTokens: number): void {
    this.usedInputTokens += inputTokens;
    this.usedOutputTokens += outputTokens;
  }

  canProceed(): { allowed: boolean; reason?: string; remaining: number } {
    const totalUsed = this.usedInputTokens + this.usedOutputTokens;
    const remaining = this.config.maxTotalTokens - totalUsed;

    if (this.usedInputTokens >= this.config.maxInputTokens) {
      return { allowed: false, reason: 'Input token limit reached', remaining: 0 };
    }

    if (this.usedOutputTokens >= this.config.maxOutputTokens) {
      return { allowed: false, reason: 'Output token limit reached', remaining: 0 };
    }

    if (totalUsed >= this.config.maxTotalTokens) {
      return { allowed: false, reason: 'Total token limit reached', remaining: 0 };
    }

    return { allowed: true, remaining };
  }

  isNearLimit(): boolean {
    const totalUsed = this.usedInputTokens + this.usedOutputTokens;
    return totalUsed >= this.config.maxTotalTokens * this.config.warningThreshold;
  }

  getUsage(): { input: number; output: number; total: number; percentUsed: number } {
    const total = this.usedInputTokens + this.usedOutputTokens;
    return {
      input: this.usedInputTokens,
      output: this.usedOutputTokens,
      total,
      percentUsed: (total / this.config.maxTotalTokens) * 100
    };
  }

  getStatusMessage(): string {
    const usage = this.getUsage();
    if (usage.percentUsed >= 100) {
      return 'I\'ve reached my analysis limit for this conversation. Please start a new conversation for additional analysis.';
    }
    if (usage.percentUsed >= 80) {
      return `Note: I'm at ${Math.round(usage.percentUsed)}% of my analysis capacity. I'll wrap up soon.`;
    }
    return '';
  }

  reset(): void {
    this.usedInputTokens = 0;
    this.usedOutputTokens = 0;
  }
}

export function createBudgetExhaustedResponse(service: TokenBudgetService): object {
  const usage = service.getUsage();
  return {
    success: false,
    message: service.getStatusMessage(),
    report: null,
    toolExecutions: [],
    usage: {
      inputTokens: usage.input,
      outputTokens: usage.output,
      totalTokens: usage.total,
      budgetExhausted: true
    }
  };
}