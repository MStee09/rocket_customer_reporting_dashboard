# "Analyze with AI" Button Implementation Guide

## Overview
This guide adds an "Analyze with AI" button to the SimpleReportBuilder component that:
1. Auto-saves the report (generating a name if empty)
2. Builds the enhancement context from selected columns
3. Navigates directly to AI Studio in Enhancement Mode

**Estimated Time:** 2-4 hours
**Lines of Code:** ~60 new lines
**Risk Level:** Low (reuses existing patterns)

---

## Phase 1: Update SimpleReportBuilder Component

### File: `src/components/SimpleReportBuilder.tsx`

#### Step 1.1: Add new imports at the top of the file

Find the existing imports section and add these:

```typescript
// ADD these new imports after the existing ones
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { buildEnhancementContext } from '../utils/reportEnhancementContext';
import { supabase } from '../lib/supabase';
```

#### Step 1.2: Update the component props interface

Find the `SimpleReportBuilderProps` interface and update it:

```typescript
interface SimpleReportBuilderProps {
  onClose: () => void;
  onSave: (config: SimpleReportBuilderState) => Promise<any>; // Changed to Promise<any> to get saved report back
  initialState?: Partial<SimpleReportBuilderState>;
}
```

#### Step 1.3: Add navigate hook and loading state inside the component

Find the beginning of the component function (after `export default function SimpleReportBuilder`) and add:

```typescript
export default function SimpleReportBuilder({ onClose, onSave, initialState }: SimpleReportBuilderProps) {
  // ADD this line after the function declaration
  const navigate = useNavigate();
  
  const { isAdmin, isViewingAsCustomer, effectiveCustomerId } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  // ADD this new state for AI loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // ... rest of existing code
```

#### Step 1.4: Add the handleAnalyzeWithAI function

Add this new function after the existing `handleSave` function (around line 200-250 area):

