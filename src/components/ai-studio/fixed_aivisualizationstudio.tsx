import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, X, Check, Plus, BarChart3 } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type VisualizationType =
  | 'bar' | 'horizontal_bar' | 'grouped_bar' | 'stacked_bar'
  | 'line' | 'area' | 'stacked_area'
  | 'pie' | 'donut'
  | 'scatter' | 'bubble'
  | 'heatmap' | 'treemap'
  | 'table';

export interface VisualizationConfig {
  type: VisualizationType;
  title: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  metrics?: string[];
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  sortOrder?: 'asc' | 'desc' | 'none';
  limit?: number;
}

interface VisualizationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualization?: VisualizationConfig;
}

interface AIVisualizationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: Record<string, unknown>[];
  availableColumns: string[];
  reportName: string;
  reportId?: string;
  onAddVisualization: (config: VisualizationConfig) => void;
  onAddToDashboard?: (config: VisualizationConfig) => void;
}

function generatePreviewData(
  config: VisualizationConfig,
  sourceData: Record<string, unknown>[]
): Array<{ label: string; value: number }> {
  if (!sourceData.length) {
    const sampleLabels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    return sampleLabels.map((label) => ({
      label,
      value: Math.floor(Math.random() * 100) + 20,
    }));
  }

  const groupField = config.groupBy || config.xAxis;
  const metricField = config.yAxis || (config.metrics?.[0]);

  if (!groupField || !metricField) {
    return sourceData.slice(0, config.limit || 10).map((row, i) => ({
      label: String(row[Object.keys(row)[0]] || `Item ${i + 1}`),
      value: Number(row[Object.keys(row)[1]]) || Math.floor(Math.random() * 100),
    }));
  }

  const aggregated = new Map<string, number>();
  sourceData.forEach(row => {
    const key = String(row[groupField] || 'Unknown');
    const value = Number(row[metricField]) || 0;
    aggregated.set(key, (aggregated.get(key) || 0) + value);
  });

  let result = Array.from(aggregated.entries()).map(([label, value]) => ({
    label,
    value,
  }));

  if (config.sortOrder === 'desc') {
    result.sort((a, b) => b.value - a.value);
  } else if (config.sortOrder === 'asc') {
    result.sort((a, b) => a.value - b.value);
  }

  if (config.limit) {
    result = result.slice(0, config.limit);
  }

  return result;
}

