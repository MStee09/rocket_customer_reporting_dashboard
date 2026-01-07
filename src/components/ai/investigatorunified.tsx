/**
 * InvestigatorUnified - Single AI component that auto-routes questions
 * 
 * This replaces both InvestigatorStudio (V1) and InvestigatorV3 (V3).
 * Simple questions → Quick mode (~5s)
 * Complex questions → Deep mode (~15s)
 * 
 * The AI automatically decides which mode to use based on the question.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  Gauge,
  Search,
  Square,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ReportDraft } from '../../ai/investigator/types';

// =============================================================================
// TYPES
// =============================================================================

interface ReasoningStep {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'routing';
  content: string;
  toolName?: string;
}

interface FollowUpQuestion {
  id: string;
  question: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStep[];
  followUpQuestions?: FollowUpQuestion[];
  metadata?: {
    processingTimeMs: number;
    toolCallCount: number;
    mode: 'quick' | 'deep';
  };
  timestamp: Date;
}

interface InvestigatorUnifiedProps {
  // Required props (matching InvestigatorStudio interface)
  customerId: string;
  isAdmin: boolean;
  // Optional props
  customerName?: string;
  userId?: string;
  userEmail?: string;
  onReportGenerated?: (report: ReportDraft) => void;
  embedded?: boolean;
  initialQuery?: string;
  className?: string;
  onClose?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InvestigatorUnified({
  customerId,
  customerName,
  isAdmin,
  userId,
  userEmail,
  onReportGenerated,
  embedded = false,
  initialQuery,
  className = '',
  onClose,
}: InvestigatorUnifiedProps) {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentReasoning, setCurrentReasoning] = useState<ReasoningStep[]>([]);
  const [currentMode, setCurrentMode] = useState<'quick' | 'deep' | null>(null);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState(true);
  const [usage, setUsage] = useState({ totalTime: 0, totalTools: 0 });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialQueryProcessedRef = useRef(false);

  const lastMessage = conversation.length > 0 ? conversation[conversation.length - 1] : null;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentReasoning]);

  // Handle initial query
  useEffect(() => {
    if (initialQuery && conversation.length === 0 && !isLoading && !initialQueryProcessedRef.current) {
      initialQueryProcessedRef.current = true;
      setInput(initialQuery);
      const timer = setTimeout(() => {
        handleInvestigate(initialQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, conversation.length, isLoading]);

  // Main investigate function
  const handleInvestigate = useCallback(async (question: string, forceMode?: 'quick' | 'deep') => {
    if (!customerId || !question.trim()) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setCurrentReasoning([]);
    setCurrentMode(null);

    // Add user message immediately
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, userMessage]);
    conversationHistoryRef.current.push({ role: 'user', content: question });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Call the unified investigate edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question,
          customerId,
          userId,
          conversationHistory: conversationHistoryRef.current.slice(-10),
          preferences: {
            showReasoning: true,
            forceMode,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Investigation failed');
      }

      // Update mode indicator
      const mode = data.metadata?.mode || 'deep';
      setCurrentMode(mode);

      // Process reasoning steps
      const reasoning: ReasoningStep[] = data.reasoning || [];
      setCurrentReasoning(reasoning);

      // Update usage stats
      setUsage(prev => ({
        totalTime: prev.totalTime + (data.metadata?.processingTimeMs || 0),
        totalTools: prev.totalTools + (data.metadata?.toolCallCount || 0),
      }));

      // Add assistant message
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions,
        metadata: data.metadata,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
      conversationHistoryRef.current.push({ role: 'assistant', content: data.answer });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      const errorMessage = err instanceof Error ? err.message : 'Investigation failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setCurrentReasoning([]);
    }
  }, [customerId, userId]);

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleInvestigate(input);
      setInput('');
    }
  };

  // Stop generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Clear conversation
  const handleClear = () => {
    setConversation([]);
    setCurrentReasoning([]);
    setError(null);
    setCurrentMode(null);
    setUsage({ totalTime: 0, totalTools: 0 });
    conversationHistoryRef.current = [];
  };

  // Follow-up click
  const handleFollowUp = (question: string) => {
    if (!isLoading) {
      handleInvestigate(question);
    }
  };

  // Key press handler
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-200px)] min-h-[500px]'} bg-slate-50 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">The Investigator</h2>
              <p className="text-xs text-gray-500">
                {currentMode === 'quick' ? 'Quick answer' : currentMode === 'deep' ? 'Deep analysis' : 'AI-powered analysis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode indicator */}
            {(isLoading || lastMessage?.metadata?.mode) && (
              <ModeIndicator 
                mode={isLoading ? currentMode : lastMessage?.metadata?.mode} 
                isActive={isLoading}
              />
            )}
            
            {/* Reasoning toggle */}
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                showReasoning
                  ? 'bg-orange-100 text-orange-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reasoning</span>
            </button>

            {/* Clear button */}
            {conversation.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Clear conversation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Usage stats */}
        {usage.totalTools > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {usage.totalTools} tool calls
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.round(usage.totalTime / 1000)}s total
            </span>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 ? (
              <EmptyState onSuggestion={handleInvestigate} />
            ) : (
              conversation.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg}
                  showReasoning={showReasoning}
                  onFollowUp={handleFollowUp}
                />
              ))
            )}

            {/* Live reasoning during investigation */}
            {isLoading && currentReasoning.length > 0 && (
              <LiveReasoningIndicator steps={currentReasoning} mode={currentMode} />
            )}

            {/* Loading indicator */}
            {isLoading && currentReasoning.length === 0 && (
              <div className="flex items-center gap-3 text-gray-500 p-4 bg-white rounded-xl border">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm">Analyzing your question...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="bg-white border-t p-4">
            {error && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask anything about your shipping data..."
                  rows={1}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  title="Stop"
                >
                  <Square className="w-5 h-5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Reasoning sidebar (optional) */}
        {showReasoning && lastMessage?.reasoning && lastMessage.reasoning.length > 0 && (
          <div className="hidden lg:flex w-80 border-l bg-white flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Brain className="w-4 h-4 text-orange-500" />
                Reasoning Steps
              </div>
              {lastMessage.metadata && (
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  <span>{(lastMessage.metadata.processingTimeMs / 1000).toFixed(1)}s</span>
                  <span>{lastMessage.metadata.toolCallCount} tools</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lastMessage.reasoning.map((step, i) => (
                <ReasoningStepItem key={i} step={step} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ModeIndicator({ mode, isActive }: { mode?: 'quick' | 'deep' | null; isActive?: boolean }) {
  if (!mode) return null;
  
  const isQuick = mode === 'quick';
  
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
      isQuick 
        ? 'bg-green-100 text-green-700' 
        : 'bg-purple-100 text-purple-700'
    }`}>
      {isQuick ? <Gauge className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
      <span>{isQuick ? 'Quick' : 'Deep'}</span>
      {isActive && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  const suggestions = [
    { emoji: '⚡', text: "What's my average cost per shipment?", hint: 'quick' },
    { emoji: '📊', text: 'Which carrier handles the most volume?', hint: 'quick' },
    { emoji: '🔍', text: 'Why did my costs increase last month?', hint: 'deep' },
    { emoji: '📈', text: 'How has my spend trended over time?', hint: 'deep' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
        <Sparkles className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask me anything</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        Simple questions get fast answers. Complex questions get thorough investigations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl text-left text-sm text-gray-700 border border-gray-200 hover:border-orange-300 transition-all group"
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="flex-1">{s.text}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              s.hint === 'quick' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
            }`}>
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ 
  message, 
  showReasoning,
  onFollowUp 
}: { 
  message: ConversationMessage;
  showReasoning: boolean;
  onFollowUp: (q: string) => void;
}) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-orange-500 to-amber-500'
      }`}>
        {isUser ? (
          <MessageSquare className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-3 rounded-xl ${
          isUser ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200'
        }`}>
          {/* Mode badge */}
          {!isUser && message.metadata?.mode && (
            <div className="flex items-center gap-2 mb-2">
              <ModeIndicator mode={message.metadata.mode} />
              <span className="text-xs text-gray-400">
                {(message.metadata.processingTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}
          
          <p className={`text-sm whitespace-pre-wrap ${isUser ? '' : 'text-gray-700'}`}>
            {message.content}
          </p>
        </div>

        {/* Inline reasoning toggle (mobile) */}
        {!isUser && message.reasoning && message.reasoning.length > 0 && showReasoning && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <Brain className="w-3 h-3" />
            {message.reasoning.length} reasoning steps
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {/* Expanded reasoning (mobile) */}
        {expanded && message.reasoning && (
          <div className="mt-2 space-y-2 lg:hidden">
            {message.reasoning.map((step, i) => (
              <ReasoningStepItem key={i} step={step} compact />
            ))}
          </div>
        )}

        {/* Follow-up questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-gray-400">Follow-up questions:</div>
            {message.followUpQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => onFollowUp(q.question)}
                className="block w-full text-left text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {q.question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveReasoningIndicator({ steps, mode }: { steps: ReasoningStep[]; mode?: 'quick' | 'deep' | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-xs text-orange-600 mb-3 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{mode === 'quick' ? 'Getting answer...' : 'Investigating...'}</span>
          {mode && <ModeIndicator mode={mode} isActive />}
        </div>
        <div className="space-y-2">
          {steps.slice(-4).map((step, i) => (
            <ReasoningStepItem key={i} step={step} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReasoningStepItem({ step, compact = false }: { step: ReasoningStep; compact?: boolean }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    routing: { icon: <Gauge className="w-3 h-3" />, color: 'text-cyan-600 bg-cyan-50' },
    thinking: { icon: <Brain className="w-3 h-3" />, color: 'text-blue-600 bg-blue-50' },
    tool_call: { icon: <Wrench className="w-3 h-3" />, color: 'text-amber-600 bg-amber-50' },
    tool_result: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-600 bg-green-50' },
  };
  const { icon, color } = config[step.type] || config.thinking;

  return (
    <div className="flex items-start gap-2 text-sm">
      <div className={`p-1 rounded ${color} flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        {step.toolName && (
          <span className="text-xs text-gray-400 font-mono">{step.toolName}</span>
        )}
        <span className={`text-gray-600 ${compact ? 'line-clamp-2' : ''} block`}>
          {step.content}
        </span>
      </div>
    </div>
  );
}

export default InvestigatorUnified;
