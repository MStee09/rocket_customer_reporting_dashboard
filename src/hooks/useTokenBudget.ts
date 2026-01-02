import { useState, useCallback, useMemo } from 'react';
import type { TokenBudgetStatus } from '../components/ai-studio/TokenBudgetIndicator';

interface BudgetConfig {
  maxTotalTokens: number;
  maxCostUsd: number;
  maxTurns: number;
  warningThresholdPercent: number;
}

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  latencyMs: number;
}

const DEFAULT_CONFIG: BudgetConfig = {
  maxTotalTokens: 50000,
  maxCostUsd: 0.50,
  maxTurns: 10,
  warningThresholdPercent: 80,
};

const SESSION_KEY = 'ai_token_budget_session';

interface SessionState {
  tokensUsed: number;
  costUsed: number;
  turnCount: number;
  sessionId: string;
  startedAt: string;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadSessionState(): SessionState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as SessionState;
    const startTime = new Date(state.startedAt).getTime();
    const maxAge = 30 * 60 * 1000;

    if (Date.now() - startTime > maxAge) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

function saveSessionState(state: SessionState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
  }
}

export function useTokenBudget(config: Partial<BudgetConfig> = {}) {
  const budgetConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const existing = loadSessionState();
    if (existing) return existing;

    return {
      tokensUsed: 0,
      costUsed: 0,
      turnCount: 0,
      sessionId: generateSessionId(),
      startedAt: new Date().toISOString(),
    };
  });

  const status: TokenBudgetStatus = useMemo(() => {
    const tokenPercent = (sessionState.tokensUsed / budgetConfig.maxTotalTokens) * 100;
    const costPercent = (sessionState.costUsed / budgetConfig.maxCostUsd) * 100;
    const turnPercent = (sessionState.turnCount / budgetConfig.maxTurns) * 100;
    const percentUsed = Math.max(tokenPercent, costPercent, turnPercent);

    let statusMessage: string | undefined;
    if (percentUsed >= 100) {
      statusMessage = "I've gathered enough information to give you a solid answer. Want me to dig deeper into any specific area?";
    } else if (percentUsed >= budgetConfig.warningThresholdPercent) {
      statusMessage = "I'm wrapping up my analysis. Let me know if you need more detail on anything specific.";
    }

    return {
      tokensUsed: sessionState.tokensUsed,
      maxTokens: budgetConfig.maxTotalTokens,
      costUsed: sessionState.costUsed,
      maxCost: budgetConfig.maxCostUsd,
      turnCount: sessionState.turnCount,
      maxTurns: budgetConfig.maxTurns,
      percentUsed,
      statusMessage,
    };
  }, [sessionState, budgetConfig]);

  const recordUsage = useCallback((usage: UsageData) => {
    setSessionState((prev) => {
      const newState: SessionState = {
        ...prev,
        tokensUsed: prev.tokensUsed + usage.totalTokens,
        costUsed: prev.costUsed + usage.totalCostUsd,
        turnCount: prev.turnCount + 1,
      };
      saveSessionState(newState);
      return newState;
    });
  }, []);

  const canProceed = useCallback((estimatedTokens: number = 10000): { allowed: boolean; reason?: string } => {
    if (sessionState.turnCount >= budgetConfig.maxTurns) {
      return { allowed: false, reason: `Maximum turns reached (${budgetConfig.maxTurns})` };
    }

    if (sessionState.tokensUsed + estimatedTokens > budgetConfig.maxTotalTokens) {
      return { allowed: false, reason: `Token budget exhausted` };
    }

    const estimatedCost = estimatedTokens * 0.000003 * 0.3 + estimatedTokens * 0.000015 * 0.7;
    if (sessionState.costUsed + estimatedCost > budgetConfig.maxCostUsd) {
      return { allowed: false, reason: `Cost budget exhausted` };
    }

    return { allowed: true };
  }, [sessionState, budgetConfig]);

  const resetSession = useCallback(() => {
    const newState: SessionState = {
      tokensUsed: 0,
      costUsed: 0,
      turnCount: 0,
      sessionId: generateSessionId(),
      startedAt: new Date().toISOString(),
    };
    setSessionState(newState);
    saveSessionState(newState);
  }, []);

  const isWarning = status.percentUsed >= budgetConfig.warningThresholdPercent;
  const isExhausted = status.percentUsed >= 100;

  return {
    status,
    recordUsage,
    canProceed,
    resetSession,
    isWarning,
    isExhausted,
    sessionId: sessionState.sessionId,
    config: budgetConfig,
  };
}

export type { BudgetConfig, UsageData, SessionState };
