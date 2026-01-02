import { useState } from 'react';
import { Zap, DollarSign, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export interface TokenBudgetStatus {
  tokensUsed: number;
  maxTokens: number;
  costUsed: number;
  maxCost: number;
  turnCount: number;
  maxTurns: number;
  percentUsed: number;
  statusMessage?: string;
}

interface TokenBudgetIndicatorProps {
  status: TokenBudgetStatus | null;
  isVisible?: boolean;
  variant?: 'compact' | 'expanded';
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getProgressBgColor(percent: number): string {
  if (percent >= 90) return 'bg-red-100';
  if (percent >= 70) return 'bg-amber-100';
  return 'bg-emerald-100';
}

export function TokenBudgetIndicator({ status, isVisible = true, variant = 'compact' }: TokenBudgetIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!status || !isVisible) return null;

  const { tokensUsed, maxTokens, costUsed, maxCost, turnCount, maxTurns, percentUsed, statusMessage } = status;

  const tokenPercent = Math.min((tokensUsed / maxTokens) * 100, 100);
  const costPercent = Math.min((costUsed / maxCost) * 100, 100);
  const turnPercent = Math.min((turnCount / maxTurns) * 100, 100);

  const isWarning = percentUsed >= 70;
  const isCritical = percentUsed >= 90;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            isCritical
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : isWarning
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isCritical && <AlertTriangle className="w-3 h-3" />}
          <Zap className="w-3 h-3" />
          <span>{formatTokens(tokensUsed)}</span>
          <span className="text-gray-400">/</span>
          <span>{formatTokens(maxTokens)}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Zap className="w-3.5 h-3.5" />
                    Tokens
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatTokens(tokensUsed)} / {formatTokens(maxTokens)}
                  </span>
                </div>
                <div className={`h-2 rounded-full ${getProgressBgColor(tokenPercent)}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(tokenPercent)}`}
                    style={{ width: `${tokenPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <DollarSign className="w-3.5 h-3.5" />
                    Cost
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCost(costUsed)} / {formatCost(maxCost)}
                  </span>
                </div>
                <div className={`h-2 rounded-full ${getProgressBgColor(costPercent)}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(costPercent)}`}
                    style={{ width: `${costPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Turns
                  </span>
                  <span className="font-medium text-gray-900">
                    {turnCount} / {maxTurns}
                  </span>
                </div>
                <div className={`h-2 rounded-full ${getProgressBgColor(turnPercent)}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(turnPercent)}`}
                    style={{ width: `${turnPercent}%` }}
                  />
                </div>
              </div>

              {statusMessage && (
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${
      isCritical
        ? 'bg-red-50 border-red-200'
        : isWarning
        ? 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`text-sm font-medium ${
          isCritical ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-gray-700'
        }`}>
          Session Budget
        </h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isCritical
            ? 'bg-red-200 text-red-800'
            : isWarning
            ? 'bg-amber-200 text-amber-800'
            : 'bg-gray-200 text-gray-700'
        }`}>
          {Math.round(percentUsed)}% used
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Zap className="w-3.5 h-3.5" />
              Tokens
            </span>
            <span className="font-medium text-gray-900">
              {formatTokens(tokensUsed)} / {formatTokens(maxTokens)}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(tokenPercent)}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(tokenPercent)}`}
              style={{ width: `${tokenPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1.5 text-gray-600">
              <DollarSign className="w-3.5 h-3.5" />
              Cost
            </span>
            <span className="font-medium text-gray-900">
              {formatCost(costUsed)} / {formatCost(maxCost)}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(costPercent)}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(costPercent)}`}
              style={{ width: `${costPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1.5 text-gray-600">
              <RotateCcw className="w-3.5 h-3.5" />
              Turns
            </span>
            <span className="font-medium text-gray-900">
              {turnCount} / {maxTurns}
            </span>
          </div>
          <div className={`h-2 rounded-full ${getProgressBgColor(turnPercent)}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(turnPercent)}`}
              style={{ width: `${turnPercent}%` }}
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <p className={`text-xs mt-3 pt-3 border-t ${
          isCritical
            ? 'text-red-700 border-red-200'
            : isWarning
            ? 'text-amber-700 border-amber-200'
            : 'text-gray-500 border-gray-200'
        }`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
