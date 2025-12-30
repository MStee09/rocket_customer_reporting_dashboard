# PHASE 7C: Universal Widget System

This phase integrates AI Report widgets into your existing widget infrastructure, enabling users to save any AI visualization as a live dashboard widget.

## Overview

Your existing system has:
- `customWidgetStorage.ts` - Storage bucket system for widgets
- `customWidgetTypes.ts` - Widget type definitions
- `customWidgetExecutor.ts` - Widget data execution
- `DashboardPage.tsx` - Widget grid display
- `AddToDashboardModal.tsx` - Modal for adding widgets (already exists!)

Phase 7C **enhances** this system to:
1. Save AI report sections as proper custom widgets
2. Execute them with live data
3. Display them in the existing widget grid

---

## File 1: AI Widget Types

### Create: src/types/aiWidget.ts

```typescript
import { AIReportDefinition, ReportSection } from './aiReport';

/**
 * Configuration for an AI-generated widget
 */
export interface AIWidgetConfig {
  // Source report info
  sourceReportId: string;
  sourceReportName: string;
  
  // What to display
  displayMode: 'full_report' | 'single_section' | 'selected_sections';
  sectionIndices: number[];  // Which sections to show
  
  // The actual report definition (for execution)
  reportDefinition: AIReportDefinition;
  
  // Display options
  compact: boolean;
  showTitle: boolean;
  maxHeight?: number;
}

/**
 * Metadata for tracking AI widget usage
 */
export interface AIWidgetMetadata {
  createdFromAIStudio: boolean;
  originalPrompt?: string;
  generatedAt: string;
  lastExecuted?: string;
  executionCount: number;
}
```

---

## File 2: AI Widget Service

### Create: src/services/aiWidgetService.ts

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { AIReportDefinition } from '../types/aiReport';
import { CustomWidgetDefinition } from '../config/widgets/customWidgetTypes';
import { saveCustomWidget, deleteCustomWidget } from '../config/widgets/customWidgetStorage';
import { executeReportData } from './reportDataExecutor';

/**
 * Create a widget from an AI report
 */
