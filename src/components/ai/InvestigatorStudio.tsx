import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  HelpCircle,
  Brain,
  Square,
} from 'lucide-react';
import { useInvestigator } from '../../hooks/useInvestigator';
import type {
  ConversationMessage,
  DataInsight,
  ToolExecution,
  ReportDraft,
} from '../../ai/investigator/types';

interface InvestigatorStudioProps {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  onReportGenerated?: (report: ReportDraft) => void;
  embedded?: boolean;
}

export function InvestigatorStudio({
  customerId,
  customerName,
  isAdmin,
  userId,
  userEmail,
  onReportGenerated,
  embedded = false,
}: InvestigatorStudioProps) {
  const [inputValue, setInputValue] = useState('');
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [mode, setMode] = useState<'investigate' | 'build' | 'analyze'>('investigate');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    isLoading,
    error,
    messages,
    insights,
    sendMessage,
    stopGeneration,
    clearConversation,
    needsClarification,
    clarificationQuestion,
    clarificationOptions,
    respondToClarification,
    usage,
  } = useInvestigator({
    customerId,
    customerName,
    isAdmin,
    userId,
    userEmail,
    onReportUpdate: onReportGenerated,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    if (needsClarification) {
      await respondToClarification(message);
    } else {
      await sendMessage(message, mode);
    }
  }, [inputValue, isLoading, needsClarification, respondToClarification, sendMessage, mode]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClarificationOption = async (option: string) => {
    await respondToClarification(option);
  };

  const suggestions = [
    { icon: Search, label: 'Explore my data', action: 'Give me an overview of my shipping data' },
    { icon: TrendingUp, label: 'Find anomalies', action: 'Are there any anomalies in my recent shipments?' },
    { icon: BarChart3, label: 'Build a report', action: 'Create a carrier performance report' },
    { icon: Target, label: 'Cost analysis', action: 'Which lanes are most expensive?' },
  ];

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-200px)] min-h-[500px]'} bg-gray-50 rounded-xl overflow-hidden`}>
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">The Investigator</h2>
              <p className="text-xs text-gray-500">AI-powered logistics analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'investigate', icon: Search, label: 'Investigate' },
                { key: 'build', icon: FileText, label: 'Build Report' },
                { key: 'analyze', icon: BarChart3, label: 'Deep Analysis' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key as 'investigate' | 'build' | 'analyze')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    mode === m.key
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={clearConversation}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Clear conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {usage.totalToolCalls > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {usage.totalToolCalls} tool calls
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${usage.totalCost.toFixed(4)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.round(usage.sessionDuration / 1000)}s session
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
              <Brain className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to investigate
            </h3>
            <p className="text-gray-500 max-w-md mb-6">
              I can explore your data, find anomalies, build reports, and explain what everything means.
              What would you like to know?
            </p>

            <div className="grid grid-cols-2 gap-2 max-w-md">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputValue(suggestion.action);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  <suggestion.icon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                showToolDetails={showToolDetails}
                onToggleToolDetails={() => setShowToolDetails(!showToolDetails)}
              />
            ))}

            {needsClarification && clarificationQuestion && clarificationOptions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <p className="text-amber-800">{clarificationQuestion}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clarificationOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleClarificationOption(option)}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <span className="text-sm">Investigating...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-200 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium text-orange-700 flex-shrink-0">
              {insights.length} insight{insights.length > 1 ? 's' : ''} found:
            </span>
            {insights.slice(-3).map((insight, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  insight.severity === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : insight.severity === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {insight.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border-t p-4">
        {error && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                needsClarification
                  ? 'Type your response...'
                  : mode === 'build'
                  ? 'Describe the report you want to create...'
                  : mode === 'analyze'
                  ? 'What would you like me to analyze?'
                  : 'Ask me anything about your shipping data...'
              }
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all"
              title="Stop generating"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ConversationMessage;
  showToolDetails: boolean;
  onToggleToolDetails: () => void;
}

function MessageBubble({ message, showToolDetails, onToggleToolDetails }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-blue-500'
            : 'bg-gradient-to-br from-orange-500 to-amber-500'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-3 rounded-xl ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200'
          }`}
        >
          <p className={`text-sm whitespace-pre-wrap ${isUser ? '' : 'text-gray-700'}`}>
            {message.content}
          </p>
        </div>

        {!isUser && message.toolExecutions && message.toolExecutions.length > 0 && (
          <div className="mt-2">
            <button
              onClick={onToggleToolDetails}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Zap className="w-3 h-3" />
              {message.toolExecutions.length} tool call{message.toolExecutions.length > 1 ? 's' : ''}
              {showToolDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showToolDetails && (
              <div className="mt-2 space-y-1">
                {message.toolExecutions.map((exec, i) => (
                  <ToolExecutionBadge key={i} execution={exec} />
                ))}
              </div>
            )}
          </div>
        )}

        {!isUser && message.insights && message.insights.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.insights.map((insight, i) => (
              <InsightBadge key={i} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolExecutionBadge({ execution }: { execution: ToolExecution }) {
  const success = !(execution.result as Record<string, unknown>)?.error;

  return (
    <div className="flex items-center gap-2 text-xs bg-gray-50 border rounded-lg px-2 py-1">
      {success ? (
        <CheckCircle className="w-3 h-3 text-green-500" />
      ) : (
        <XCircle className="w-3 h-3 text-red-500" />
      )}
      <span className="font-medium text-gray-700">{execution.toolName}</span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-500">{execution.duration}ms</span>
    </div>
  );
}

function InsightBadge({ insight }: { insight: DataInsight }) {
  const Icon = insight.type === 'anomaly' ? AlertTriangle :
               insight.type === 'trend' ? TrendingUp :
               insight.type === 'recommendation' ? Lightbulb :
               Target;

  const colorClass = insight.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                     insight.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                     'bg-blue-50 border-blue-200 text-blue-700';

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border ${colorClass}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">{insight.title}</p>
        <p className="text-xs opacity-80">{insight.description}</p>
        {insight.suggestedAction && (
          <p className="text-xs mt-1 font-medium">
            - {insight.suggestedAction}
          </p>
        )}
      </div>
    </div>
  );
}

export default InvestigatorStudio;