function ChartPreview({
  config,
  data
}: {
  config: VisualizationConfig;
  data: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (config.type === 'bar' || config.type === 'horizontal_bar') {
    const isHorizontal = config.type === 'horizontal_bar';

    return (
      <div className={`space-y-3 ${isHorizontal ? '' : 'flex items-end gap-2 h-48'}`}>
        {data.map((item, index) => (
          <div
            key={index}
            className={isHorizontal ? 'flex items-center gap-3' : 'flex flex-col items-center flex-1'}
          >
            {isHorizontal ? (
              <>
                <div className="w-20 text-xs text-gray-600 truncate text-right">
                  {item.label}
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded transition-all duration-500"
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-gray-700 font-medium">
                  {item.value.toLocaleString()}
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-full bg-gradient-to-t from-orange-400 to-orange-500 rounded-t transition-all duration-500"
                  style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '4px' }}
                />
                <div className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                  {item.label}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (config.type === 'pie' || config.type === 'donut') {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = ['#f97316', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center gap-6">
        <svg viewBox="0 0 100 100" className="w-40 h-40">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);

            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const pathD = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return (
              <path
                key={index}
                d={pathD}
                fill={colors[index % colors.length]}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
          {config.type === 'donut' && (
            <circle cx="50" cy="50" r="20" fill="white" />
          )}
        </svg>
        <div className="space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-gray-600">{item.label}</span>
              <span className="text-gray-900 font-medium">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.type === 'line' || config.type === 'area') {
    const padding = 20;
    const width = 300;
    const height = 150;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const points = data.map((item, index) => ({
      x: padding + (index / (data.length - 1 || 1)) * graphWidth,
      y: height - padding - (item.value / maxValue) * graphHeight,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {config.type === 'area' && (
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            className="transition-all duration-500"
          />
        )}
        <path
          d={linePath}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          className="transition-all duration-500"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#f97316"
            className="transition-all duration-300"
          />
        ))}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className="overflow-auto max-h-48">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Label</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 px-3 text-gray-800">{item.label}</td>
              <td className="py-2 px-3 text-gray-800 text-right font-medium">
                {item.value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseVisualizationFromResponse(content: string): VisualizationConfig | null {
  const lowerContent = content.toLowerCase();

  let type: VisualizationType = 'bar';
  if (lowerContent.includes('pie')) type = 'pie';
  else if (lowerContent.includes('donut')) type = 'donut';
  else if (lowerContent.includes('line')) type = 'line';
  else if (lowerContent.includes('area')) type = 'area';
  else if (lowerContent.includes('horizontal')) type = 'horizontal_bar';
  else if (lowerContent.includes('table')) type = 'table';

  let sortOrder: 'asc' | 'desc' | 'none' = 'desc';
  if (lowerContent.includes('lowest') || lowerContent.includes('ascending')) sortOrder = 'asc';

  let limit: number | undefined;
  const limitMatch = lowerContent.match(/top\s*(\d+)|(\d+)\s*(?:items?|rows?|results?)/);
  if (limitMatch) {
    limit = parseInt(limitMatch[1] || limitMatch[2], 10);
  }

  let groupBy: string | undefined;
  const groupByPatterns = [
    /by\s+(\w+)/i,
    /group(?:ed)?\s+by\s+(\w+)/i,
    /per\s+(\w+)/i,
  ];
  for (const pattern of groupByPatterns) {
    const match = content.match(pattern);
    if (match) {
      groupBy = match[1].toLowerCase();
      break;
    }
  }

  return {
    type,
    title: 'Data Visualization',
    groupBy,
    sortOrder,
    limit: limit || 10,
    showLegend: true,
    showLabels: true,
  };
}

export function AIVisualizationStudio({
  isOpen,
  onClose,
  reportData,
  availableColumns,
  reportName,
  onAddVisualization,
  onAddToDashboard,
}: AIVisualizationStudioProps) {
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const [messages, setMessages] = useState<VisualizationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<VisualizationConfig | null>(null);
  const [previewData, setPreviewData] = useState<Array<{ label: string; value: number }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentVisualization) {
      const data = generatePreviewData(currentVisualization, reportData);
      setPreviewData(data);
    }
  }, [currentVisualization, reportData]);

  const handleSendMessage = async (content: string) => {
    const userMessage: VisualizationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: `Create a visualization: ${content}. Available columns: ${availableColumns.join(', ')}. Report: ${reportName}`,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.visualization ? JSON.stringify(m.visualization) : m.content,
          })),
          customerId: effectiveCustomerId,
          isAdmin: effectiveIsAdmin,
          isVisualizationMode: true,
          availableColumns,
          currentVisualization,
        },
      });

      let visualization: VisualizationConfig | null = null;
      let responseMessage = '';

      if (error) {
        visualization = parseVisualizationFromResponse(content);
        responseMessage = visualization
          ? `I've created a ${visualization.type} chart based on your request.`
          : 'I understood your request but need more details to create the visualization.';
      } else if (data?.visualization) {
        visualization = data.visualization as VisualizationConfig;
        responseMessage = data.message || "I've updated the visualization.";
      } else {
        visualization = parseVisualizationFromResponse(content);
        responseMessage = data?.message || (visualization
          ? `I've created a ${visualization.type} chart based on your request.`
          : 'Please describe what visualization you would like.');
      }

      const assistantMessage: VisualizationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date(),
        visualization: visualization || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (visualization) {
        setCurrentVisualization(visualization);
      }
    } catch (err) {
      const fallbackViz = parseVisualizationFromResponse(content);

      const errorMessage: VisualizationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fallbackViz
          ? `I've created a ${fallbackViz.type} chart based on your description.`
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        visualization: fallbackViz || undefined,
      };
      setMessages(prev => [...prev, errorMessage]);

      if (fallbackViz) {
        setCurrentVisualization(fallbackViz);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToReport = () => {
    if (currentVisualization) {
      onAddVisualization(currentVisualization);
      onClose();
    }
  };

  const handleAddToDashboard = () => {
    if (currentVisualization && onAddToDashboard) {
      onAddToDashboard(currentVisualization);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Visualization</h2>
              <p className="text-sm text-gray-500">Describe how you want to see your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="w-[400px] flex flex-col border-r">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    Describe the visualization you want to create
                  </p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => handleSendMessage('Show me a bar chart of costs by carrier')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "Show me a bar chart of costs by carrier"
                    </button>
                    <button
                      onClick={() => handleSendMessage('Create a pie chart showing volume distribution')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "Create a pie chart showing volume distribution"
                    </button>
                    <button
                      onClick={() => handleSendMessage('Show the trend over time as a line chart')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "Show the trend over time as a line chart"
                    </button>
                  </div>
                </div>
              )}
              {messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    timestamp: message.timestamp,
                  }}
                  isCompact
                />
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your data...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isGenerating}
                placeholder="Describe changes to the visualization..."
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
              <span className="text-sm font-medium text-gray-700">Live Preview</span>
              <div className="flex items-center gap-2">
                {currentVisualization && (
                  <>
                    <button
                      onClick={handleAddToReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Report
                    </button>
                    {onAddToDashboard && (
                      <button
                        onClick={handleAddToDashboard}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save as Widget
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              {currentVisualization ? (
                <div className="w-full max-w-lg bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {currentVisualization.title || 'Visualization Preview'}
                  </h3>
                  <ChartPreview config={currentVisualization} data={previewData} />
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Your visualization will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIVisualizationStudio;
