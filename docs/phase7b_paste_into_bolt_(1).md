# PHASE 7B: Custom Report → AI Enhancement Bridge

This phase adds an "Enhance with AI" button to Custom Reports that opens the AI Report Studio with full data context, enabling users to build dynamic visualizations from their existing report data.

## What This Enables

1. User builds a Custom Report (picks columns, filters, sees data)
2. Clicks "Enhance with AI" 
3. AI Studio opens with full context (columns, sample data, stats)
4. User describes visualization they want
5. AI builds dynamic report definition (not static data)
6. User can save as dashboard widget

---

## File 1: Create Context Transfer Type

### Create: src/types/reportEnhancement.ts

```typescript
/**
 * Context transferred from Custom Report to AI Studio
 * This enables AI to work with known, verified data
 */

export interface ReportEnhancementContext {
  // Source identification
  sourceType: 'custom_report';
  sourceReportId: string;
  sourceReportName: string;
  
  // Column information
  columns: EnhancementColumn[];
  
  // Data profile
  rowCount: number;
  dateRange: {
    type: 'last30' | 'last90' | 'last6months' | 'lastyear' | 'custom';
    start?: string;
    end?: string;
  };
  
  // Filter context (what's already applied)
  appliedFilters: AppliedFilter[];
  
  // Sample data for AI context
  sampleData: Record<string, unknown>[];
  
  // Column statistics
  columnStats: Record<string, ColumnStats>;
  
  // Timestamp for validity checking
  timestamp: string;
}

export interface EnhancementColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'lookup';
  format?: 'currency' | 'percent' | 'number';
  isGroupable: boolean;
  isAggregatable: boolean;
}

export interface AppliedFilter {
  field: string;
  operator: string;
  value: string | number | boolean;
  label: string;
}

export interface ColumnStats {
  // For text columns
  uniqueCount?: number;
  topValues?: string[];
  nullCount?: number;
  
  // For numeric columns
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  
  // For all columns
  populatedPercent: number;
}

export interface EnhancementSuggestion {
  type: 'categorization' | 'calculation' | 'visualization';
  title: string;
  description: string;
  prompt: string;
}
```

---

## File 2: Create Context Builder Utility

### Create: src/utils/reportEnhancementContext.ts

