# Phase 2: ChatInput with Build Report Button

## Overview
This phase adds a persistent "Build Report" button to the ChatInput component that:
1. Always visible in the chat toolbar
2. Starts dormant (grayed out)
3. Lights up/glows when AI has gathered enough context
4. Never interrupts the conversation flow

## Files to Create/Modify

### 1. src/components/ai-studio/ChatInput.tsx

```tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles, FileText } from 'lucide-react';

interface BuildReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns?: string[];
  suggestedFilters?: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  // New props for Build Report functionality
  buildReportContext?: BuildReportContext | null;
  onBuildReport?: (context: BuildReportContext) => void;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder = 'Describe the report you want to create...',
  suggestions = [],
  buildReportContext,
  onBuildReport,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showBuildTooltip, setShowBuildTooltip] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    textareaRef.current?.focus();
  };

  // Determine if Build Report button should be active
  const isBuildReportReady = buildReportContext && 
    buildReportContext.hasIntent && 
    (buildReportContext.hasColumns || (buildReportContext.suggestedColumns && buildReportContext.suggestedColumns.length > 0));

  const handleBuildReportClick = () => {
    if (isBuildReportReady && onBuildReport && buildReportContext) {
      onBuildReport(buildReportContext);
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.length > 0 && !message && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rocket-50 text-rocket-700 text-sm rounded-full hover:bg-rocket-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:border-rocket-500 focus-within:ring-2 focus-within:ring-rocket-100 transition-all">
        {/* Build Report Button - Always visible in toolbar */}
        <div className="relative">
          <button
            onClick={handleBuildReportClick}
            onMouseEnter={() => setShowBuildTooltip(true)}
            onMouseLeave={() => setShowBuildTooltip(false)}
            disabled={isLoading}
            className={`flex-shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-xl transition-all duration-300 ${
              isBuildReportReady
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 animate-pulse-subtle'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Build Report</span>
          </button>
          
          {/* Tooltip */}
          {showBuildTooltip && (
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
              {isBuildReportReady ? (
                <>
                  <div className="font-semibold text-amber-400 mb-1">Ready to build!</div>
                  <div className="text-gray-300">
                    Click to open the report builder with AI suggestions pre-filled.
                  </div>
                  {buildReportContext?.suggestedColumns && buildReportContext.suggestedColumns.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-gray-400 mb-1">Suggested columns:</div>
                      <div className="flex flex-wrap gap-1">
                        {buildReportContext.suggestedColumns.slice(0, 5).map((col, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                            {col}
                          </span>
                        ))}
                        {buildReportContext.suggestedColumns.length > 5 && (
                          <span className="px-1.5 py-0.5 text-gray-500">
                            +{buildReportContext.suggestedColumns.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold text-gray-300 mb-1">Keep chatting</div>
                  <div className="text-gray-400">
                    Describe what data you want to see. This button will light up when I understand your request well enough to build a report.
                  </div>
                </>
              )}
              {/* Tooltip arrow */}
              <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent border-none outline-none px-2 py-1.5 text-gray-800 placeholder-gray-400 text-sm leading-relaxed disabled:opacity-50"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-rocket-600 text-white rounded-xl hover:bg-rocket-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

export default ChatInput;
```

### 2. src/components/ai-studio/index.ts

Update exports to include the new types:

```tsx
export { ChatInput } from './ChatInput';
export { ChatMessage } from './ChatMessage';
export { SuggestedPrompts } from './SuggestedPrompts';
export { FollowUpSuggestions } from './FollowUpSuggestions';
export { ReportLibrary } from './ReportLibrary';
export { ReportPreviewHeader } from './ReportPreviewHeader';
export { StudioHeader } from './StudioHeader';
export { AddToDashboardModal } from './AddToDashboardModal';
export type { AIReportWidgetConfig } from './AddToDashboardModal';

// New type export for Build Report context
export interface BuildReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns?: string[];
  suggestedFilters?: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
}
```

### 3. src/services/aiReportService.ts

Add context extraction from AI responses:

```tsx
// Add this interface near the top with other interfaces
export interface ExtractedReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns: string[];
  suggestedFilters: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
  dateRange?: string;
}

// Add this function to extract context from conversation
export function extractReportContextFromConversation(
  messages: ChatMessage[],
  currentReport: AIReportDefinition | null
): ExtractedReportContext {
  const context: ExtractedReportContext = {
    hasColumns: false,
    hasFilters: false,
    hasIntent: false,
    suggestedColumns: [],
    suggestedFilters: [],
  };

  // If we have a current report, we definitely have context
  if (currentReport) {
    context.hasIntent = true;
    context.hasColumns = true;
    context.reportName = currentReport.name;
    
    // Extract columns from report sections
    currentReport.sections.forEach(section => {
      if (section.type === 'table' && 'config' in section) {
        const tableConfig = section.config as { columns?: Array<{ field: string }> };
        if (tableConfig.columns) {
          context.suggestedColumns.push(...tableConfig.columns.map(c => c.field));
        }
      }
      if (section.type === 'chart' && 'config' in section) {
        const chartConfig = section.config as { groupBy?: string; metrics?: string[] };
        if (chartConfig.groupBy) context.suggestedColumns.push(chartConfig.groupBy);
        if (chartConfig.metrics) context.suggestedColumns.push(...chartConfig.metrics);
      }
    });
    
    // Extract filters if present
    if (currentReport.filters && currentReport.filters.length > 0) {
      context.hasFilters = true;
      context.suggestedFilters = currentReport.filters.map(f => ({
        column: f.field,
        operator: f.operator,
        value: String(f.value),
      }));
    }
    
    return context;
  }

  // Analyze conversation for intent and context
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const allText = userMessages.join(' ');

  // Check for intent indicators
  const intentKeywords = [
    'show me', 'what are', 'which', 'how many', 'total', 'average', 'compare',
    'breakdown', 'by carrier', 'by state', 'by month', 'trend', 'top', 'highest',
    'lowest', 'cost', 'spend', 'shipment', 'volume', 'report', 'analyze'
  ];
  context.hasIntent = intentKeywords.some(keyword => allText.includes(keyword));

  // Extract potential column mentions
  const columnKeywords: Record<string, string> = {
    'carrier': 'carrier_name',
    'cost': 'total_cost',
    'spend': 'total_cost',
    'state': 'origin_state',
    'origin': 'origin_state',
    'destination': 'destination_state',
    'date': 'pickup_date',
    'month': 'pickup_date',
    'mode': 'mode_name',
    'weight': 'total_weight',
    'shipment': 'load_id',
    'customer': 'customer_name',
    'revenue': 'retail',
    'margin': 'margin',
  };

  Object.entries(columnKeywords).forEach(([keyword, column]) => {
    if (allText.includes(keyword) && !context.suggestedColumns.includes(column)) {
      context.suggestedColumns.push(column);
    }
  });

  context.hasColumns = context.suggestedColumns.length > 0;

  // Extract potential date range
  if (allText.includes('last month') || allText.includes('previous month')) {
    context.dateRange = 'previous_month';
  } else if (allText.includes('last week') || allText.includes('previous week')) {
    context.dateRange = 'previous_week';
  } else if (allText.includes('this quarter') || allText.includes('q4') || allText.includes('q3')) {
    context.dateRange = 'this_quarter';
  } else if (allText.includes('this year') || allText.includes('ytd')) {
    context.dateRange = 'ytd';
  }

  // Generate a suggested report name if we have enough context
  if (context.hasIntent && context.suggestedColumns.length > 0) {
    const primaryColumn = context.suggestedColumns[0];
    const formattedColumn = primaryColumn.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    context.reportName = `${formattedColumn} Analysis`;
  }

  return context;
}
```

### 4. src/pages/AIReportStudioPage.tsx

Update to use the new ChatInput with Build Report button:

```tsx
// Add these imports at the top
import { extractReportContextFromConversation, ExtractedReportContext } from '../services/aiReportService';

// Add state for build report context near other state declarations
const [buildReportContext, setBuildReportContext] = useState<ExtractedReportContext | null>(null);

// Add useEffect to update build report context when messages change
useEffect(() => {
  const context = extractReportContextFromConversation(messages, currentReport);
  setBuildReportContext(context);
}, [messages, currentReport]);

// Add handler for Build Report button
const handleBuildReportFromContext = (context: ExtractedReportContext) => {
  // Create initial state for SimpleReportBuilder based on context
  const builderInitialState = {
    name: context.reportName || 'New Report',
    description: '',
    selectedColumns: context.suggestedColumns.map(col => ({
      id: col,
      label: col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    })),
    isSummary: false,
    groupByColumns: [],
    visualization: 'table' as const,
    filters: context.suggestedFilters.map(f => ({
      columnId: f.column,
      operator: f.operator,
      value: f.value,
      enabled: true,
    })),
    sorts: [],
  };
  
  setBuilderContext(builderInitialState);
  setActiveTab('builder');
};

// Update the ChatInput component usage in the render:
<ChatInput 
  onSend={handleSendMessage} 
  isLoading={isGenerating} 
  placeholder="Refine your report..."
  buildReportContext={buildReportContext ? {
    hasColumns: buildReportContext.hasColumns,
    hasFilters: buildReportContext.hasFilters,
    hasIntent: buildReportContext.hasIntent,
    suggestedColumns: buildReportContext.suggestedColumns,
    suggestedFilters: buildReportContext.suggestedFilters,
    reportName: buildReportContext.reportName,
  } : null}
  onBuildReport={handleBuildReportFromContext}
/>
```

### 5. Add CSS animation for the pulse effect

Add this to src/index.css or your global styles:

```css
@keyframes pulse-subtle {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Testing Checklist

- [ ] Build Report button appears in ChatInput toolbar
- [ ] Button is grayed out when conversation just started
- [ ] Button lights up with glow effect when AI identifies intent + columns
- [ ] Hovering shows tooltip explaining current state
- [ ] Clicking when ready opens SimpleReportBuilder with pre-filled columns
- [ ] Works on mobile (button shows icon only, text hidden)
- [ ] Does not interfere with normal message sending
- [ ] Animation is smooth and not distracting

## Notes

1. The button never "pops up" or interrupts - it's always in the same position
2. Context extraction is heuristic-based for now, can be improved with AI later
3. The glow effect uses Tailwind's gradient + shadow for the ready state
4. Tooltip provides clear feedback about what's needed vs what's ready
