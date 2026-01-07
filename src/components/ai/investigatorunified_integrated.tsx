/**
 * InvestigatorUnified - AI Analytics with Visualizations
 * 
 * Features:
 * - Auto-routing: Quick/Deep/Visual modes
 * - Inline visualizations: Charts, tables, stats rendered in chat
 * - Product search support
 * - Database-loaded system prompts
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
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Gauge,
  Search,
  Square,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import type { ReportDraft } from '../../ai/investigator/types';

// =============================================================================
// TYPES
// =============================================================================

interface ReasoningStep {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
}

interface FollowUpQuestion {
  id: string;
  question: string;
}

interface Visualization {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'stat' | 'table';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStep[];
  followUpQuestions?: FollowUpQuestion[];
  visualizations?: Visualization[];
  metadata?: {
    processingTimeMs: number;
    toolCallCount: number;
    mode: 'quick' | 'deep' | 'visual';
  };
  timestamp: Date;
}

interface InvestigatorUnifiedProps {
  customerId: string;
  isAdmin: boolean;
  customerName?: string;
  userId?: string;
  userEmail?: string;
  onReportGenerated?: (report: ReportDraft) => void;
  embedded?: boolean;
  initialQuery?: string;
  className?: string;
  onClose?: () => void;
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

// =============================================================================
// VISUALIZATION COMPONENTS
// =============================================================================

function BarChartViz({ data, title }: { data: unknown; title: string }) {
  const vizData = data as { data?: Array<{ label: string; value: number; color?: string }>; format?: string };
  const chartData = vizData.data || [];
  const format = vizData.format || 'number';
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString()}`;
    if (format === 'percent') return `${val}%`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 my-3">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={formatValue} fontSize={12} />
          <YAxis type="category" dataKey="label" fontSize={12} width={75} />
          <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartViz({ data, title }: { data: unknown; title: string }) {
  const vizData = data as { data?: Array<{ label: string; value: number; color?: string }>; format?: string };
  const chartData = vizData.data || [];
  const format = vizData.format || 'number';
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 my-3">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartViz({ data, title }: { data: unknown; title: string }) {
  const vizData = data as { data?: Array<{ label: string; value: number }>; format?: string };
  const chartData = vizData.data || [];
  const format = vizData.format || 'number';
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 my-3">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" fontSize={11} angle={-45} textAnchor="end" height={60} />
          <YAxis tickFormatter={formatValue} fontSize={12} />
          <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
          <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCardViz({ data, title }: { data: unknown; title: string }) {
  const vizData = data as { value?: number; format?: string; comparison?: { value: number; label: string; direction: string } };
  const value = vizData.value ?? 0;
  const format = vizData.format || 'number';
  const comparison = vizData.comparison;
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString()}`;
    if (format === 'percent') return `${val}%`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4 my-3">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{formatValue(value)}</div>
      {comparison && (
        <div className={`flex items-center gap-1 text-sm mt-1 ${
          comparison.direction === 'up' ? 'text-green-600' : 
          comparison.direction === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {comparison.direction === 'up' && <TrendingUp className="w-4 h-4" />}
          {comparison.direction === 'down' && <TrendingDown className="w-4 h-4" />}
          {comparison.direction === 'neutral' && <Minus className="w-4 h-4" />}
          <span>{comparison.value > 0 ? '+' : ''}{comparison.value}% {comparison.label}</span>
        </div>
      )}
    </div>
  );
}

function VizRenderer({ viz }: { viz: Visualization }) {
  switch (viz.type) {
    case 'bar':
      return <BarChartViz data={viz.data} title={viz.title} />;
    case 'pie':
      return <PieChartViz data={viz.data} title={viz.title} />;
    case 'line':
      return <LineChartViz data={viz.data} title={viz.title} />;
    case 'stat':
      return <StatCardViz data={viz.data} title={viz.title} />;
    default:
      return null;
  }
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
  const [currentMode, setCurrentMode] = useState<'quick' | 'deep' | 'visual' | null>(null);
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
  const handleInvestigate = useCallback(async (question: string, forceMode?: 'quick' | 'deep' | 'visual') => {
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

      // Add assistant message with visualizations
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions,
        visualizations: data.visualizations || [],
        metadata: data.metadata,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
      conversationHistoryRef.current.push({ role: 'assistant', content: data.answer });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
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

  // Clear conversation
  const handleClear = () => {
    setConversation([]);
    setCurrentReasoning([]);
    setError(null);
    setCurrentMode(null);
    setUsage({ totalTime: 0, totalTools: 0 });
    conversationHistoryRef.current = [];
    initialQueryProcessedRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-gray-900">The Investigator</span>
            {usage.totalTools > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                {usage.totalTools} tools • {(usage.totalTime / 1000).toFixed(1)}s total
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              showReasoning
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> Reasoning
          </button>
          {conversation.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
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
                  onFollowUp={handleInvestigate}
                />
              ))
            )}

            {/* Live reasoning indicator */}
            {isLoading && (
              <LiveReasoningIndicator steps={currentReasoning} mode={currentMode} />
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 bg-white border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your shipping data..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => abortControllerRef.current?.abort()}
                  className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors"
                >
                  <Square className="w-5 h-5" />
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
            <div className="mt-2 flex gap-2 text-xs text-gray-400">
              <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded">Quick</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">Deep</span>
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">Visual</span>
            </div>
          </div>
        </div>

        {/* Reasoning sidebar */}
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

function ModeIndicator({ mode, isActive }: { mode?: 'quick' | 'deep' | 'visual' | null; isActive?: boolean }) {
  if (!mode) return null;
  
  const config = {
    quick: { bg: 'bg-green-100', text: 'text-green-700', icon: <Zap className="w-3.5 h-3.5" /> },
    deep: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Search className="w-3.5 h-3.5" /> },
    visual: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  };
  const c = config[mode];
  
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${c.bg} ${c.text}`}>
      {c.icon}
      <span className="capitalize">{mode}</span>
      {isActive && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  const suggestions = [
    { emoji: '⚡', text: "What's my average cost per shipment?", mode: 'quick' as const },
    { emoji: '📊', text: 'Visualize freight by product type', mode: 'visual' as const },
    { emoji: '🔍', text: 'Why did my costs increase last month?', mode: 'deep' as const },
    { emoji: '📈', text: 'How has my spend trended over time?', mode: 'deep' as const },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
        <Sparkles className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask me anything</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        I can answer questions, create visualizations, and investigate your shipping data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl text-left text-sm text-gray-700 border border-gray-200 hover:border-orange-300 transition-all"
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="flex-1">{s.text}</span>
            <ModeIndicator mode={s.mode} />
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

      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-4 rounded-xl ${
          isUser ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200'
        }`}>
          {/* Mode badge */}
          {!isUser && message.metadata?.mode && (
            <div className="flex items-center gap-2 mb-2">
              <ModeIndicator mode={message.metadata.mode} />
              <span className="text-xs text-gray-400">
                {(message.metadata.processingTimeMs / 1000).toFixed(1)}s • {message.metadata.toolCallCount} tools
              </span>
            </div>
          )}
          
          <p className={`text-sm whitespace-pre-wrap ${isUser ? '' : 'text-gray-700'}`}>
            {message.content}
          </p>

          {/* Visualizations */}
          {message.visualizations && message.visualizations.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.visualizations.map(viz => (
                <VizRenderer key={viz.id} viz={viz} />
              ))}
            </div>
          )}
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
          <div className="mt-3 space-y-1">
            <div className="text-xs text-gray-400">Follow-up questions:</div>
            {message.followUpQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => onFollowUp(q.question)}
                className="block w-full text-left text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-lg transition-colors"
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

function LiveReasoningIndicator({ steps, mode }: { steps: ReasoningStep[]; mode?: 'quick' | 'deep' | 'visual' | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-xs text-orange-600 mb-3 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{mode === 'quick' ? 'Getting answer...' : mode === 'visual' ? 'Creating visualization...' : 'Investigating...'}</span>
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