```typescript
import { SimpleReportConfig, SimpleReportColumn } from '../types/reports';
import { ReportEnhancementContext, EnhancementColumn, ColumnStats, AppliedFilter } from '../types/reportEnhancement';
import { getColumnById } from '../config/reportColumns';

/**
 * Build enhancement context from a custom report and its data
 */
export function buildEnhancementContext(
  reportConfig: SimpleReportConfig,
  reportData: Record<string, unknown>[],
  dateRange: { type: string; start?: string; end?: string }
): ReportEnhancementContext {
  const columns = reportConfig.columns.map(col => mapToEnhancementColumn(col));
  const columnStats = calculateColumnStats(reportConfig.columns, reportData);
  const sampleData = reportData.slice(0, 20); // First 20 rows for context
  
  const appliedFilters: AppliedFilter[] = (reportConfig.filters || []).map(f => ({
    field: f.column,
    operator: f.operator,
    value: f.value,
    label: `${f.column} ${f.operator} ${f.value}`
  }));

  return {
    sourceType: 'custom_report',
    sourceReportId: reportConfig.id || 'unsaved',
    sourceReportName: reportConfig.name,
    columns,
    rowCount: reportData.length,
    dateRange: {
      type: dateRange.type as any,
      start: dateRange.start,
      end: dateRange.end
    },
    appliedFilters,
    sampleData,
    columnStats,
    timestamp: new Date().toISOString()
  };
}

function mapToEnhancementColumn(col: SimpleReportColumn): EnhancementColumn {
  const columnDef = getColumnById(col.id);
  
  return {
    id: col.id,
    label: col.label,
    type: columnDef?.type === 'number' ? 'number' : 
          columnDef?.type === 'date' ? 'date' :
          columnDef?.type === 'lookup' ? 'lookup' : 'text',
    format: columnDef?.format as any,
    isGroupable: columnDef?.type !== 'number' || !!col.aggregation,
    isAggregatable: columnDef?.type === 'number'
  };
}

function calculateColumnStats(
  columns: SimpleReportColumn[],
  data: Record<string, unknown>[]
): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};
  
  for (const col of columns) {
    const columnDef = getColumnById(col.id);
    const values = data.map(row => row[col.id]).filter(v => v !== null && v !== undefined);
    const nullCount = data.length - values.length;
    const populatedPercent = data.length > 0 ? Math.round((values.length / data.length) * 100) : 0;
    
    if (columnDef?.type === 'number') {
      const numValues = values.map(v => Number(v)).filter(n => !isNaN(n));
      stats[col.id] = {
        sum: numValues.reduce((a, b) => a + b, 0),
        avg: numValues.length > 0 ? numValues.reduce((a, b) => a + b, 0) / numValues.length : 0,
        min: numValues.length > 0 ? Math.min(...numValues) : 0,
        max: numValues.length > 0 ? Math.max(...numValues) : 0,
        nullCount,
        populatedPercent
      };
    } else {
      const stringValues = values.map(v => String(v));
      const uniqueValues = [...new Set(stringValues)];
      const valueCounts = new Map<string, number>();
      stringValues.forEach(v => valueCounts.set(v, (valueCounts.get(v) || 0) + 1));
      const topValues = [...valueCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([v]) => v);
      
      stats[col.id] = {
        uniqueCount: uniqueValues.length,
        topValues,
        nullCount,
        populatedPercent
      };
    }
  }
  
  return stats;
}

/**
 * Format context for AI system prompt
 */
export function formatContextForAI(context: ReportEnhancementContext): string {
  let output = `## CUSTOM REPORT CONTEXT\n\n`;
  output += `You are enhancing the custom report "${context.sourceReportName}".\n`;
  output += `This report has ${context.rowCount.toLocaleString()} rows of verified data.\n\n`;
  
  output += `### Available Columns\n\n`;
  output += `| Column | Type | Groupable | Aggregatable | Stats |\n`;
  output += `|--------|------|-----------|--------------|-------|\n`;
  
  for (const col of context.columns) {
    const stats = context.columnStats[col.id];
    let statsStr = '';
    
    if (col.type === 'number' && stats) {
      statsStr = `Sum: ${formatNumber(stats.sum)}, Avg: ${formatNumber(stats.avg)}`;
    } else if (stats?.uniqueCount !== undefined) {
      statsStr = `${stats.uniqueCount} unique values`;
    }
    
    output += `| ${col.label} | ${col.type} | ${col.isGroupable ? 'Yes' : 'No'} | ${col.isAggregatable ? 'Yes' : 'No'} | ${statsStr} |\n`;
  }
  
  // Add sample values for text columns
  output += `\n### Sample Values\n\n`;
  for (const col of context.columns) {
    const stats = context.columnStats[col.id];
    if (stats?.topValues && stats.topValues.length > 0) {
      output += `**${col.label}**: ${stats.topValues.slice(0, 5).map(v => `"${v}"`).join(', ')}${stats.topValues.length > 5 ? '...' : ''}\n`;
    }
  }
  
  if (context.appliedFilters.length > 0) {
    output += `\n### Applied Filters\n\n`;
    context.appliedFilters.forEach(f => {
      output += `- ${f.label}\n`;
    });
  }
  
  output += `\n### Date Range\n\n`;
  output += `Type: ${context.dateRange.type} (DYNAMIC - always current)\n`;
  
  output += `\n### IMPORTANT\n\n`;
  output += `This report uses DYNAMIC date ranges. When you generate a report definition, use the dateRange type "${context.dateRange.type}" NOT fixed dates.\n`;
  output += `The report will automatically show current data when viewed.\n`;
  
  return output;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return 'N/A';
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(2);
}

/**
 * Generate enhancement suggestions based on context
 */