export async function createWidgetFromAIReport(
  supabase: SupabaseClient,
  params: {
    reportDefinition: AIReportDefinition;
    sourceReportId: string;
    sourceReportName: string;
    title: string;
    description?: string;
    sectionIndices: number[];
    size: 'small' | 'medium' | 'wide' | 'full';
    refreshInterval: number;
    userId: string;
    userEmail: string;
    customerId?: number;
    customerName?: string;
  }
): Promise<{ success: boolean; widgetId?: string; error?: string }> {
  try {
    const widgetId = `ai_widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Build the widget definition
    const widget: CustomWidgetDefinition = {
      id: widgetId,
      name: params.title,
      description: params.description || `Generated from AI report: ${params.sourceReportName}`,
      type: 'ai_report',
      category: 'ai_generated',
      
      // Widget configuration
      config: {
        sourceReportId: params.sourceReportId,
        sourceReportName: params.sourceReportName,
        displayMode: params.sectionIndices.length === params.reportDefinition.sections.length 
          ? 'full_report' 
          : 'selected_sections',
        sectionIndices: params.sectionIndices,
        reportDefinition: params.reportDefinition,
        compact: true,
        showTitle: true,
      },
      
      // Data source configuration
      dataSource: {
        type: 'ai_report',
        config: {
          reportDefinition: params.reportDefinition,
          sectionIndices: params.sectionIndices,
        },
      },
      
      // Display settings
      display: {
        size: params.size,
        iconColor: 'bg-purple-600',
        refreshInterval: params.refreshInterval,
      },
      
      // Visibility
      visibility: params.customerId 
        ? { type: 'specific_customers', customerIds: [params.customerId] }
        : { type: 'admin_only' },
      
      // Creator info
      createdBy: {
        userId: params.userId,
        userEmail: params.userEmail,
        isAdmin: !params.customerId,
        customerId: params.customerId,
        customerName: params.customerName,
        timestamp: new Date().toISOString(),
      },
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    
    // Save to storage
    const result = await saveCustomWidget(supabase, widget, params.customerId);
    
    if (result.success) {
      console.log('[AI Widget] Created widget:', widgetId);
      return { success: true, widgetId };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('[AI Widget] Failed to create widget:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Execute an AI widget to get live data
 */
export async function executeAIWidget(
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  customerId: string,
  isAdmin: boolean
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = widget.config as {
      reportDefinition: AIReportDefinition;
      sectionIndices: number[];
    };
    
    if (!config.reportDefinition) {
      return { success: false, error: 'Widget missing report definition' };
    }
    
    // Build a mini-report with only the selected sections
    const miniReport: AIReportDefinition = {
      ...config.reportDefinition,
      sections: config.sectionIndices.map(idx => config.reportDefinition.sections[idx]).filter(Boolean),
    };
    
    // Execute the report
    const executedData = await executeReportData(
      supabase,
      miniReport,
      customerId,
      isAdmin
    );
    
    return { success: true, data: executedData };
  } catch (err) {
    console.error('[AI Widget] Execution failed:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Delete an AI widget
 */
export async function deleteAIWidget(
  supabase: SupabaseClient,
  widgetId: string,
  customerId?: number
): Promise<{ success: boolean; error?: string }> {
  return deleteCustomWidget(supabase, widgetId, customerId);
}

/**
 * Update widget refresh settings
 */
export async function updateWidgetRefreshInterval(
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  refreshInterval: number,
  customerId?: number
): Promise<{ success: boolean; error?: string }> {
  const updatedWidget = {
    ...widget,
    display: {
      ...widget.display,
      refreshInterval,
    },
    updatedAt: new Date().toISOString(),
  };
  
  return saveCustomWidget(supabase, updatedWidget, customerId);
}
```

---

## File 3: Update Custom Widget Types

### Update: src/config/widgets/customWidgetTypes.ts

Add the AI report type to the existing types. Find the `CustomWidgetDefinition` interface and ensure `type` includes `'ai_report'`:

```typescript
// Add to the existing type union (find the type property)
type: 'kpi' | 'chart' | 'table' | 'map' | 'custom' | 'ai_report';

// Add to dataSource types if not present
dataSource: {
  type: 'query' | 'function' | 'static' | 'ai_report';
  // ... rest of config
};
```

If the file already has these types, no changes needed. If not, add `'ai_report'` as a valid type.

---

## File 4: Update Custom Widget Executor

### Update: src/config/widgets/customWidgetExecutor.ts (or src/utils/customWidgetExecutor.ts)

Add AI report execution. Find where widget types are handled and add this case:

```typescript
// Add import at top
import { executeAIWidget } from '../../services/aiWidgetService';

// In the main execution function, add a case for ai_report type
// Find the function that executes widgets and add:

if (widget.type === 'ai_report' || widget.dataSource?.type === 'ai_report') {
  const result = await executeAIWidget(
    supabase,
    widget,
    customerId.toString(),
    isAdmin
  );
  
  if (result.success) {
    return result.data;
  } else {
    console.error('AI Widget execution failed:', result.error);
    return null;
  }
}
```

---

## File 5: Update AddToDashboardModal

### Update: src/components/ai-studio/AddToDashboardModal.tsx

The modal already exists and is well-designed. We need to update it to actually save widgets to storage.

**Add these imports at the top:**

```typescript
import { Check } from 'lucide-react';
import { AIReportDefinition } from '../../types/aiReport';
import { createWidgetFromAIReport } from '../../services/aiWidgetService';
```

**Update the props interface (around line 18):**

```typescript
interface AddToDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SavedAIReport | null;
  reportDefinition?: AIReportDefinition; // For unsaved reports
  onAdd?: (config: AIReportWidgetConfig) => void; // Legacy callback
  onSuccess?: () => void; // New success callback
}
```

**Add state variables after the existing ones (around line 63):**

```typescript
const [isSaving, setIsSaving] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
```

**Get user info from auth (add to the destructuring around line 55):**

```typescript
const { effectiveCustomerId, isAdmin, user } = useAuth();
```

**Replace the handleAdd function (around line 147):**

```typescript
const handleAdd = async () => {
  const definition = report?.definition || reportDefinition;
  if (!definition) return;
  
  setIsSaving(true);
  setSaveError(null);
  
  try {
    const selectedIndices = sections
      .filter(s => s.included)
      .map(s => parseInt(s.id.split('-')[1]));
    
    const result = await createWidgetFromAIReport(supabase, {
      reportDefinition: definition,
      sourceReportId: report?.id || definition.id || `unsaved_${Date.now()}`,
      sourceReportName: report?.name || definition.name || 'AI Report',
      title: config.title,
      description: `${includedCount} section${includedCount !== 1 ? 's' : ''} from ${report?.name || definition.name || 'AI Report'}`,
      sectionIndices: selectedIndices,
      size: config.size,
      refreshInterval: config.refreshInterval,
      userId: user?.id || 'unknown',
      userEmail: user?.email || 'unknown',
      customerId: effectiveCustomerId ? Number(effectiveCustomerId) : undefined,
      customerName: undefined,
    });
    
    if (result.success) {
      setSaveSuccess(true);
      
      // Legacy callback support
      if (onAdd) {
        onAdd({
          reportId: report?.id || definition.id,
          title: config.title,
          size: config.size,
          sections: sections.filter(s => s.included).map(s => s.id),
          refreshInterval: config.refreshInterval,
        });
      }
      
      // Success delay then close
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } else {
      setSaveError(result.error || 'Failed to create widget');
    }
  } catch (err) {
    setSaveError(err instanceof Error ? err.message : 'Failed to create widget');
  } finally {
    setIsSaving(false);
  }
};
```

**Update the Add button (around line 370):**

```typescript
<button
  onClick={handleAdd}
  disabled={includedCount === 0 || isSaving}
  className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Saving...
    </>
  ) : saveSuccess ? (
    <>
      <Check className="w-4 h-4" />
      Added!
    </>
  ) : (
    'Add to Dashboard'
  )}
</button>
```

**Add error display before the footer (around line 360):**

```typescript
{saveError && (
  <div className="px-6 py-2 bg-red-50 border-t border-red-200">
    <p className="text-sm text-red-600">{saveError}</p>
  </div>
)}
```

**Update the component's destructuring (around line 54):**

```typescript
export function AddToDashboardModal({ 
  isOpen, 
  onClose, 
  report, 
  reportDefinition,
  onAdd, 
  onSuccess 
}: AddToDashboardModalProps) {
```

**Update the useEffect to handle both report and reportDefinition (around line 65):**

```typescript
useEffect(() => {
  if (isOpen && (report || reportDefinition)) {
    const definition = report?.definition || reportDefinition;
    
    setConfig(prev => ({
      ...prev,
      title: report?.name || definition?.name || 'AI Widget'
    }));

    if (definition?.sections) {
      const sectionList = definition.sections.map((section, index) => ({
        id: `section-${index}`,
        type: section.type,
        label: getSectionLabel(section),
        included: index < 3
      }));
      setSections(sectionList);
    }

    loadPreviewData();
    
    // Reset states
    setSaveSuccess(false);
    setSaveError(null);
  }
}, [isOpen, report, reportDefinition]);
```

**Update loadPreviewData to use definition:**

```typescript
const loadPreviewData = async () => {
  const definition = report?.definition || reportDefinition;
  if (!definition || !effectiveCustomerId) return;

  setLoadingPreview(true);
  try {
    const data = await executeReportData(
      supabase,
      definition,
      String(effectiveCustomerId),
      isAdmin()
    );
    setExecutedData(data);
  } catch (err) {
    console.error('Failed to load preview:', err);
  } finally {
    setLoadingPreview(false);
  }
};
```

**Update the early return check (around line 159):**

```typescript
if (!isOpen || (!report && !reportDefinition)) return null;
```

---

## File 6: AI Widget Renderer Component

### Create: src/components/dashboard/AIWidgetRenderer.tsx

```typescript
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';
import { executeAIWidget, deleteAIWidget } from '../../services/aiWidgetService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ReportRenderer } from '../reports/studio/ReportRenderer';
import { AIReportDefinition, ExecutedReportData } from '../../types/aiReport';

interface AIWidgetRendererProps {
  widget: CustomWidgetDefinition;
  onDelete?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function AIWidgetRenderer({ 
  widget, 
  onDelete, 
  onRefresh,
  compact = true 
}: AIWidgetRendererProps) {
  const navigate = useNavigate();
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const config = widget.config as {
    reportDefinition: AIReportDefinition;
    sectionIndices: number[];
    sourceReportId?: string;
    compact?: boolean;
  };

  // Build mini report for rendering
  const miniReport: AIReportDefinition | null = config.reportDefinition ? {
    ...config.reportDefinition,
    sections: config.sectionIndices
      .map(idx => config.reportDefinition.sections[idx])
      .filter(Boolean),
  } : null;

  useEffect(() => {
    loadWidgetData();
  }, [widget.id, effectiveCustomerId]);

  const loadWidgetData = async () => {
    if (!effectiveCustomerId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeAIWidget(
        supabase,
        widget,
        String(effectiveCustomerId),
        isAdmin() && !isViewingAsCustomer
      );

      if (result.success && result.data) {
        setExecutedData(result.data);
      } else {
        setError(result.error || 'Failed to load widget data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widget');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWidgetData();
    onRefresh?.();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAIWidget(
        supabase,
        widget.id,
        effectiveCustomerId ? Number(effectiveCustomerId) : undefined
      );
      
      if (result.success) {
        onDelete?.();
      } else {
        setError(result.error || 'Failed to delete widget');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete widget');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenInStudio = () => {
    if (config.sourceReportId) {
      navigate(`/ai-studio?reportId=${config.sourceReportId}&mode=edit`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="ml-2 text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm text-gray-600 mb-3 text-center">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group relative h-full flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{widget.name}</span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
          {config.sourceReportId && (
            <button
              onClick={handleOpenInStudio}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
              title="Open in AI Studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
            title="Remove widget"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: compact ? 350 : undefined }}>
        {miniReport && executedData ? (
          <ReportRenderer
            report={miniReport}
            data={executedData}
            embedded={true}
            compact={compact}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            No data available
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-400 flex items-center justify-between flex-shrink-0">
        <span>
          {executedData?.executedAt 
            ? `Updated: ${new Date(executedData.executedAt).toLocaleTimeString()}`
            : 'AI Generated'
          }
        </span>
        <span className="text-purple-500">
          {config.sectionIndices?.length || 0} section{(config.sectionIndices?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10">
          <div className="text-center p-4">
            <p className="text-gray-900 font-medium mb-4">Remove this widget?</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIWidgetRenderer;
```

---

## File 7: Update Widget Rendering in Dashboard

### Find where widgets are rendered and add AI widget support

In your widget grid or dashboard page, you need to detect AI widgets and render them with the AIWidgetRenderer. Find the component that renders individual widgets and add:

```typescript
// Add import
import { AIWidgetRenderer } from './AIWidgetRenderer';

// In the render logic, check for AI widget type:
{widget.type === 'ai_report' ? (
  <AIWidgetRenderer
    widget={widget}
    onDelete={() => handleRemoveWidget(widget.id)}
    onRefresh={() => refreshWidget(widget.id)}
    compact={true}
  />
) : (
  // ... existing widget rendering
)}
```

---

## File 8: Export Updates

### Update: src/services/index.ts (if exists)

```typescript
export * from './aiWidgetService';
```

### Update: src/components/dashboard/index.ts (if exists)

```typescript
export { AIWidgetRenderer } from './AIWidgetRenderer';
```

---

## Testing Checklist

After implementing:

### Widget Creation:
1. ✅ "Add to Dashboard" button works in AI Studio
2. ✅ Can select individual sections or full report
3. ✅ Widget name and size are configurable
4. ✅ Success message shows "Added!"
5. ✅ Widget saved to storage bucket

### Widget Display:
1. ✅ AI widgets appear in dashboard
2. ✅ Widgets show live data (executed on load)
3. ✅ Purple dot indicates AI widget
4. ✅ Hover reveals action buttons

### Widget Management:
1. ✅ Refresh button re-executes data
2. ✅ "Open in Studio" navigates to source report
3. ✅ Delete shows confirmation
4. ✅ Delete removes widget from storage

---

# END OF PHASE 7C

This phase integrates AI-generated visualizations into your existing widget infrastructure.

**Phase 7 Complete:**
- ✅ 7A: AI Data Exploration (verify data before building)
- ✅ 7B: Custom Report → AI Enhancement (bridge with context)
- ✅ 7C: Universal Widget System (save to dashboard)

Users now have two complete paths to dashboard widgets:
1. **AI-First**: Ask → Explore → Build → Save Widget
2. **Data-First**: Custom Report → Enhance with AI → Save Widget

Both produce live widgets that query fresh data on every page load.
