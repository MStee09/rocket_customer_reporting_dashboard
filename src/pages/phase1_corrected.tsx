// ============================================================================
// PHASE 1 (CORRECTED): UNIFIED ENTRY POINT
// ============================================================================
// 
// THE PROBLEM WITH MY PREVIOUS APPROACH:
// I added a NEW tab bar on top of the existing AI Studio tabs, creating:
//   - Level 1: AI Studio | Column Builder (new)
//   - Level 2: Create with AI | My Reports (existing)
// This created MORE cognitive load, not less.
//
// THE CORRECT APPROACH:
// 1. Delete AnalyticsPage entirely (the hub with 2 cards)
// 2. Add "Column Builder" as a THIRD tab in the existing StudioHeader
// 3. Update sidebar to go directly to /ai-studio (now the unified create page)
// 4. Keep /custom-reports as a separate route for viewing saved custom reports
//
// Result: ONE tab bar with three options:
//   Create with AI | My Reports | Column Builder
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
  Table,
  ArrowLeft,
} from 'lucide-react';

// Updated to include 'builder' tab
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
          {/* Back button - now goes to dashboard since there's no hub */}
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
              <span className="hidden sm:inline">Create New Report</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab bar - NOW WITH THREE TABS */}
      <div className="flex items-center gap-1 mt-4 border-b border-gray-100 -mb-3">
        <button
          onClick={() => onTabChange('create')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-rocket-600 text-rocket-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Create with AI
        </button>
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
        {/* NEW: Column Builder tab */}
        <button
          onClick={() => onTabChange('builder')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'builder'
              ? 'border-rocket-600 text-rocket-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Table className="w-4 h-4" />
          Column Builder
        </button>
      </div>
    </header>
  );
}


// ============================================================================
// FILE 2: src/pages/AIReportStudioPage.tsx (KEY CHANGES ONLY)
// ============================================================================
// 
// You need to modify the existing file. Here are the specific changes:
//

/*
CHANGE 1: Update the ActiveTab type (around line 40)
----------------------------------------------------
BEFORE:
  type ActiveTab = 'create' | 'library';

AFTER:
  type ActiveTab = 'create' | 'library' | 'builder';
*/


/*
CHANGE 2: Add imports for Column Builder (add to existing imports)
------------------------------------------------------------------
ADD:
  import SimpleReportBuilder from '../components/SimpleReportBuilder';
  import { SimpleReportBuilderState, ReportConfig } from '../types/reports';
  import { useCustomerReports } from '../hooks/useCustomerReports';
  import { filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';
*/


/*
CHANGE 3: Add hook for custom reports (inside the component, near other hooks)
------------------------------------------------------------------------------
ADD:
  const { saveReport } = useCustomerReports();
*/


/*
CHANGE 4: Add handler for saving custom reports (add near other handlers)
-------------------------------------------------------------------------
ADD:
  const handleSaveCustomReport = async (state: SimpleReportBuilderState) => {
    try {
      let columns = state.selectedColumns;
      let groupByColumns = state.groupByColumns;

      if (isViewingAsCustomer) {
        columns = filterAdminOnlyColumns(columns);
        groupByColumns = filterAdminOnlyColumnIds(groupByColumns);
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
      navigate(`/custom-reports/${reportConfig.id}`, { state: { newReport: reportConfig } });
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    }
  };
*/


/*
CHANGE 5: Update the render to handle 'builder' tab
---------------------------------------------------
Find the section that renders based on activeTab (around line 480-540).
The structure currently looks something like:

  {activeTab === 'library' ? (
    <ReportLibrary ... />
  ) : (
    // Create tab content
  )}

REPLACE WITH:
*/

// This is the full render logic for the main content area
// Replace the existing conditional render with this:

const renderTabContent = () => {
  // Builder tab - render SimpleReportBuilder inline
  if (activeTab === 'builder') {
    return (
      <div className="flex-1 overflow-auto bg-gray-50">
        <SimpleReportBuilder
          onClose={() => setActiveTab('create')} // Switch to create tab on cancel
          onSave={handleSaveCustomReport}
          isInline={true} // We'll add this prop to SimpleReportBuilder
        />
      </div>
    );
  }
  
  // Library tab - existing ReportLibrary component
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
  
  // Create tab - existing AI creation interface
  return (
    <div className="flex-1 flex min-h-0">
      {/* ... existing chat panel and preview panel code ... */}
    </div>
  );
};

// Then in the JSX, replace the conditional with:
// {renderTabContent()}


// ============================================================================
// FILE 3: src/components/SimpleReportBuilder.tsx (ADD isInline PROP)
// ============================================================================

/*
CHANGE 1: Update the interface (around line 13)
-----------------------------------------------
BEFORE:
  interface SimpleReportBuilderProps {
    onClose: () => void;
    onSave: (config: SimpleReportBuilderState) => void;
    initialState?: Partial<SimpleReportBuilderState>;
  }

AFTER:
  interface SimpleReportBuilderProps {
    onClose: () => void;
    onSave: (config: SimpleReportBuilderState) => void;
    initialState?: Partial<SimpleReportBuilderState>;
    isInline?: boolean; // NEW: When true, renders without modal wrapper
  }
*/


