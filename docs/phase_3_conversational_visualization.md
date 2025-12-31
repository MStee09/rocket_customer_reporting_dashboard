# Phase 3: Conversational AI Visualization

## Overview
This phase creates a conversational interface for creating and refining visualizations:
1. Same UX pattern as Ask AI - chat on left, live preview on right
2. User describes visualization in natural language
3. AI builds/updates visualization in real-time
4. Continuous refinement through conversation

## Files to Create/Modify

### 1. src/components/ai-studio/AIVisualizationStudio.tsx (NEW FILE)

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, X, Check, Plus, BarChart3 } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Visualization types supported
type VisualizationType = 
  | 'bar' | 'horizontal_bar' | 'grouped_bar' | 'stacked_bar'
  | 'line' | 'area' | 'stacked_area'
  | 'pie' | 'donut'
  | 'scatter' | 'bubble'
  | 'heatmap' | 'treemap'
  | 'table';

interface VisualizationConfig {
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
  // The report data context
  reportData: Record<string, unknown>[];
  availableColumns: string[];
  reportName: string;
  reportId?: string;
  // Callbacks
  onAddVisualization: (config: VisualizationConfig) => void;
  onAddToDashboard?: (config: VisualizationConfig) => void;
}

// Sample data generator for preview
function generatePreviewData(
  config: VisualizationConfig,
  sourceData: Record<string, unknown>[]
): unknown[] {
  if (!sourceData.length) {
    // Generate sample data if no real data
    const sampleLabels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    return sampleLabels.map((label, i) => ({
      label,
      value: Math.floor(Math.random() * 100) + 20,
      trend: Math.random() > 0.5 ? 'up' : 'down',
    }));
  }

  // Aggregate real data based on config
  const groupField = config.groupBy || config.xAxis;
  const metricField = config.yAxis || (config.metrics?.[0]);

  if (!groupField || !metricField) {
    return sourceData.slice(0, config.limit || 10);
  }

  // Simple aggregation
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

  // Sort if specified
  if (config.sortOrder === 'desc') {
    result.sort((a, b) => b.value - a.value);
  } else if (config.sortOrder === 'asc') {
    result.sort((a, b) => a.value - b.value);
  }

  // Limit results
  if (config.limit) {
    result = result.slice(0, config.limit);
  }

  return result;
}

// Simple chart renderer component
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

  // Default table view
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

export function AIVisualizationStudio({
  isOpen,
  onClose,
  reportData,
  availableColumns,
  reportName,
  reportId,
  onAddVisualization,
  onAddToDashboard,
}: AIVisualizationStudioProps) {
  const { effectiveCustomerId } = useAuth();
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

  // Update preview data when visualization changes
  useEffect(() => {
    if (currentVisualization) {
      const data = generatePreviewData(currentVisualization, reportData) as Array<{ label: string; value: number }>;
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
      // Call edge function to generate visualization
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.visualization ? JSON.stringify(m.visualization) : m.content,
          })),
          customerId: effectiveCustomerId,
          isVisualizationMode: true,
          availableColumns,
          currentVisualization,
          reportContext: {
            name: reportName,
            id: reportId,
            sampleData: reportData.slice(0, 5),
          },
        },
      });

      if (error) throw error;

      const visualization = data.visualization as VisualizationConfig;
      
      const assistantMessage: VisualizationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || "I've updated the visualization based on your request.",
        timestamp: new Date(),
        visualization,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (visualization) {
        setCurrentVisualization(visualization);
      }
    } catch (error) {
      const errorMessage: VisualizationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
        {/* Header */}
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

        {/* Main content - Chat + Preview */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Panel */}
          <div className="w-[400px] flex flex-col border-r">
            {/* Messages */}
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
                      onClick={() => handleSendMessage('Show the trend over time')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "Show the trend over time"
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
                  <span>Creating visualization...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isGenerating}
                placeholder="Describe changes to the visualization..."
              />
            </div>
          </div>

          {/* Preview Panel */}
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
```

### 2. src/components/ai-studio/index.ts

Add the new export:

```tsx
export { ChatInput } from './ChatInput';
export { ChatMessage } from './ChatMessage';
export { SuggestedPrompts } from './SuggestedPrompts';
export { FollowUpSuggestions } from './FollowUpSuggestions';
export { ReportLibrary } from './ReportLibrary';
export { ReportPreviewHeader } from './ReportPreviewHeader';
export { StudioHeader } from './StudioHeader';
export { AddToDashboardModal } from './AddToDashboardModal';
export { AIVisualizationStudio } from './AIVisualizationStudio';
export type { AIReportWidgetConfig } from './AddToDashboardModal';

export interface BuildReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns?: string[];
  suggestedFilters?: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
}
```

### 3. Integration into SimpleReportViewer.tsx

Add button to open AI Visualization Studio from the report viewer:

```tsx
// Add import at top
import { AIVisualizationStudio } from './ai-studio';

// Add state
const [showVisualizationStudio, setShowVisualizationStudio] = useState(false);

// Add handler for adding visualization to report
const handleAddVisualization = (config: VisualizationConfig) => {
  // Add the visualization to the report's visualizations array
  // This depends on your report storage structure
  console.log('Adding visualization:', config);
  // Implementation depends on how visualizations are stored in reports
};

// Add button in the toolbar/header area
<button
  onClick={() => setShowVisualizationStudio(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-colors"
>
  <Sparkles className="w-4 h-4" />
  Add Visualization
</button>

// Add modal at the end of the component
{showVisualizationStudio && (
  <AIVisualizationStudio
    isOpen={showVisualizationStudio}
    onClose={() => setShowVisualizationStudio(false)}
    reportData={reportData}
    availableColumns={columns.map(c => c.id)}
    reportName={reportName}
    reportId={reportId}
    onAddVisualization={handleAddVisualization}
  />
)}
```

## Edge Function Update

The edge function needs to handle visualization mode. Add this to `supabase/functions/generate-report/index.ts`:

```typescript
// Add visualization handling in the main function
if (body.isVisualizationMode) {
  // Handle visualization generation
  const visualizationPrompt = `
You are creating a data visualization. Available columns: ${body.availableColumns.join(', ')}.
Current visualization: ${body.currentVisualization ? JSON.stringify(body.currentVisualization) : 'none'}
Report context: ${JSON.stringify(body.reportContext)}

User request: ${body.prompt}

Respond with a JSON object containing:
- visualization: { type, title, xAxis, yAxis, groupBy, metrics, colors, showLegend, showLabels, sortOrder, limit }
- message: A brief explanation of what you created/changed

Visualization types: bar, horizontal_bar, grouped_bar, stacked_bar, line, area, stacked_area, pie, donut, scatter, bubble, heatmap, treemap, table
`;

  // Call Claude API and parse response
  // Return { visualization, message }
}
```

## Testing Checklist

- [ ] AI Visualization Studio opens from report viewer
- [ ] Chat messages appear on left side
- [ ] Visualization preview updates on right side
- [ ] Suggested prompts work as quick-starts
- [ ] "Make it horizontal" changes bar chart orientation
- [ ] "Show only top 5" limits the data
- [ ] "Add to Report" button works
- [ ] "Save as Widget" button works
- [ ] Preview animates smoothly when visualization changes
- [ ] Error handling shows friendly messages
- [ ] Modal closes properly

## Notes

1. The ChartPreview component is intentionally simple - it can be enhanced with Recharts later
2. The edge function update is required for this to work properly
3. The visualization studio can be opened from multiple places (report viewer, builder, etc.)
4. Preview data is generated client-side for responsiveness, real data comes from report