```typescript
  // ADD this entire function
  const handleAnalyzeWithAI = async () => {
    // Validate we have columns selected
    if (state.selectedColumns.length === 0) {
      alert('Please select at least one column before analyzing with AI.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Auto-generate name if empty
      const reportName = state.name.trim() || `Report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      
      // Create the state with the name
      const stateToSave = {
        ...state,
        name: reportName
      };

      // Save the report first (reuse existing save logic)
      const savedReport = await onSave(stateToSave);
      
      if (!savedReport) {
        throw new Error('Failed to save report');
      }

      // Fetch sample data for the enhancement context
      // Using the same pattern as CustomReportViewPage
      let sampleData: Record<string, unknown>[] = [];
      
      if (effectiveCustomerId) {
        const columnIds = state.selectedColumns.map(c => c.id);
        const selectFields = columnIds.join(', ');
        
        const { data, error } = await supabase
          .from('shipments')
          .select(selectFields)
          .eq('client_id', effectiveCustomerId)
          .limit(100);
        
        if (!error && data) {
          sampleData = data;
        }
      }

      // Build the enhancement context
      const enhancementContext = buildEnhancementContext(
        {
          id: savedReport.id || `report-${Date.now()}`,
          name: reportName,
          description: state.description,
          columns: state.selectedColumns,
          isSummary: state.isSummary,
          groupBy: state.groupByColumns,
          filters: state.filters,
          sorts: state.sorts
        },
        sampleData,
        {
          type: 'last30', // Default date range
          start: undefined,
          end: undefined
        }
      );

      // Store context in sessionStorage (same pattern as existing Enhance with AI)
      sessionStorage.setItem('enhancement_context', JSON.stringify(enhancementContext));

      // Close the builder modal
      onClose();

      // Navigate to AI Studio
      navigate('/ai-studio', {
        state: {
          enhancementMode: true,
          sourceReport: reportName
        }
      });

    } catch (error) {
      console.error('Error analyzing with AI:', error);
      alert('Failed to analyze with AI. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
```

#### Step 1.5: Update the footer section with the new button

Find the footer section (around line 487-508) and replace it with:

```typescript
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {state.selectedColumns.length} column{state.selectedColumns.length !== 1 ? 's' : ''} selected
            {totalActiveFilters > 0 && ` • ${totalActiveFilters} filter${totalActiveFilters !== 1 ? 's' : ''}`}
            {totalSorts > 0 && ` • ${totalSorts} sort${totalSorts !== 1 ? 's' : ''}`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {/* NEW: Analyze with AI Button */}
            <button
              onClick={handleAnalyzeWithAI}
              disabled={state.selectedColumns.length === 0 || isAnalyzing}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-md hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              title="Save report and open in AI Studio for visualization"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={!state.name.trim() || state.selectedColumns.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-rocket-600 rounded-md hover:bg-rocket-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialState?.name ? 'Save Changes' : 'Create Report'}
            </button>
          </div>
        </div>
```

---

## Phase 2: Update CustomReportsPage to Return Saved Report

### File: `src/pages/CustomReportsPage.tsx`

The `handleSaveReport` function needs to return the saved report so the new button can use it.

#### Step 2.1: Update handleSaveReport function

Find the `handleSaveReport` function and update it to return the report:

```typescript
  const handleSaveReport = async (state: SimpleReportBuilderState) => {
    try {
      let columns = state.selectedColumns;
      let groupByColumns = state.groupByColumns;

      if (isViewingAsCustomer) {
        columns = filterAdminOnlyColumns(columns);
        groupByColumns = filterAdminOnlyColumnIds(groupByColumns);

        console.log('Filtered admin-only columns from customer report', {
          originalColumns: state.selectedColumns.length,
          filteredColumns: columns.length,
          originalGroupBy: state.groupByColumns.length,
          filteredGroupBy: groupByColumns.length
        });
      }

      const reportConfig: ReportConfig = {
        id: `report-${Date.now()}`,
        name: state.name,
        description: state.description,
        type: 'custom',
        config: {
          primaryTable: 'shipments',
          filters: {},
        },
        visualization: state.visualization as any,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
      };

      (reportConfig as any).simpleReport = {
        columns: columns,
        isSummary: state.isSummary,
        groupBy: groupByColumns,
        visualization: state.visualization,
        filters: state.filters || [],
        sorts: state.sorts || []
      };

      await saveReport(reportConfig);
      setIsBuilderOpen(false);
      
      // CHANGE: Return the report config instead of navigating
      // This allows the Analyze with AI button to use it
      return reportConfig;
      
      // NOTE: Remove or comment out this navigation if you want the modal to handle navigation
      // navigate(`/custom-reports/${reportConfig.id}`, { state: { newReport: reportConfig } });
      
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
      return null;
    }
  };
```

**IMPORTANT:** If you want "Create Report" to still navigate to the report view, you'll need to handle it differently. Here's an alternative approach:

```typescript
  const handleSaveReport = async (state: SimpleReportBuilderState, navigateAfterSave = true) => {
    try {
      // ... same code as above until the end ...

      await saveReport(reportConfig);
      setIsBuilderOpen(false);
      
      // Only navigate if flag is true (for normal Create Report button)
      if (navigateAfterSave) {
        navigate(`/custom-reports/${reportConfig.id}`, { state: { newReport: reportConfig } });
      }
      
      return reportConfig;
      
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
      return null;
    }
  };
```

Then update the SimpleReportBuilder component to pass a flag or handle the save differently.

---

## Phase 3: Alternative - Simpler Self-Contained Approach

If you don't want to modify the parent component's save handler, use this simpler approach that handles everything within SimpleReportBuilder:

### Replace the handleAnalyzeWithAI function with this version:

```typescript
  const handleAnalyzeWithAI = async () => {
    if (state.selectedColumns.length === 0) {
      alert('Please select at least one column before analyzing with AI.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Auto-generate name if empty
      const reportName = state.name.trim() || `AI Report ${new Date().toLocaleDateString()}`;
      
      // Fetch sample data
      let sampleData: Record<string, unknown>[] = [];
      
      if (effectiveCustomerId) {
        const columnIds = state.selectedColumns.map(c => c.id);
        const selectFields = columnIds.join(', ');
        
        const { data, error } = await supabase
          .from('shipments')
          .select(selectFields)
          .eq('client_id', effectiveCustomerId)
          .limit(100);
        
        if (!error && data) {
          sampleData = data;
        }
      }

      // Build enhancement context directly from current state
      const enhancementContext = buildEnhancementContext(
        {
          id: `temp-${Date.now()}`,
          name: reportName,
          description: state.description,
          columns: state.selectedColumns,
          isSummary: state.isSummary,
          groupBy: state.groupByColumns,
          filters: state.filters,
          sorts: state.sorts
        },
        sampleData,
        { type: 'last30' }
      );

      // Store context
      sessionStorage.setItem('enhancement_context', JSON.stringify(enhancementContext));

      // Also trigger the normal save in background (optional)
      if (state.name.trim()) {
        onSave({ ...state });
      }

      onClose();
      navigate('/ai-studio', {
        state: {
          enhancementMode: true,
          sourceReport: reportName
        }
      });

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze with AI. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
```

---

## Phase 4: Testing Checklist

After implementing, test these scenarios:

### Test 1: Basic Flow
1. Open Custom Reports
2. Click "Add Report" 
3. Select 3-4 columns (e.g., Load ID, Carrier, Retail)
4. Click "Analyze with AI"
5. ✅ Should navigate to AI Studio
6. ✅ Should show Enhancement Mode banner
7. ✅ Should list your selected columns

### Test 2: Without Report Name
1. Open report builder
2. Select columns but DON'T enter a name
3. Click "Analyze with AI"
4. ✅ Should auto-generate a name
5. ✅ Should still work

### Test 3: Normal Save Still Works
1. Open report builder
2. Enter name and select columns
3. Click "Create Report" (not Analyze)
4. ✅ Should save and navigate to report view
5. ✅ "Enhance with AI" button should still work there

### Test 4: Disabled States
1. Open report builder
2. Don't select any columns
3. ✅ "Analyze with AI" button should be disabled
4. Select a column
5. ✅ Button should become enabled

### Test 5: Admin Context
1. Login as admin
2. Select "View as: [Customer]"
3. Open report builder
4. Click "Analyze with AI"
5. ✅ Should use customer's data context

---

## Complete Code: Full SimpleReportBuilder.tsx

Here's the complete updated file with all changes integrated (key changes marked with // NEW or // CHANGED):

```typescript
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // NEW
import { X, GripVertical, Plus, Package, DollarSign, MapPin, Flag, Truck, Box, Building, ChevronDown, ChevronRight, Filter, ArrowUpDown, Sparkles } from 'lucide-react'; // CHANGED: Added Sparkles
import { COLUMN_CATEGORIES, getColumnsByCategory, getColumnById } from '../config/reportColumns';
import { SimpleReportColumn, SimpleReportBuilderState } from '../types/reports';
import { ColumnFilter, ColumnSort } from '../types/filters';
import { useAuth } from '../contexts/AuthContext';
import ColumnFilterSection from './reports/ColumnFilterSection';
import { ColumnPreviewTooltip } from './reports/ColumnPreviewTooltip';
import { buildEnhancementContext } from '../utils/reportEnhancementContext'; // NEW
import { supabase } from '../lib/supabase'; // NEW

interface SimpleReportBuilderProps {
  onClose: () => void;
  onSave: (config: SimpleReportBuilderState) => void;
  initialState?: Partial<SimpleReportBuilderState>;
}

// ... (categoryIcons and DEFAULT_LOAD_ID_COLUMN stay the same) ...

export default function SimpleReportBuilder({ onClose, onSave, initialState }: SimpleReportBuilderProps) {
  const navigate = useNavigate(); // NEW
  const { isAdmin, isViewingAsCustomer, effectiveCustomerId } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  const [isAnalyzing, setIsAnalyzing] = useState(false); // NEW

  // ... (all existing state and functions stay the same until after handleSave) ...

  // NEW: Add this function after handleSave
  const handleAnalyzeWithAI = async () => {
    if (state.selectedColumns.length === 0) {
      alert('Please select at least one column before analyzing with AI.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const reportName = state.name.trim() || `AI Report ${new Date().toLocaleDateString()}`;
      
      let sampleData: Record<string, unknown>[] = [];
      
      if (effectiveCustomerId) {
        const columnIds = state.selectedColumns.map(c => c.id);
        const selectFields = columnIds.join(', ');
        
        const { data, error } = await supabase
          .from('shipments')
          .select(selectFields)
          .eq('client_id', effectiveCustomerId)
          .limit(100);
        
        if (!error && data) {
          sampleData = data;
        }
      }

      const enhancementContext = buildEnhancementContext(
        {
          id: `temp-${Date.now()}`,
          name: reportName,
          description: state.description,
          columns: state.selectedColumns,
          isSummary: state.isSummary,
          groupBy: state.groupByColumns,
          filters: state.filters,
          sorts: state.sorts
        },
        sampleData,
        { type: 'last30' }
      );

      sessionStorage.setItem('enhancement_context', JSON.stringify(enhancementContext));

      onClose();
      navigate('/ai-studio', {
        state: {
          enhancementMode: true,
          sourceReport: reportName
        }
      });

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze with AI. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ... (rest of component until the footer) ...

  // CHANGED: Footer section
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* ... all existing JSX until the footer ... */}
      
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {state.selectedColumns.length} column{state.selectedColumns.length !== 1 ? 's' : ''} selected
            {totalActiveFilters > 0 && ` • ${totalActiveFilters} filter${totalActiveFilters !== 1 ? 's' : ''}`}
            {totalSorts > 0 && ` • ${totalSorts} sort${totalSorts !== 1 ? 's' : ''}`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {/* NEW: Analyze with AI Button */}
            <button
              onClick={handleAnalyzeWithAI}
              disabled={state.selectedColumns.length === 0 || isAnalyzing}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-md hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              title="Save report and open in AI Studio for visualization"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={!state.name.trim() || state.selectedColumns.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-rocket-600 rounded-md hover:bg-rocket-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialState?.name ? 'Save Changes' : 'Create Report'}
            </button>
          </div>
        </div>
      </div>

      {/* ... tooltip JSX stays the same ... */}
    </div>
  );
}
```

---

## Summary of All Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `SimpleReportBuilder.tsx` | Import | Add `useNavigate`, `Sparkles`, `buildEnhancementContext`, `supabase` |
| `SimpleReportBuilder.tsx` | State | Add `isAnalyzing` state |
| `SimpleReportBuilder.tsx` | Function | Add `handleAnalyzeWithAI` function |
| `SimpleReportBuilder.tsx` | JSX | Add new purple button in footer |

**Total new code:** ~60 lines
**Files modified:** 1 (optionally 2 if updating parent)
**Breaking changes:** None