export function generateEnhancementSuggestions(context: ReportEnhancementContext): string[] {
  const suggestions: string[] = [];
  
  // Check for text columns with moderate unique values (good for categorization)
  const textColumns = context.columns.filter(c => c.type === 'text');
  const numericColumns = context.columns.filter(c => c.type === 'number');
  
  for (const col of textColumns) {
    const stats = context.columnStats[col.id];
    if (stats?.uniqueCount && stats.uniqueCount > 5 && stats.uniqueCount < 100) {
      suggestions.push(`Group data by ${col.label} and show as a pie chart`);
    }
    if (stats?.uniqueCount && stats.uniqueCount > 100) {
      suggestions.push(`Categorize ${col.label} by keywords (tell me what categories you want)`);
    }
  }
  
  for (const numCol of numericColumns) {
    for (const textCol of textColumns) {
      suggestions.push(`Show ${numCol.label} by ${textCol.label} as a bar chart`);
    }
  }
  
  if (numericColumns.length >= 2) {
    suggestions.push(`Calculate ${numericColumns[0].label} per ${numericColumns[1].label}`);
  }
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
}
```

---

## File 3: Update Custom Report View Page

### Update: src/pages/CustomReportViewPage.tsx

Add these imports at the top:

```typescript
import { Sparkles } from 'lucide-react';
import { buildEnhancementContext } from '../utils/reportEnhancementContext';
```

Add this state variable (around line 67 with other state):

```typescript
const [enhancementData, setEnhancementData] = useState<Record<string, unknown>[]>([]);
```

Add this handler function (after handleExportPDF around line 210):

```typescript
const handleEnhanceWithAI = () => {
  if (!report) return;
  
  const simpleReport = (report as any).simpleReport;
  if (!simpleReport) {
    alert('This report type cannot be enhanced with AI yet.');
    return;
  }
  
  // Build the enhancement context
  const context = buildEnhancementContext(
    {
      id: report.id,
      name: report.name,
      description: report.description,
      columns: simpleReport.columns || [],
      isSummary: simpleReport.isSummary || false,
      groupBy: simpleReport.groupBy || [],
      visualization: simpleReport.visualization,
      filters: simpleReport.filters || [],
      sorts: simpleReport.sorts || []
    },
    enhancementData.length > 0 ? enhancementData : reportData,
    {
      type: datePreset,
      start: startDate,
      end: endDate
    }
  );
  
  // Store context for AI Studio to pick up
  sessionStorage.setItem('enhancement_context', JSON.stringify(context));
  
  // Navigate to AI Studio with enhancement mode
  navigate('/ai-studio', { 
    state: { 
      enhancementMode: true,
      sourceReport: report.name
    } 
  });
};
```

Find the SimpleReportViewer component (around line 410) and update it to capture data:

```typescript
{(report as any).simpleReport && (
  <SimpleReportViewer
    config={{
      name: report.name,
      description: report.description,
      columns: (report as any).simpleReport.columns || [],
      isSummary: (report as any).simpleReport.isSummary || false,
      groupBy: (report as any).simpleReport.groupBy || [],
      visualization: (report as any).simpleReport.visualization,
      filters: (report as any).simpleReport.filters,
      sorts: (report as any).simpleReport.sorts
    }}
    customerId={effectiveCustomerIds.join(',')}
    onDataLoad={(data) => {
      setReportData(data);
      setEnhancementData(data); // Capture for enhancement
    }}
  />
)}
```

Find the button group (around line 300-350 where Export and other buttons are) and add the Enhance with AI button:

```typescript
{/* Add this button in the header actions area, near Export */}
<button
  onClick={handleEnhanceWithAI}
  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
  title="Enhance this report with AI visualizations"
>
  <Sparkles className="w-4 h-4" />
  <span className="hidden sm:inline">Enhance with AI</span>
</button>
```

---

## File 4: Update AI Report Studio Page

### Update: src/pages/AIReportStudioPage.tsx

Add import at top:

```typescript
import { ReportEnhancementContext } from '../types/reportEnhancement';
import { formatContextForAI, generateEnhancementSuggestions } from '../utils/reportEnhancementContext';
```

Add state variable (around line 130 with other state):

```typescript
const [enhancementContext, setEnhancementContext] = useState<ReportEnhancementContext | null>(null);
```

Add this useEffect to check for enhancement context (after the existing useEffects, around line 260):

```typescript
// Check for enhancement context from Custom Report
useEffect(() => {
  const checkForEnhancementContext = () => {
    const contextStr = sessionStorage.getItem('enhancement_context');
    if (contextStr) {
      try {
        const context: ReportEnhancementContext = JSON.parse(contextStr);
        // Validate timestamp (context valid for 10 minutes)
        const contextTime = new Date(context.timestamp).getTime();
        const isValid = Date.now() - contextTime < 10 * 60 * 1000;
        
        if (isValid) {
          setEnhancementContext(context);
          setActiveTab('create');
          
          // Generate initial AI message with context
          const suggestions = generateEnhancementSuggestions(context);
          const suggestionsText = suggestions.length > 0 
            ? `\n\n**Suggestions:**\n${suggestions.map(s => `• ${s}`).join('\n')}`
            : '';
          
          const initialMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I've loaded your custom report "${context.sourceReportName}" with ${context.rowCount.toLocaleString()} rows.\n\n**Available columns:**\n${context.columns.map(c => `• **${c.label}** (${c.type})`).join('\n')}${suggestionsText}\n\nWhat visualization would you like to create? You can:\n- Group by any text column and show as a chart\n- Categorize by keywords (e.g., "group description by 'drawer', 'cargoglide', 'toolbox'")\n- Calculate metrics (e.g., "cost per item")\n\nThis will be a **live report** that updates automatically with new data.`,
            timestamp: new Date(),
          };
          
          setMessages([initialMessage]);
          sessionStorage.removeItem('enhancement_context');
        } else {
          sessionStorage.removeItem('enhancement_context');
        }
      } catch (e) {
        console.error('Failed to parse enhancement context:', e);
        sessionStorage.removeItem('enhancement_context');
      }
    }
  };
  
  // Check on mount and when location changes
  checkForEnhancementContext();
}, [location.state]);
```

Update the handleSendMessage function to include enhancement context (around line 260):

Find this line:
```typescript
const response = await generateReport(content, messages, String(effectiveCustomerId), effectiveIsAdmin, knowledgeContext || undefined, currentReport, effectiveCustomerName || undefined);
```

Replace with:
```typescript
// Build combined knowledge context including enhancement context
let combinedContext = knowledgeContext || '';
if (enhancementContext) {
  combinedContext = formatContextForAI(enhancementContext) + '\n\n' + combinedContext;
}