/*
CHANGE 2: Destructure the new prop (around line 34)
---------------------------------------------------
BEFORE:
  export default function SimpleReportBuilder({ onClose, onSave, initialState }: SimpleReportBuilderProps) {

AFTER:
  export default function SimpleReportBuilder({ onClose, onSave, initialState, isInline = false }: SimpleReportBuilderProps) {
*/


/*
CHANGE 3: Conditional wrapper rendering
---------------------------------------
Find the return statement. The current structure wraps everything in a modal overlay.
You need to conditionally render either modal or inline based on isInline prop.

The current structure is roughly:
  return (
    <div className="fixed inset-0 bg-black/50 ..."> {/* Modal overlay */}
      <div className="..."> {/* Modal container */}
        {/* Header */}
        {/* Body */}
        {/* Footer */}
      </div>
    </div>
  );

CHANGE TO:
*/

// Replace the return statement structure with this:
// (Keep all the existing content, just wrap conditionally)

return isInline ? (
  // Inline mode - no modal, full page layout
  <div className="h-full flex flex-col">
    {/* Header - simplified for inline */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Column Builder</h2>
        <p className="text-sm text-gray-500">Select columns, filters, and groupings for your report</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Enhance with AI button - links to Phase 2 */}
        <button
          onClick={handleEnhanceWithAI}
          disabled={state.selectedColumns.length < 2 || isAnalyzing}
          className="px-4 py-2 bg-amber-50 text-amber-700 font-medium rounded-lg 
                     hover:bg-amber-100 transition-colors flex items-center gap-2
                     border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send to AI Studio for visualization and insights"
        >
          <Sparkles className="w-4 h-4" />
          Enhance with AI
        </button>
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

    {/* Body - same as modal body but full height */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left sidebar - column selection */}
      <div className="w-72 border-r border-gray-200 overflow-y-auto bg-white p-4">
        {/* ... existing column category list ... */}
      </div>

      {/* Right side - selected columns and preview */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ... existing selected columns, filters, preview ... */}
      </div>
    </div>
  </div>
) : (
  // Modal mode - existing modal wrapper (keep all existing code here)
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    {/* ... ALL existing modal code stays here unchanged ... */}
  </div>
);


// ============================================================================
// FILE 4: src/App.tsx (ROUTING CHANGES)
// ============================================================================

/*
CHANGE: Remove analytics route, update ai-studio to be the main create entry
---------------------------------------------------------------------------

BEFORE:
  <Route path="analytics" element={<AnalyticsPage />} />
  ...
  <Route path="ai-studio" element={<AIReportStudioPage />} />

AFTER:
  {/* Redirect old analytics path to ai-studio */}
  <Route path="analytics" element={<Navigate to="/ai-studio" replace />} />
  ...
  <Route path="ai-studio" element={<AIReportStudioPage />} />

You can also remove the AnalyticsPage import since it's no longer used.
*/


// ============================================================================
// FILE 5: src/components/Sidebar.tsx (NAVIGATION UPDATE)
// ============================================================================

/*
CHANGE: Update the Create nav item to go directly to ai-studio
--------------------------------------------------------------

Find the mainNavItems array (around line 49-65) and update:

BEFORE:
  {
    to: '/analytics',
    icon: BarChart3,
    label: 'Create',
    matchPaths: ['/analytics', '/ai-studio', '/custom-reports']
  },

AFTER:
  {
    to: '/ai-studio',
    icon: BarChart3,
    label: 'Create',
    matchPaths: ['/ai-studio', '/custom-reports']
  },
*/


// ============================================================================
// FILE 6: Delete src/pages/AnalyticsPage.tsx
// ============================================================================
// 
// You can delete this file entirely. It's no longer needed.
// The routing redirect (analytics -> ai-studio) handles any old bookmarks.
//


// ============================================================================
// SUMMARY: PHASE 1 CHANGES
// ============================================================================
/*
Files to modify:
1. src/components/ai-studio/StudioHeader.tsx - Add "Column Builder" as third tab
2. src/pages/AIReportStudioPage.tsx - Handle 'builder' tab, add SimpleReportBuilder
3. src/components/SimpleReportBuilder.tsx - Add isInline prop for non-modal rendering
4. src/App.tsx - Redirect /analytics to /ai-studio
5. src/components/Sidebar.tsx - Point "Create" to /ai-studio directly

Files to delete:
- src/pages/AnalyticsPage.tsx (the hub page)

Result:
- Sidebar "Create" → goes to /ai-studio
- /ai-studio has THREE tabs: Create with AI | My Reports | Column Builder
- No more decision paralysis hub
- Column Builder is inline, not a modal
- Users can still access /custom-reports to see their saved custom reports
*/
