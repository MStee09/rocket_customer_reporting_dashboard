// ============================================================================
// PHASE 2 (CORRECTED): BIDIRECTIONAL FLOW
// ============================================================================
// 
// Now that Column Builder is a tab within AI Studio, the bidirectional flow
// is simpler - we're just switching tabs and passing context.
//
// Flow 1: Builder → AI ("Enhance with AI")
//   - User builds column selection in Builder tab
//   - Clicks "Enhance with AI" 
//   - Switches to Create tab with context pre-loaded
//   - AI generates report using their column selection
//
// Flow 2: AI → Builder ("Edit Columns")  
//   - User has AI-generated report
//   - Clicks "Edit Columns"
//   - Switches to Builder tab with columns pre-populated
//   - User can refine exact columns, then save as custom report
//
// ============================================================================


// ============================================================================
// FILE 1: src/pages/AIReportStudioPage.tsx (ADDITIONAL CHANGES)
// ============================================================================
// 
// Add these state and handlers to support bidirectional flow
//

/*
CHANGE 1: Add state for enhancement context (near other state declarations)
---------------------------------------------------------------------------
ADD:
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
CHANGE 2: Add handler for "Enhance with AI" (when coming from Builder tab)
--------------------------------------------------------------------------
This is called when user clicks "Enhance with AI" in the Builder tab.
ADD:
*/
const handleEnhanceFromBuilder = useCallback((builderState: {
  selectedColumns: Array<{ id: string; label: string; aggregation?: string }>;
  filters: any[];
  sorts: any[];
  isSummary: boolean;
  groupByColumns: string[];
  name: string;
}) => {
  // Store the context
  setBuilderContext({
    columns: builderState.selectedColumns,
    filters: builderState.filters,
    sorts: builderState.sorts,
    isSummary: builderState.isSummary,
    groupByColumns: builderState.groupByColumns,
    reportName: builderState.name,
  });
  
  // Build a prompt from the builder state
  const columnNames = builderState.selectedColumns.map(c => c.label).join(', ');
  const prompt = buildEnhancementPrompt(builderState);
  
  // Switch to create tab
  setActiveTab('create');
  
  // Clear any existing report
  setCurrentReport(null);
  setExecutedData(null);
  setMessages([]);
  
  // Auto-send the prompt after a brief delay (let tab switch render)
  setTimeout(() => {
    handleSendMessage(prompt);
  }, 100);
}, [handleSendMessage]);


/*
CHANGE 3: Add handler for "Edit Columns" (when going from AI report to Builder)
-------------------------------------------------------------------------------
This is called when user clicks "Edit Columns" on an AI-generated report.
ADD:
*/
const handleEditColumnsInBuilder = useCallback(() => {
  if (!currentReport) return;
  
  // Extract columns from the current AI report
  const extractedColumns = extractColumnsFromAIReport(currentReport);
  
  // Store context for Builder to pick up
  setBuilderContext({
    columns: extractedColumns,
    filters: [],
    sorts: [],
    isSummary: false,
    groupByColumns: [],
    reportName: currentReport.name,
  });
  
  // Switch to builder tab
  setActiveTab('builder');
}, [currentReport]);


/*
CHANGE 4: Helper function to build enhancement prompt
-----------------------------------------------------
ADD:
*/
function buildEnhancementPrompt(builderState: {
  selectedColumns: Array<{ id: string; label: string; aggregation?: string }>;
  filters: any[];
  isSummary: boolean;
  groupByColumns: string[];
}): string {
  const columns = builderState.selectedColumns.map(c => c.label).join(', ');
  
  const parts = [`Create a report with these columns: ${columns}`];
  
  if (builderState.isSummary && builderState.groupByColumns.length > 0) {
    parts.push(`Summarize by: ${builderState.groupByColumns.join(', ')}`);
  }
  
  if (builderState.filters.length > 0) {
    const enabledFilters = builderState.filters.filter((f: any) => f.enabled);
    if (enabledFilters.length > 0) {
      parts.push(`With ${enabledFilters.length} filter(s) applied`);
    }
  }
  
  parts.push('Add an appropriate visualization and provide key insights about the data.');
  
  return parts.join('. ');
}


/*
CHANGE 5: Helper function to extract columns from AI report
-----------------------------------------------------------
ADD:
*/
function extractColumnsFromAIReport(report: AIReportDefinition): Array<{ id: string; label: string }> {
  const columns: Array<{ id: string; label: string }> = [];
  
  for (const section of report.sections) {
    if (section.type === 'table') {
      const tableConfig = (section as any).config;
      if (tableConfig?.columns) {
        for (const col of tableConfig.columns) {
          // Avoid duplicates
          if (!columns.some(c => c.id === col.field)) {
            columns.push({
              id: col.field,
              label: col.label || col.field,
            });
          }
        }
      }
    }
    
    // Also extract from chart configs
    if (section.type === 'chart') {
      const chartConfig = (section as any).config;
      if (chartConfig?.groupBy && !columns.some(c => c.id === chartConfig.groupBy)) {
        columns.push({
          id: chartConfig.groupBy,
          label: chartConfig.groupBy.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        });
      }
      if (chartConfig?.metric && !columns.some(c => c.id === chartConfig.metric)) {
        columns.push({
          id: chartConfig.metric,
          label: chartConfig.metric.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        });
      }
    }
  }
  
  return columns;
}


/*
CHANGE 6: Update renderTabContent to pass context to Builder
------------------------------------------------------------
In the renderTabContent function from Phase 1, update the builder case:
*/