const response = await generateReport(
  content, 
  messages, 
  String(effectiveCustomerId), 
  effectiveIsAdmin, 
  combinedContext || undefined, 
  currentReport, 
  effectiveCustomerName || undefined
);
```

Add enhancement indicator in the UI. Find the header area and add this badge when in enhancement mode (around line 380):

```typescript
{enhancementContext && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
    <Sparkles className="w-4 h-4" />
    <span>Enhancing: {enhancementContext.sourceReportName}</span>
    <button 
      onClick={() => setEnhancementContext(null)}
      className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
      title="Exit enhancement mode"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
)}
```

---

## File 5: Update Edge Function System Prompt

### Update: supabase/functions/generate-report/index.ts

Add this new section to the system prompt (add after CONVERSATIONAL_APPROACH around line 997):

```typescript
const ENHANCEMENT_MODE = `
## ENHANCEMENT MODE

When the context includes "CUSTOM REPORT CONTEXT", you are enhancing an existing report.

### Key Differences in Enhancement Mode:

1. **Data is verified** - The user has already built a table with these columns. Don't question if data exists.

2. **Use exact column names** - The columns listed are the exact field names to use. Don't guess.

3. **Dynamic date ranges** - ALWAYS use the dateRange type from context (e.g., "last90"), never fixed dates.

4. **Build on their data** - Create visualizations using their selected columns. If they want to categorize a text column, you know exactly what values exist.

### Enhancement Flow:

1. **Acknowledge** - "I see your report with X columns and Y rows"
2. **Clarify** - If they want categorization, confirm the keywords/categories
3. **Preview** - Show what the grouping would look like (you have sample data)
4. **Build** - Generate the report definition

### Example Enhancement Conversation:

User: "Group by description - I want to see drawer systems, cargoglide, and toolbox separately"

AI: "I'll categorize your description column:
- 'drawer' → DRAWER SYSTEM (I see values like 'DRAWER SYSTEM 24IN', 'DRAWER KIT')
- 'cargoglide' → CARGOGLIDE (I see 'CG-1000', 'CARGOGLIDE UNIT')
- 'toolbox' → TOOLBOX (I see 'TOOLBOX ALUMINUM 60IN')
- Everything else → OTHER

What metric would you like to see - shipment count, total spend, or something calculated like cost per unit?"

### Report Definition Rules:

1. **dateRange.type** - Use the type from context, NOT custom dates
2. **groupBy** - Use exact column IDs from the context
3. **metric.field** - Use exact column IDs for numeric fields
4. **categorization** - Only when user wants keyword grouping

Example report structure for enhancement:
\`\`\`json
{
  "dateRange": {
    "type": "last90"  // FROM CONTEXT - this makes it dynamic
  },
  "categorization": {
    "field": "description",  // Exact column ID from context
    "name": "product_type",
    "rules": [
      { "contains": ["drawer"], "category": "DRAWER SYSTEM" },
      { "contains": ["cargoglide", "cargo glide"], "category": "CARGOGLIDE" }
    ],
    "default": "OTHER"
  },
  "sections": [...]
}
\`\`\`
`;
```

Add ENHANCEMENT_MODE to the system prompt assembly (around line 2050 where the system prompt is built):

Find where the system prompt parts are concatenated and add:
```typescript
ENHANCEMENT_MODE,
```

---

## Testing Checklist

After implementing, verify:

### From Custom Report:
1. ✅ "Enhance with AI" button appears on Custom Report View
2. ✅ Clicking button navigates to AI Studio
3. ✅ AI Studio shows enhancement badge with report name
4. ✅ AI's first message lists columns and row count
5. ✅ AI's first message includes suggestions

### In AI Studio (Enhancement Mode):
1. ✅ AI knows exact column names
2. ✅ AI can reference sample values from the data
3. ✅ AI builds report with dynamic dateRange (not fixed dates)
4. ✅ Generated report uses correct column IDs
5. ✅ Can exit enhancement mode with X button

### Generated Report:
1. ✅ Report definition has `dateRange.type` matching original
2. ✅ Report can be saved
3. ✅ Report can be added to dashboard as widget
4. ✅ Widget shows live data (not snapshot)

---

# END OF PHASE 7B

This phase creates the bridge from Custom Reports to AI-enhanced visualizations. The key innovation is that the AI works with **verified data context** instead of guessing, and generates **dynamic reports** that stay live.

Next: Phase 7C (Universal Widget System) will enable saving any visualization as a dashboard widget.
