// ============================================================================
// PHASE 1: UNIFIED ENTRY POINT
// ============================================================================
// Replace the current AnalyticsPage hub with a tabbed interface
// AI Studio is the default tab, Custom Builder is accessible via second tab
// ============================================================================

// FILE: src/pages/CreatePage.tsx (NEW FILE - replaces AnalyticsPage)
// ----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Table, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Import existing components
import { AIReportStudioContent } from '../components/ai-studio/AIReportStudioContent';
import SimpleReportBuilder from '../components/SimpleReportBuilder';
import { SimpleReportBuilderState, ReportConfig } from '../types/reports';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';

type TabType = 'ai-studio' | 'column-builder';

export function CreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isViewingAsCustomer, viewingCustomer } = useAuth();
  const { saveReport } = useCustomerReports();
  
  // Get tab from URL, default to 'ai-studio'
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'ai-studio');
  
  // Sync tab state with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  // Handle saving from the Column Builder
  const handleSaveReport = async (state: SimpleReportBuilderState) => {
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

  return (
    <div className="h-full flex flex-col">
      {/* Customer context banner (if viewing as customer) */}
      {isViewingAsCustomer && viewingCustomer && (
        <div className="mx-4 mt-4 px-4 py-3 bg-orange-500/10 border border-orange-500/40 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">
              Creating reports for {viewingCustomer.company_name}
            </span>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-4">
          <nav className="flex gap-1" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('ai-studio')}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'ai-studio'
                  ? 'border-rocket-500 text-rocket-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              AI Studio
            </button>
            <button
              onClick={() => handleTabChange('column-builder')}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'column-builder'
                  ? 'border-rocket-500 text-rocket-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              <Table className="w-4 h-4" />
              Column Builder
            </button>
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai-studio' ? (
          // Render AI Studio content
          // Note: You may need to extract the content from AIReportStudioPage 
          // into a separate component (AIReportStudioContent) for cleaner reuse
          <AIStudioTab />
        ) : (
          // Render Column Builder inline (not as modal)
          <ColumnBuilderTab onSave={handleSaveReport} />
        )}
      </div>
    </div>
  );
}

// AI Studio Tab - wrapper around existing AI Studio functionality
function AIStudioTab() {
  // This renders the AI Studio interface
  // For now, we can import and render the existing page content
  // Ideally, extract the core content from AIReportStudioPage into a reusable component
  
  return (
    <div className="h-full">
      {/* 
        Option 1: If AIReportStudioPage can work as-is without page wrapper:
        <AIReportStudioPage />
        
        Option 2: Extract content into AIReportStudioContent component
        This is cleaner for reuse
      */}
      <AIReportStudioPageContent />
    </div>
  );
}

// Placeholder - you'll want to extract this from AIReportStudioPage
function AIReportStudioPageContent() {
  // For initial implementation, you can render AIReportStudioPage directly
  // Later, refactor to extract just the content (without page-level layout)
  return (
    <div className="h-full">
      {/* Import and render AIReportStudioPage content here */}
      {/* The existing page should work, just needs the outer layout removed */}
    </div>
  );
}

// Column Builder Tab - renders SimpleReportBuilder as full-page content (not modal)
function ColumnBuilderTab({ onSave }: { onSave: (state: SimpleReportBuilderState) => void }) {
  return (
    <div className="h-full bg-slate-50">
      {/* 
        SimpleReportBuilder is currently a modal.
        For Phase 1, you can render it with onClose={() => {}} 
        In Phase 2+, refactor to have a non-modal version
      */}
      <SimpleReportBuilderInline onSave={onSave} />
    </div>
  );
}

// Inline version of SimpleReportBuilder (non-modal)
// This is a wrapper - you may want to refactor SimpleReportBuilder to support both modes
function SimpleReportBuilderInline({ onSave }: { onSave: (state: SimpleReportBuilderState) => void }) {
  return (
    <div className="h-full overflow-auto">
      {/* 
        For quick implementation: Render SimpleReportBuilder with modal styles removed
        For proper implementation: Add a `mode="inline"` prop to SimpleReportBuilder
      */}
      <SimpleReportBuilder 
        onClose={() => {}} // No-op since we're not in a modal
        onSave={onSave}
      />
    </div>
  );
}

export default CreatePage;


// ============================================================================
// FILE: src/App.tsx - ROUTING CHANGES
// ============================================================================
// Update the routes to use CreatePage instead of AnalyticsPage

/*
CHANGES TO MAKE:

1. Add import:
   import { CreatePage } from './pages/CreatePage';

2. Replace the analytics route:

   BEFORE:
   <Route path="analytics" element={<AnalyticsPage />} />

   AFTER:
   <Route path="create" element={<CreatePage />} />
   
3. Add redirect for old URL:
   <Route path="analytics" element={<Navigate to="/create" replace />} />

4. Update the custom-reports and ai-studio routes to still work:
   <Route path="custom-reports" element={<CustomReportsPage />} />
   <Route path="custom-reports/:reportId" element={<CustomReportViewPage />} />
   <Route path="ai-studio" element={<Navigate to="/create?tab=ai-studio" replace />} />
*/


// ============================================================================
// FILE: src/components/Sidebar.tsx - NAVIGATION CHANGES
// ============================================================================
// Update the sidebar to point to /create instead of /analytics

/*
CHANGES TO MAKE:

In the mainNavItems array, update the Create item:

BEFORE:
{
  to: '/analytics',
  icon: BarChart3,
  label: 'Create',
  matchPaths: ['/analytics', '/ai-studio', '/custom-reports']
},

AFTER:
{
  to: '/create',
  icon: BarChart3,
  label: 'Create',
  matchPaths: ['/create', '/ai-studio', '/custom-reports']
},
*/
