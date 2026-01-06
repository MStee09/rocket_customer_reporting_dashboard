import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Brain,
  Sparkles,
  RefreshCw,
  Wrench,
  CheckCircle2,
  Clock,
  Zap,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { useInvestigatorV3, ReasoningStepV3, ConversationMessageV3 } from '../../hooks/useInvestigatorV3';
import { useAuth } from '../../contexts/AuthContext';

interface InvestigatorV3Props {
  className?: string;
  onClose?: () => void;
}

export function InvestigatorV3({ className = '', onClose }: InvestigatorV3Props) {
  const { effectiveCustomerId, user } = useAuth();

  const {
    isInvestigating,
    error,
    conversation,
    currentReasoning,
    investigate,
    clearConversation,
    lastInvestigation,
  } = useInvestigatorV3({
    customerId: effectiveCustomerId ? String(effectiveCustomerId) : undefined,
    userId: user?.id,
    showReasoning: true,
  });

  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentReasoning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isInvestigating) {
      investigate(input);
      setInput('');
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-lg border border-orange-500/20">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <span className="font-semibold text-white">Investigator</span>
            <span className="ml-2 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              v3 - Deep Analysis
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              showReasoning
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'text-white/40 hover:text-white/60 hover:bg-slate-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> Reasoning
          </button>
          {conversation.length > 0 && (
            <button
              onClick={clearConversation}
              className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 ? (
              <EmptyState onSuggestion={investigate} />
            ) : (
              conversation.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}

            {isInvestigating && currentReasoning.length > 0 && (
              <LiveReasoning steps={currentReasoning} />
            )}

            {isInvestigating && currentReasoning.length === 0 && (
              <div className="flex items-center gap-3 text-white/50 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                <span>Starting investigation...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-900/30">
            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to investigate something..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 border border-slate-700"
                disabled={isInvestigating}
              />
              <button
                type="submit"
                disabled={isInvestigating || !input.trim()}
                className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20"
              >
                {isInvestigating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>

        {/* Reasoning Panel */}
        {showReasoning && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Brain className="w-4 h-4 text-orange-400" />
                Reasoning Process
                {isInvestigating && <span className="ml-auto w-2 h-2 bg-orange-400 rounded-full animate-pulse" />}
              </div>
              {lastInvestigation?.metadata && !isInvestigating && (
                <div className="mt-2 flex gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(lastInvestigation.metadata.processingTimeMs / 1000).toFixed(1)}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {lastInvestigation.metadata.toolCallCount} tools
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(isInvestigating ? currentReasoning : conversation[conversation.length - 1]?.reasoning || []).length === 0 ? (
                <div className="text-center text-white/30 text-sm py-8">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Reasoning steps will appear here as the AI investigates
                </div>
              ) : (
                <div className="space-y-3">
                  {(isInvestigating ? currentReasoning : conversation[conversation.length - 1]?.reasoning || []).map((step, i) => (
                    <ReasoningStepItem key={i} step={step} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  const suggestions = [
    { emoji: '📈', text: 'Why did my costs spike last month?' },
    { emoji: '🚛', text: 'Which carriers are most expensive?' },
    { emoji: '🗺️', text: 'Where am I spending the most?' },
    { emoji: '📊', text: 'How has my spend trended over time?' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl mb-4 border border-orange-500/20">
        <Sparkles className="w-8 h-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">I'm your logistics analyst</h3>
      <p className="text-white/50 mb-6 max-w-md">
        Ask me to investigate your shipping data. I'll dig in, form hypotheses, test them, and explain what I find.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-left text-sm text-white/70 hover:text-white border border-slate-700/50 hover:border-orange-500/30 transition-all group"
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="flex-1">{s.text}</span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessageV3 }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${isUser ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
        {isUser ? (
          <MessageSquare className="w-4 h-4 text-blue-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-orange-400" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-xl p-4 ${
          isUser
            ? 'bg-blue-500/10 text-white border border-blue-500/20'
            : 'bg-slate-800/50 text-white/90 border border-slate-700/50'
        }`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        </div>
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.followUpQuestions.map((q) => (
              <div key={q.id} className="text-xs text-orange-400/70 bg-orange-500/5 px-3 py-1.5 rounded-lg border border-orange-500/10">
                {q.question}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveReasoning({ steps }: { steps: ReasoningStepV3[] }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-orange-500/20 flex-shrink-0">
        <Brain className="w-4 h-4 text-orange-400" />
      </div>
      <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="text-xs text-orange-400 mb-3 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Investigating...</span>
          <span className="text-white/30">({steps.length} steps)</span>
        </div>
        <div className="space-y-2">
          {steps.slice(-5).map((step, i) => <ReasoningStepItem key={i} step={step} compact />)}
        </div>
      </div>
    </div>
  );
}

function ReasoningStepItem({ step, compact = false }: { step: ReasoningStepV3; compact?: boolean }) {
  const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    thinking: {
      icon: <Brain className="w-3 h-3" />,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      label: 'Thinking'
    },
    tool_call: {
      icon: <Wrench className="w-3 h-3" />,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      label: 'Using tool'
    },
    tool_result: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      color: 'text-green-400 bg-green-500/10 border-green-500/20',
      label: 'Result'
    },
  };
  const { icon, color } = config[step.type] || config.thinking;

  return (
    <div className="flex items-start gap-2 text-sm">
      <div className={`p-1 rounded border ${color} flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        {step.toolName && (
          <span className="text-xs text-white/40 font-mono">{step.toolName}</span>
        )}
        <span className={`text-white/70 ${compact ? "line-clamp-2" : ""} block`}>
          {step.content}
        </span>
      </div>
    </div>
  );
}

export default InvestigatorV3;