// In renderTabContent(), update the builder tab case:
if (activeTab === 'builder') {
  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <SimpleReportBuilder
        onClose={() => setActiveTab('create')}
        onSave={handleSaveCustomReport}
        isInline={true}
        // NEW: Pass initial state from AI report (if editing columns)
        initialState={builderContext ? {
          name: builderContext.reportName || '',
          selectedColumns: builderContext.columns,
          filters: builderContext.filters,
          sorts: builderContext.sorts,
          isSummary: builderContext.isSummary,
          groupByColumns: builderContext.groupByColumns,
        } : undefined}
        // NEW: Callback for "Enhance with AI" button
        onEnhanceWithAI={handleEnhanceFromBuilder}
      />
    </div>
  );
}


/*
CHANGE 7: Pass handleEditColumnsInBuilder to ReportPreviewHeader
----------------------------------------------------------------
Find where ReportPreviewHeader is rendered and add the new prop:

BEFORE:
  <ReportPreviewHeader
    report={currentReport}
    editableTitle={editableTitle}
    ... other props ...
  />

AFTER:
  <ReportPreviewHeader
    report={currentReport}
    editableTitle={editableTitle}
    ... other props ...
    onEditColumns={handleEditColumnsInBuilder}  // NEW
  />
*/


// ============================================================================
// FILE 2: src/components/SimpleReportBuilder.tsx (ADDITIONAL CHANGES)
// ============================================================================

/*
CHANGE 1: Update interface to include onEnhanceWithAI callback
--------------------------------------------------------------
*/
interface SimpleReportBuilderProps {
  onClose: () => void;
  onSave: (config: SimpleReportBuilderState) => void;
  initialState?: Partial<SimpleReportBuilderState>;
  isInline?: boolean;
  onEnhanceWithAI?: (state: SimpleReportBuilderState) => void; // NEW
}


/*
CHANGE 2: Update component to use the callback
----------------------------------------------
*/
export default function SimpleReportBuilder({ 
  onClose, 
  onSave, 
  initialState, 
  isInline = false,
  onEnhanceWithAI  // NEW
}: SimpleReportBuilderProps) {


/*
CHANGE 3: Add "Enhance with AI" button handler
----------------------------------------------
Replace any existing handleEnhanceWithAI with:
*/
const handleEnhanceWithAI = () => {
  if (onEnhanceWithAI) {
    // Use the callback (when inline in AI Studio)
    onEnhanceWithAI(state);
  } else {
    // Fallback: navigate to AI Studio with context in sessionStorage
    // (This is used when Builder is opened as a modal from CustomReportsPage)
    sessionStorage.setItem('enhancementContext', JSON.stringify({
      builderState: state,
      timestamp: Date.now()
    }));
    navigate('/ai-studio?enhance=true');
  }
};


/*
CHANGE 4: Update the "Enhance with AI" button in the inline header
------------------------------------------------------------------
The button should be disabled if there aren't enough columns selected:
*/
<button
  onClick={handleEnhanceWithAI}
  disabled={state.selectedColumns.length < 2}
  className="px-4 py-2 bg-amber-50 text-amber-700 font-medium rounded-lg 
             hover:bg-amber-100 transition-colors flex items-center gap-2
             border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
  title={state.selectedColumns.length < 2 
    ? "Select at least 2 columns to enhance with AI" 
    : "Send to AI Studio for visualization and insights"
  }
>
  <Sparkles className="w-4 h-4" />
  Enhance with AI
</button>


// ============================================================================
// FILE 3: src/components/ai-studio/ReportPreviewHeader.tsx (ADD EDIT COLUMNS)
// ============================================================================

/*
CHANGE 1: Add onEditColumns to interface
----------------------------------------
*/
interface ReportPreviewHeaderProps {
  report: AIReportDefinition | null;
  editableTitle: string;
  isEditingTitle: boolean;
  onEditTitle: (editing: boolean) => void;
  onTitleChange: (title: string) => void;
  onRefresh: () => void;
  onExportPDF: () => void;
  onEmail: () => void;
  onAddToDashboard: () => void;
  onSave: () => void;
  isExecuting: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  dashboardAddSuccess: boolean;
  hasExportableData: boolean;
  exportData: Record<string, unknown>[];
  exportColumns: any[];
  onEditColumns?: () => void; // NEW
}


/*
CHANGE 2: Destructure the new prop
----------------------------------
*/
export function ReportPreviewHeader({
  // ... existing props ...
  onEditColumns,
}: ReportPreviewHeaderProps) {


/*
CHANGE 3: Add "Edit Columns" button in the actions area
-------------------------------------------------------
Find the area with Save, Export, etc buttons. Add this button:
*/
{onEditColumns && (
  <button
    onClick={onEditColumns}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 
               hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
    title="Edit columns in Column Builder"
  >
    <Table className="w-4 h-4" />
    Edit Columns
  </button>
)}

// Don't forget to import Table from lucide-react at the top of the file


// ============================================================================
// SUMMARY: PHASE 2 CHANGES
// ============================================================================
/*
The bidirectional flow now works within the unified tab interface:

BUILDER → AI:
1. User selects columns in Builder tab
2. Clicks "Enhance with AI"
3. handleEnhanceFromBuilder is called
4. Context stored, tab switches to Create
5. Prompt auto-sent with column information
6. AI generates enhanced report with visualization

AI → BUILDER:
1. User has AI-generated report
2. Clicks "Edit Columns" in preview header
3. handleEditColumnsInBuilder is called
4. Columns extracted from report
5. Tab switches to Builder with columns pre-populated
6. User refines columns, saves as custom report

Key benefit: No page navigation required - just tab switches within same page.
Context passed via React state, not sessionStorage/URL params.
*/
