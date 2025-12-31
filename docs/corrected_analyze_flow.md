# CORRECTED: Analyze Page UX Flow

## The Problem

Currently there's a jarring disconnect:

1. **AnalyzePage** shows two clean cards: "Ask AI" vs "Build Report"
2. User clicks "Ask AI" → lands on **AIReportStudioPage** 
3. **AIReportStudioPage** shows THREE tabs (AI Studio, Report Builder, My Reports)
4. User already made their choice! Why show it again?

## The Solution

**Keep tabs on AnalyzePage as the "hub" - the AI experience should be immersive without tabs**

### Option A: Remove tabs from AIReportStudioPage (RECOMMENDED)

When user clicks "Ask AI", they get the pure AI experience. No tabs. If they want Report Builder, they go back to Analyze page and click that card.

### Option B: Make AnalyzePage the hub with tabs

Transform AnalyzePage to BE the hub with tabs, and inline the experiences.

---

## Option A Implementation (RECOMMENDED)

### File: src/pages/AIReportStudioPage.tsx

**Key Change:** Remove the StudioHeader's tabs. Keep only the essential header with back button.

Replace StudioHeader call with a minimal header:

```tsx
// REPLACE the StudioHeader component with this simpler header
// Remove the import for StudioHeader

// In the render, replace:
// <StudioHeader ... />

// With this:
<header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/analyze')}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Back to Analyze"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="hidden sm:block">
        <h1 className="text-lg font-semibold text-gray-900">Ask AI</h1>
        <p className="text-xs text-gray-500">
          Describe what you want to see
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {/* Mobile view toggle - only when there's a report */}
      {hasReport && (
        <div className="lg:hidden flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMobileView('chat')}
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
            onClick={() => setMobileView('preview')}
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

      <button
        onClick={handleNewReport}
        className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white hover:bg-rocket-700 rounded-lg transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
  </div>
</header>
```

**Also remove:**
- The `activeTab` state and logic
- The library tab content
- The builder tab content  
- All references to `activeTab`

The AI experience should ONLY show:
1. The chat + suggested prompts (when no report)
2. The chat + report preview (when report exists)

---

### File: src/pages/AnalyzePage.tsx

**Key Change:** Add tabs for navigation, keep the entry cards for first-time experience.

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Sparkles, Table2, Clock, ArrowRight, FolderOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { formatDistanceToNow } from 'date-fns';

type AnalyzeTab = 'start' | 'my-reports';

