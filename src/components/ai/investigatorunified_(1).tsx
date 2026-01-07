/**
 * InvestigatorUnified - Single AI component that auto-routes questions
 * 
 * FIXED: Now properly renders visualizations from edge function!
 * 
 * Simple questions → Quick mode (~5s)
 * Complex questions → Deep mode (~15s)
 * Visual questions → Visual mode with charts
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Loader2,
  Brain,
  Sparkles,
  RefreshCw,
  Wrench,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Gauge,
  Search,
  Square,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Map,
  Grid3X3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Treemap,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
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

// Visualization types from edge function
type VisualizationType = 
  | 'bar' | 'pie' | 'line' | 'area' | 'stat'
  | 'treemap' | 'heatmap' | 'radar' | 'waterfall'
  | 'choropleth' | 'flowmap'
  | 'table';

interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  subtitle?: string;
  data: {
    data?: Array<{ label?: string; name?: string; value: number; color?: string }>;
    value?: number;
    format?: 'number' | 'currency' | 'percent';
    comparison?: { value: number; label: string; direction: string };
    valueLabel?: string;
  };
  config?: Record<string, unknown>;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStep[];
  followUpQuestions?: FollowUpQuestion[];
  visualizations?: Visualization[];  // <-- ADDED!
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

// =============================================================================
// CHART COLORS
// =============================================================================

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];
const HEATMAP_COLORS = ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'];

// =============================================================================
// VISUALIZATION RENDERERS
// =============================================================================

function formatValue(val: number, format?: string): string {
  if (format === 'currency') return `$${val.toLocaleString()}`;
  if (format === 'percent') return `${val}%`;
  return val.toLocaleString();
}

function BarChartViz({ viz }: { viz: Visualization }) {
  const chartData = viz.data.data || [];
  const format = viz.data.format;
  
  if (chartData.length === 0) return null;

  // Normalize data to use 'label' consistently
  const normalizedData = chartData.map(d => ({
    label: d.label || d.name || 'Unknown',
    value: d.value
  }));

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-1 text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-orange-500" />
        {viz.title}
      </h4>
      {viz.subtitle && <p className="text-xs text-slate-500 mb-3">{viz.subtitle}</p>}
      <ResponsiveContainer width="100%" height={Math.max(200, normalizedData.length * 36)}>
        <BarChart data={normalizedData} layout="vertical" margin={{ left: 100, right: 40, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v) => formatValue(v, format)} fontSize={11} />
          <YAxis type="category" dataKey="label" fontSize={11} width={95} tick={{ fill: '#64748b' }} />
          <Tooltip 
            formatter={(value: number) => [formatValue(value, format), 'Value']} 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {normalizedData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartViz({ viz }: { viz: Visualization }) {
  const chartData = viz.data.data || [];
  const format = viz.data.format;
  
  if (chartData.length === 0) return null;

  const normalizedData = chartData.map(d => ({
    label: d.label || d.name || 'Unknown',
    value: d.value
  }));

  const total = normalizedData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-3 text-sm">{viz.title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={normalizedData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={75}
            label={({ label, value }) => `${label} (${((value / total) * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {normalizedData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [formatValue(value, format), 'Value']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {normalizedData.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartViz({ viz }: { viz: Visualization }) {
  const chartData = viz.data.data || [];
  const format = viz.data.format;
  
  if (chartData.length === 0) return null;

  const normalizedData = chartData.map(d => ({
    label: d.label || d.name || '',
    value: d.value
  }));

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-3 text-sm">{viz.title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={normalizedData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" fontSize={10} tick={{ fill: '#64748b' }} />
          <YAxis tickFormatter={(v) => formatValue(v, format)} fontSize={10} tick={{ fill: '#64748b' }} />
          <Tooltip formatter={(value: number) => [formatValue(value, format), 'Value']} />
          <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCardViz({ viz }: { viz: Visualization }) {
  const format = viz.data.format;
  const value = viz.data.value || 0;
  const comparison = viz.data.comparison;

  const CompIcon = comparison?.direction === 'up' ? TrendingUp : 
                   comparison?.direction === 'down' ? TrendingDown : Minus;
  const compColor = comparison?.direction === 'up' ? 'text-green-600' : 
                    comparison?.direction === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3 inline-block min-w-[180px]">
      <div className="text-xs text-slate-500 mb-1">{viz.title}</div>
      <div className="text-2xl font-bold text-slate-900">{formatValue(value, format)}</div>
      {comparison && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs ${compColor}`}>
          <CompIcon className="w-3.5 h-3.5" />
          <span>{comparison.value > 0 ? '+' : ''}{comparison.value}%</span>
          <span className="text-slate-400">{comparison.label}</span>
        </div>
      )}
    </div>
  );
}

function TreemapViz({ viz }: { viz: Visualization }) {
  const chartData = viz.data.data || [];
  const format = viz.data.format;
  
  if (chartData.length === 0) return null;

  const normalizedData = chartData.map(d => ({
    name: d.name || d.label || 'Unknown',
    value: d.value
  }));

  const treemapData = [{ name: 'root', children: normalizedData }];
  const total = normalizedData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-1 text-sm flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-purple-500" />
        {viz.title}
      </h4>
      {viz.subtitle && <p className="text-xs text-slate-500 mb-3">{viz.subtitle}</p>}
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={treemapData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={({ x, y, width, height, name, value, depth }: any) => {
            if (width < 35 || height < 35 || name === 'root') return null;
            const color = CHART_COLORS[depth % CHART_COLORS.length];
            return (
              <g>
                <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={4} />
                {width > 55 && height > 45 && (
                  <>
                    <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
                      {String(name).length > 14 ? String(name).substring(0, 12) + '...' : name}
                    </text>
                    <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={10}>
                      {formatValue(value, format)}
                    </text>
                  </>
                )}
              </g>
            );
          }}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const item = payload[0].payload;
              if (item.name === 'root') return null;
              const percent = ((item.value / total) * 100).toFixed(1);
              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="font-bold text-slate-900">{formatValue(item.value, format)}</div>
                  <div className="text-slate-500">{percent}% of total</div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function HeatmapViz({ viz }: { viz: Visualization }) {
  const chartData = (viz.data.data as Array<{ date?: string; label?: string; value: number }>) || [];
  const valueLabel = viz.data.valueLabel || 'value';
  
  const { weeks, stats } = useMemo(() => {
    if (!chartData.length) return { weeks: [], stats: { min: 0, max: 0 } };

    // Ensure we have date data
    const dateData = chartData.filter(d => d.date || d.label);
    if (!dateData.length) return { weeks: [], stats: { min: 0, max: 0 } };

    const values = dateData.map(d => d.value);
    const stats = { min: Math.min(...values), max: Math.max(...values) };
    
    const sorted = [...dateData].sort((a, b) => 
      (a.date || a.label || '').localeCompare(b.date || b.label || '')
    );
    const dataMap = new Map(sorted.map(d => [d.date || d.label, d.value]));
    
    const startDate = new Date(sorted[0].date || sorted[0].label || '');
    const endDate = new Date(sorted[sorted.length - 1].date || sorted[sorted.length - 1].label || '');
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: Array<Array<{ date: string; value: number | null }>> = [];
    let currentWeek: Array<{ date: string; value: number | null }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      currentWeek.push({ date: dateStr, value: dataMap.get(dateStr) ?? null });
      if (current.getDay() === 6) { weeks.push(currentWeek); currentWeek = []; }
      current.setDate(current.getDate() + 1);
    }
    if (currentWeek.length) weeks.push(currentWeek);
    
    return { weeks, stats };
  }, [chartData]);

  const getColor = (value: number | null): string => {
    if (value === null) return '#f1f5f9';
    const range = stats.max - stats.min || 1;
    const normalized = (value - stats.min) / range;
    const index = Math.min(Math.floor(normalized * HEATMAP_COLORS.length), HEATMAP_COLORS.length - 1);
    return HEATMAP_COLORS[index];
  };

  if (weeks.length === 0) return null;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-3 text-sm">{viz.title}</h4>
      <div className="overflow-x-auto">
        <div className="flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-slate-400"
                  style={{ backgroundColor: getColor(day.value) }}
                  title={`${day.date}: ${day.value !== null ? `${day.value} ${valueLabel}` : 'No data'}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-3 text-xs text-slate-500">
          <span>Less</span>
          {HEATMAP_COLORS.map((color, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />)}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function ChoroplethViz({ viz }: { viz: Visualization }) {
  const chartData = (viz.data.data as Array<{ state?: string; label?: string; name?: string; value: number }>) || [];
  const format = viz.data.format;
  
  if (chartData.length === 0) return null;

  // Display as bar chart for inline view
  const sortedData = [...chartData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(d => ({
      label: d.state || d.label || d.name || 'Unknown',
      value: d.value
    }));

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-1 text-sm flex items-center gap-2">
        <Map className="w-4 h-4 text-blue-500" />
        {viz.title}
      </h4>
      <p className="text-xs text-slate-500 mb-3">Top 10 {viz.subtitle || 'by value'}</p>
      <ResponsiveContainer width="100%" height={Math.max(180, sortedData.length * 28)}>
        <BarChart data={sortedData} layout="vertical" margin={{ left: 50, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v) => formatValue(v, format)} fontSize={10} />
          <YAxis type="category" dataKey="label" fontSize={11} width={45} />
          <Tooltip formatter={(value: number) => [formatValue(value, format), 'Value']} />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FlowMapViz({ viz }: { viz: Visualization }) {
  const flows = (viz.data.data as Array<{ origin?: string; destination?: string; label?: string; value: number }>) || [];
  const format = viz.data.format;
  
  if (flows.length === 0) return null;

  const sortedFlows = [...flows].sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-3">
      <h4 className="font-semibold text-slate-900 mb-1 text-sm flex items-center gap-2">
        <Map className="w-4 h-4 text-green-500" />
        {viz.title}
      </h4>
      <p className="text-xs text-slate-500 mb-3">Top shipping lanes</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left py-2 font-medium">Origin</th>
              <th className="text-left py-2 font-medium">→</th>
              <th className="text-left py-2 font-medium">Destination</th>
              <th className="text-right py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {sortedFlows.map((flow, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-700">{flow.origin || '—'}</td>
                <td className="py-2 text-slate-400">→</td>
                <td className="py-2 text-slate-600">{flow.destination || '—'}</td>
                <td className="py-2 text-right font-mono text-slate-700">{formatValue(flow.value, format)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableViz({ viz }: { viz: Visualization }) {
  const data = viz.data.data || [];
  
  if (data.length === 0) return null;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 my-3 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h4 className="font-semibold text-slate-900 text-sm">{viz.title}</h4>
      </div>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.slice(0, 15).map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2">{row.label || row.name || 'Unknown'}</td>
                <td className="px-4 py-2 text-right font-mono">{formatValue(row.value, viz.data.format)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 15 && (
        <div className="px-4 py-2 bg-slate-100 text-xs text-slate-500 text-center">
          Showing 15 of {data.length} rows
        </div>
      )}
    </div>
  );
}

// Main visualization renderer
function VisualizationRenderer({ viz }: { viz: Visualization }) {
  switch (viz.type) {
    case 'bar': return <BarChartViz viz={viz} />;
    case 'pie': return <PieChartViz viz={viz} />;
    case 'line':
    case 'area': return <LineChartViz viz={viz} />;
    case 'stat': return <StatCardViz viz={viz} />;
    case 'treemap': return <TreemapViz viz={viz} />;
    case 'heatmap': return <HeatmapViz viz={viz} />;
    case 'choropleth': return <ChoroplethViz viz={viz} />;
    case 'flowmap': return <FlowMapViz viz={viz} />;
    case 'table': return <TableViz viz={viz} />;
    default: 
      console.warn('Unknown visualization type:', viz.type);
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentReasoning, setCurrentReasoning] = useState<ReasoningStep[]>([]);
  const [currentMode, setCurrentMode] = useState<'quick' | 'deep' | 'visual' | null>(null);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState(true);
  const [usage, setUsage] = useState({ totalTime: 0, totalTools: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialQueryProcessedRef = useRef(false);

  const lastMessage = conversation.length > 0 ? conversation[conversation.length - 1] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentReasoning]);

  useEffect(() => {
    if (initialQuery && conversation.length === 0 && !isLoading && !initialQueryProcessedRef.current) {
      initialQueryProcessedRef.current = true;
      setInput(initialQuery);
      const timer = setTimeout(() => handleInvestigate(initialQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, conversation.length, isLoading]);

  const handleInvestigate = useCallback(async (question: string, forceMode?: 'quick' | 'deep' | 'visual') => {
    if (!customerId || !question.trim()) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setCurrentReasoning([]);
    setCurrentMode(null);

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
          preferences: { showReasoning: true, forceMode },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Investigation failed');

      const mode = data.metadata?.mode || 'deep';
      setCurrentMode(mode);
      
      const reasoning: ReasoningStep[] = data.reasoning || [];
      setCurrentReasoning(reasoning);
      
      setUsage(prev => ({
        totalTime: prev.totalTime + (data.metadata?.processingTimeMs || 0),
        totalTools: prev.totalTools + (data.metadata?.toolCallCount || 0),
      }));

      // *** THE KEY FIX: Include visualizations! ***
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions,
        visualizations: data.visualizations || [],  // <-- NOW INCLUDED!
        metadata: data.metadata,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
      // Only add to history if there's actual content (prevents API error on follow-ups)
      if (data.answer && data.answer.trim()) {
        conversationHistoryRef.current.push({ role: 'assistant', content: data.answer });
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Investigation failed');
    } finally {
      setIsLoading(false);
      setCurrentReasoning([]);
    }
  }, [customerId, userId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleInvestigate(input.trim());
      setInput('');
    }
  };

  const handleFollowUp = (question: string) => {
    if (!isLoading) handleInvestigate(question);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">AI Investigator</h2>
            <p className="text-xs text-slate-500">
              {usage.totalTime > 0 ? `${(usage.totalTime / 1000).toFixed(1)}s total • ${usage.totalTools} tools` : 'Ask anything about your shipping data'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className={`p-2 rounded-lg transition-colors ${showReasoning ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-100'}`}
            title={showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          >
            <Brain className="w-4 h-4" />
          </button>
          {conversation.length > 0 && (
            <button
              onClick={() => {
                setConversation([]);
                conversationHistoryRef.current = [];
                setUsage({ totalTime: 0, totalTools: 0 });
              }}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
              title="Clear conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 ? (
              <EmptyState onSuggestion={handleFollowUp} />
            ) : (
              conversation.map((msg) => (
                <MessageBubble key={msg.id} message={msg} showReasoning={showReasoning} onFollowUp={handleFollowUp} />
              ))
            )}
            {isLoading && currentReasoning.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
            {isLoading && currentReasoning.length > 0 && <LiveReasoningIndicator steps={currentReasoning} mode={currentMode} />}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your shipping data..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={1}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              />
              {isLoading ? (
                <button type="button" onClick={() => abortControllerRef.current?.abort()} className="p-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors">
                  <Square className="w-5 h-5" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl disabled:opacity-50 transition-all">
                  <Send className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Reasoning sidebar */}
        {showReasoning && lastMessage?.reasoning && lastMessage.reasoning.length > 0 && (
          <div className="hidden lg:flex w-80 border-l bg-white flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Brain className="w-4 h-4 text-orange-500" />
                Reasoning Steps
              </div>
              {lastMessage.metadata && (
                <div className="mt-1 flex gap-3 text-xs text-slate-400">
                  <span>{(lastMessage.metadata.processingTimeMs / 1000).toFixed(1)}s</span>
                  <span>{lastMessage.metadata.toolCallCount} tools</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lastMessage.reasoning.map((step, i) => <ReasoningStepItem key={i} step={step} />)}
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
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    quick: { bg: 'bg-green-100', text: 'text-green-700', icon: <Gauge className="w-3.5 h-3.5" /> },
    deep: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Search className="w-3.5 h-3.5" /> },
    visual: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  };
  const c = config[mode] || config.deep;
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${c.bg} ${c.text}`}>
      {c.icon}<span className="capitalize">{mode}</span>
      {isActive && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  const suggestions = [
    { emoji: '📊', text: 'Show me cost breakdown by carrier', hint: 'visual' },
    { emoji: '📈', text: 'How has my spend trended over time?', hint: 'visual' },
    { emoji: '🗺️', text: 'Which states have the highest costs?', hint: 'visual' },
    { emoji: '🔍', text: 'Why did my costs increase last month?', hint: 'deep' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
        <Sparkles className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">Ask me anything</h3>
      <p className="text-slate-500 mb-6 max-w-md">
        I'll analyze your data and create visualizations automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl text-left text-sm text-slate-700 border border-slate-200 hover:border-orange-300 transition-all"
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="flex-1">{s.text}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.hint === 'visual' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, showReasoning, onFollowUp }: { message: ConversationMessage; showReasoning: boolean; onFollowUp: (q: string) => void }) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  
  // Count visualizations
  const vizCount = message.visualizations?.length || 0;
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-orange-500 to-amber-500'}`}>
        {isUser ? <MessageSquare className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-4 rounded-xl ${isUser ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 shadow-sm'}`}>
          {!isUser && message.metadata?.mode && (
            <div className="flex items-center gap-2 mb-2">
              <ModeIndicator mode={message.metadata.mode} />
              <span className="text-xs text-slate-400">{(message.metadata.processingTimeMs / 1000).toFixed(1)}s</span>
              {vizCount > 0 && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                  {vizCount} chart{vizCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          
          {/* Message text */}
          <div className={`text-sm whitespace-pre-wrap ${isUser ? '' : 'text-slate-700'}`}>
            {message.content}
          </div>

          {/* *** RENDER VISUALIZATIONS *** */}
          {!isUser && message.visualizations && message.visualizations.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.visualizations.map((viz) => (
                <VisualizationRenderer key={viz.id} viz={viz} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile reasoning toggle */}
        {!isUser && message.reasoning && message.reasoning.length > 0 && showReasoning && (
          <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 lg:hidden">
            <Brain className="w-3 h-3" /> {message.reasoning.length} steps {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {expanded && message.reasoning && (
          <div className="mt-2 space-y-2 lg:hidden">
            {message.reasoning.map((step, i) => <ReasoningStepItem key={i} step={step} compact />)}
          </div>
        )}

        {/* Follow-up questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="mt-3 space-y-1">
            {message.followUpQuestions.map((q) => (
              <button key={q.id} onClick={() => onFollowUp(q.question)} className="block w-full text-left text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-lg transition-colors">
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
      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="text-xs text-orange-600 mb-3 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Investigating...</span>
          {mode && <ModeIndicator mode={mode} isActive />}
        </div>
        <div className="space-y-2">{steps.slice(-4).map((step, i) => <ReasoningStepItem key={i} step={step} compact />)}</div>
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
        {step.toolName && <span className="text-xs text-slate-400 font-mono">{step.toolName}</span>}
        <span className={`text-slate-600 ${compact ? 'line-clamp-2' : ''} block`}>{step.content}</span>
      </div>
    </div>
  );
}

export default InvestigatorUnified;
