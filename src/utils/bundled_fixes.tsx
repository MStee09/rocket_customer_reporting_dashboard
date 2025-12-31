// ============================================================================
// BUNDLED FIXES: Tab Order, Rename, and Enhance with AI Button
// ============================================================================
// 
// This file contains all the fixes needed:
// 1. Reorder tabs: AI Studio | Report Builder | My Reports
// 2. Rename "Column Builder" to "Report Builder"
// 3. Add prominent "Enhance with AI" button
// 4. Wire up the bidirectional flow
//
// ============================================================================


// ============================================================================
// FILE 1: src/components/ai-studio/StudioHeader.tsx (REPLACE ENTIRE FILE)
// ============================================================================

import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  MessageSquare,
  BarChart3,
  FolderOpen,
  FileText,
  ArrowLeft,
} from 'lucide-react';

type ActiveTab = 'create' | 'library' | 'builder';
type MobileView = 'chat' | 'preview';

interface StudioHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  mobileView: MobileView;
  onMobileViewChange: (view: MobileView) => void;
  hasReport: boolean;
  savedReportsCount: number;
  onNewReport: () => void;
}

export function StudioHeader({
  activeTab,
  onTabChange,
  mobileView,
  onMobileViewChange,
  hasReport,
  savedReportsCount,
  onNewReport,
}: StudioHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rocket-500 to-rocket-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900">Create Reports</h1>
            <p className="text-xs text-gray-500">
              Build reports with AI or select columns manually
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile view toggle - only show when in create tab with a report */}
          {hasReport && activeTab === 'create' && (
            <div className="lg:hidden flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onMobileViewChange('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mobileView === 'chat'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => onMobileViewChange('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mobileView === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Preview
              </button>
            </div>
          )}

          {/* New Report button - only show in create/library tabs */}
          {activeTab !== 'builder' && (
            <button
              onClick={onNewReport}
              className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white hover:bg-rocket-700 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New AI Report</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab bar - CORRECT ORDER: AI Studio | Report Builder | My Reports */}
      <div className="flex items-center gap-1 mt-4 border-b border-gray-100 -mb-3">
        {/* Tab 1: AI Studio */}
        <button
          onClick={() => onTabChange('create')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-rocket-600 text-rocket-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Studio
        </button>
        
        {/* Tab 2: Report Builder (renamed from Column Builder) */}
        <button
          onClick={() => onTabChange('builder')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'builder'
              ? 'border-rocket-600 text-rocket-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Report Builder
        </button>
        
        {/* Tab 3: My Reports (library - at the end) */}
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-rocket-600 text-rocket-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          My Reports
          {savedReportsCount > 0 && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              activeTab === 'library'
                ? 'bg-rocket-100 text-rocket-600'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {savedReportsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default StudioHeader;


// ============================================================================
// FILE 2: src/components/SimpleReportBuilder.tsx (KEY CHANGES)
// ============================================================================
//
// Apply these changes to your existing SimpleReportBuilder.tsx file
//

/*
CHANGE 1: Add Sparkles to imports
---------------------------------
*/
import { 
  X, GripVertical, Plus, Package, DollarSign, MapPin, Flag, Truck, Box, Building, 
  ChevronDown, ChevronRight, Filter, ArrowUpDown, 
  Sparkles  // ADD THIS
} from 'lucide-react';


/*
CHANGE 2: Update the interface to add onEnhanceWithAI prop
----------------------------------------------------------
*/
interface SimpleReportBuilderProps {
  onClose: () => void;
  onSave: (config: SimpleReportBuilderState) => void;
  initialState?: Partial<SimpleReportBuilderState>;
  isInline?: boolean;
  onEnhanceWithAI?: (state: SimpleReportBuilderState) => void; // ADD THIS
}


/*
CHANGE 3: Destructure the new prop in the function signature
------------------------------------------------------------
*/
export default function SimpleReportBuilder({ 
  onClose, 
  onSave, 
  initialState, 
  isInline = false,
  onEnhanceWithAI  // ADD THIS
}: SimpleReportBuilderProps) {


/*
CHANGE 4: Add the handleEnhanceWithAI function (inside the component, near other handlers)
------------------------------------------------------------------------------------------
*/
const handleEnhanceWithAI = () => {
  if (onEnhanceWithAI) {
    // When inline in AI Studio page, use the callback
    onEnhanceWithAI(state);
  } else {
    // When in modal (from CustomReportsPage), navigate with context
    sessionStorage.setItem('enhancementContext', JSON.stringify({
      builderState: state,
      timestamp: Date.now()
    }));
    navigate('/ai-studio?enhance=true');
  }
};


/*
CHANGE 5: Update the inline header (when isInline is true)
----------------------------------------------------------
Find the section that renders when isInline is true and update the header.
If you don't have this section yet, add it at the start of your return statement:
*/

// At the start of the return statement, before the modal wrapper:
if (isInline) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Report Builder (renamed from Column Builder) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Report Builder</h2>
          <p className="text-sm text-gray-500">Select columns, filters, and groupings for your report</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ENHANCE WITH AI BUTTON - Prominent gradient style */}
          <button
            onClick={handleEnhanceWithAI}
            disabled={state.selectedColumns.length < 2}
            className={`
              px-4 py-2 font-medium rounded-lg transition-all flex items-center gap-2
              ${state.selectedColumns.length >= 2
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
            title={state.selectedColumns.length < 2 
              ? "Select at least 2 columns to enhance with AI" 
              : "Add visualizations and insights with AI"
            }
          >
            <Sparkles className="w-4 h-4" />
            Enhance with AI
          </button>
          
          {/* Save Report Button */}
          <button
            onClick={() => onSave(state)}
            disabled={!state.name.trim() || state.selectedColumns.length === 0}
            className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2 font-medium"
          >
            Save Report
          </button>
        </div>
      </div>

      {/* Body - same content as modal body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - column categories */}
        <div className="w-72 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4 flex-shrink-0">
          {/* ... existing column category list code ... */}
        </div>

        {/* Right side - selected columns, filters, preview */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ... existing right panel code ... */}
        </div>
      </div>
    </div>
  );
}

// Modal mode continues below (existing code)
return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    {/* ... existing modal code ... */}
  </div>
);


// ============================================================================
// FILE 3: src/pages/AIReportStudioPage.tsx (KEY CHANGES)
// ============================================================================
//
// Apply these changes to wire up the Enhance with AI functionality
//

/*
CHANGE 1: Add import for SimpleReportBuilder types (if not already present)
---------------------------------------------------------------------------
*/
import SimpleReportBuilder from '../components/SimpleReportBuilder';
import { SimpleReportBuilderState, ReportConfig } from '../types/reports';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';


/*
CHANGE 2: Update the ActiveTab type (around line 40)
----------------------------------------------------
*/
type ActiveTab = 'create' | 'library' | 'builder';


/*
CHANGE 3: Add the useCustomerReports hook (inside the component)
----------------------------------------------------------------
*/
const { saveReport } = useCustomerReports();


/*
CHANGE 4: Add state for builder context (for bidirectional flow)
----------------------------------------------------------------
*/
const [builderContext, setBuilderContext] = useState<{
  columns: Array<{ id: string; label: string; aggregation?: string }>;
  filters: any[];
  sorts: any[];
  isSummary: boolean;
  groupByColumns: string[];
  reportName?: string;
} | null>(null);


/*
CHANGE 5: Add handleEnhanceFromBuilder function
-----------------------------------------------
This is called when user clicks "Enhance with AI" in Report Builder
*/
const handleEnhanceFromBuilder = useCallback((builderState: SimpleReportBuilderState) => {
  // Build a natural language prompt from the builder state
  const columnNames = builderState.selectedColumns.map(c => c.label).join(', ');
  
  let prompt = `Create a report with these columns: ${columnNames}.`;
  
  if (builderState.isSummary && builderState.groupByColumns && builderState.groupByColumns.length > 0) {
    prompt += ` Summarize the data by ${builderState.groupByColumns.join(', ')}.`;
  }
  
  if (builderState.filters && builderState.filters.length > 0) {
    const enabledFilters = builderState.filters.filter((f: any) => f.enabled);
    if (enabledFilters.length > 0) {
      prompt += ` Apply ${enabledFilters.length} filter(s).`;
    }
  }
  
  prompt += ' Add an appropriate chart visualization and provide key insights about the data.';
  
  // Switch to the AI Studio tab
  setActiveTab('create');
  
  // Clear any existing report state
  setCurrentReport(null);
  setExecutedData(null);
  setMessages([]);
  
  // Auto-send the prompt after tab switch renders
  setTimeout(() => {
    handleSendMessage(prompt);
  }, 150);
}, [handleSendMessage]);


/*
CHANGE 6: Add handleSaveCustomReport function
---------------------------------------------
This is called when user saves a report from the Report Builder tab
*/
const handleSaveCustomReport = async (state: SimpleReportBuilderState) => {
  try {
    let columns = state.selectedColumns;
    let groupByColumns = state.groupByColumns || [];

    if (isViewingAsCustomer) {
      columns = filterAdminOnlyColumns(columns);
      groupByColumns = filterAdminOnlyColumnIds(groupByColumns);
    }

    const reportConfig: ReportConfig = {
      id: `report-${Date.now()}`,
      name: state.name,
      description: state.description || '',
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
    navigate(`/custom-reports/${reportConfig.id}`, { state: { newReport: reportConfig } });
  } catch (error) {
    console.error('Error saving report:', error);
    alert('Failed to save report. Please try again.');
  }
};


/*
CHANGE 7: Create a renderTabContent helper function
---------------------------------------------------
This makes the conditional rendering cleaner. Add this before the return statement:
*/
const renderTabContent = () => {
  // Report Builder tab
  if (activeTab === 'builder') {
    return (
      <div className="flex-1 overflow-auto bg-gray-50">
        <SimpleReportBuilder
          onClose={() => setActiveTab('create')}
          onSave={handleSaveCustomReport}
          isInline={true}
          initialState={builderContext ? {
            name: builderContext.reportName || '',
            selectedColumns: builderContext.columns,
            filters: builderContext.filters,
            sorts: builderContext.sorts,
            isSummary: builderContext.isSummary,
            groupByColumns: builderContext.groupByColumns,
          } : undefined}
          onEnhanceWithAI={handleEnhanceFromBuilder}
        />
      </div>
    );
  }
  
  // My Reports (library) tab
  if (activeTab === 'library') {
    return (
      <ReportLibrary
        reports={filteredReports}
        isLoading={isLoadingSaved}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        deleteConfirm={deleteConfirm}
        onDeleteConfirm={setDeleteConfirm}
        onDelete={handleDeleteReport}
        onSelect={handleSelectReport}
      />
    );
  }
  
  // AI Studio (create) tab - return null here, the existing code handles this
  return null;
};


/*
CHANGE 8: Update the render section
-----------------------------------
Find where the tab content is rendered and integrate renderTabContent().
The structure should look something like:

{activeTab === 'builder' || activeTab === 'library' ? (
  renderTabContent()
) : (
  // ... existing AI Studio create tab content ...
)}
*/


// ============================================================================
// SUMMARY OF ALL CHANGES
// ============================================================================
/*

FILE: src/components/ai-studio/StudioHeader.tsx
- REPLACE entire file with the code above
- Tabs now ordered: AI Studio | Report Builder | My Reports
- "Column Builder" renamed to "Report Builder"
- Icon changed from Table to FileText

FILE: src/components/SimpleReportBuilder.tsx
- Add Sparkles to imports
- Add onEnhanceWithAI prop to interface
- Add handleEnhanceWithAI function
- Add inline header with:
  - Title: "Report Builder" (not "Column Builder")
  - Prominent gradient "Enhance with AI" button
  - Save Report button

FILE: src/pages/AIReportStudioPage.tsx
- Update ActiveTab type to include 'builder'
- Add SimpleReportBuilder and related imports
- Add useCustomerReports hook
- Add builderContext state
- Add handleEnhanceFromBuilder function
- Add handleSaveCustomReport function
- Add renderTabContent helper
- Update render logic to handle all three tabs

RESULT:
- Tab bar shows: AI Studio | Report Builder | My Reports
- Report Builder has prominent "Enhance with AI" button
- Clicking "Enhance with AI":
  1. Takes column selection from Report Builder
  2. Switches to AI Studio tab
  3. Auto-generates prompt with those columns
  4. AI creates report with visualization + insights
- Bidirectional flow is now complete
*/