export function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, effectiveCustomerId } = useAuth();
  const { reports: customReports } = useCustomerReports();

  const [activeTab, setActiveTab] = useState<AnalyzeTab>('start');
  const [recentReports, setRecentReports] = useState<Array<{ id: string; name: string; type: 'ai' | 'custom'; date: string }>>([]);
  const [allReports, setAllReports] = useState<SavedAIReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [user, effectiveCustomerId, customReports]);

  async function loadReports() {
    if (!user || !effectiveCustomerId) return;
    setIsLoading(true);

    try {
      const aiReports = await loadAIReports(effectiveCustomerId.toString());
      setAllReports(aiReports);

      const combined = [
        ...aiReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'ai' as const,
          date: r.createdAt,
        })),
        ...customReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'custom' as const,
          date: r.updatedAt || r.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentReports(combined);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAskAI = () => {
    navigate('/ai-studio');
  };

  const handleBuildReport = () => {
    navigate('/custom-reports');
  };

  return (
    <div className="bg-slate-50 -m-6 lg:-m-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Analyze Your Data
          </h1>
          <p className="text-slate-600 text-lg">
            Create reports with AI or build them manually
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('start')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'start'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'my-reports'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            My Reports
            {(allReports.length + customReports.length) > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
                {allReports.length + customReports.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'start' ? (
          <>
            {/* Main Choice Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <button
                onClick={handleAskAI}
                className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Ask AI
                </h2>
                <p className="text-slate-600 mb-4">
                  Describe what you want in plain language. Best for quick exploration and complex questions.
                </p>
                <div className="flex items-center text-orange-600 font-medium">
                  Get started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={handleBuildReport}
                className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Table2 className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Build Report
                </h2>
                <p className="text-slate-600 mb-4">
                  Select columns, filters, and groupings manually. Best for precise specifications.
                </p>
                <div className="flex items-center text-slate-700 font-medium">
                  Open builder
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Recent Reports */}
            {recentReports.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    Recent Reports
                  </h3>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {recentReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => navigate(
                        report.type === 'ai'
                          ? `/ai-reports/${report.id}`
                          : `/custom-reports/${report.id}`
                      )}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        report.type === 'ai'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {report.type === 'ai' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <Table2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {report.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="mt-12 p-6 bg-slate-100 rounded-xl">
              <h4 className="font-medium text-slate-900 mb-3">Quick tips</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Ask AI</strong> works best for questions like "Show me cost trends by carrier" or "Which lanes have the highest spend?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span><strong>Build Report</strong> is better when you know exactly which columns and filters you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Any report can be saved, scheduled, or added to your dashboard</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          /* My Reports Tab */
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading reports...</div>
            ) : (allReports.length + customReports.length) === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No reports yet</h3>
                <p className="text-slate-500 mb-6">Create your first report to get started</p>
                <button
                  onClick={() => setActiveTab('start')}
                  className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors"
                >
                  Create Report
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Reports */}
                {allReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-medium text-slate-700">AI Reports</h3>
                      <span className="text-xs text-slate-400">({allReports.length})</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {allReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => navigate(`/ai-reports/${report.id}`)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{report.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Reports */}
                {customReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Table2 className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-medium text-slate-700">Custom Reports</h3>
                      <span className="text-xs text-slate-400">({customReports.length})</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {customReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => navigate(`/custom-reports/${report.id}`)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{report.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(report.updatedAt || report.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyzePage;
```

---

### File: src/pages/AIReportStudioPage.tsx (SIMPLIFIED)

This is a focused, pure AI experience. No tabs. Just conversation + preview.

**Changes to make:**

1. Remove `activeTab` state and all tab-related logic
2. Remove `StudioHeader` import and usage
3. Add simple inline header with back navigation
4. Remove builder tab content
5. Remove library tab content
6. Keep ONLY the chat experience

```tsx
// Near the top, REMOVE:
// import { StudioHeader } from '../components/ai-studio';
// type ActiveTab = 'create' | 'library' | 'builder';

// REMOVE state:
// const [activeTab, setActiveTab] = useState<ActiveTab>('create');

// Add imports if not present:
import { ArrowLeft, MessageSquare, BarChart3, Plus, Sparkles } from 'lucide-react';

// In render, REPLACE entire StudioHeader and tab content with:

return (
  <div className="h-[calc(100vh-64px)] flex flex-col">
    {/* Simple Header - No Tabs */}
    <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analyze')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Analyze"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900">Ask AI</h1>
            <p className="text-xs text-gray-500">Describe what you want to see</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasReport && (
            <div className="lg:hidden flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMobileView('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mobileView === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setMobileView('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mobileView === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Preview
              </button>
            </div>
          )}

          <button
            onClick={handleNewReport}
            className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white hover:bg-rocket-700 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>
    </header>

    {/* Enhancement Context Banner - Keep this */}
    {enhancementContext && (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3">
        {/* ... existing enhancement context content ... */}
      </div>
    )}

    {/* Main Content - Chat + Preview ONLY */}
    <div className="flex-1 flex min-h-0 relative">
      {!hasReport ? (
        // Initial state: suggested prompts + chat input
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          <SuggestedPrompts
            messages={messages}
            widgetContext={widgetContext}
            onClearContext={() => setWidgetContext(null)}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            messagesEndRef={messagesEndRef}
            dataProfile={dataProfile}
            enhancementContext={enhancementContext}
          />
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isGenerating}
              placeholder="Describe your report..."
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
          </div>
        </div>
      ) : (
        // Report exists: chat panel + preview panel
        <div className="flex-1 flex min-h-0">
          {/* Chat Panel */}
          <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${isChatCollapsed ? 'lg:w-12' : 'w-full lg:w-[400px] xl:w-[450px]'}`}>
            {/* ... existing chat panel content ... */}
          </div>

          {/* Preview Panel */}
          <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-gray-50`}>
            {/* ... existing preview panel content ... */}
          </div>
        </div>
      )}
    </div>
    
    {/* Keep all modals at the end */}
  </div>
);
```

---

## Summary

**The key insight:** 

- AnalyzePage = Hub/Menu (tabs belong here)
- AIReportStudioPage = Immersive Experience (no tabs, just the thing itself)
- CustomReportsPage = Immersive Experience (no tabs)

When user makes a choice on the hub, they enter that experience fully. To switch, they go back to the hub.

This is cleaner because:
1. No duplicate navigation (user already chose)
2. Immersive focus on the task at hand
3. Back button provides clear escape route
4. Hub shows "My Reports" in context with creation options
