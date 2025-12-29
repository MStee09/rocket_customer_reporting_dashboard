import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Loader2, PanelLeftClose, PanelLeft, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  ChatMessage,
  ChatInput,
  AddToDashboardModal,
  AIReportWidgetConfig,
  SuggestedPrompts,
  ReportLibrary,
  ReportPreviewHeader,
  StudioHeader,
} from '../components/ai-studio';
import { ReportRenderer } from '../components/reports/studio';
import {
  ChatMessage as ChatMessageType,
  generateReport,
  saveAIReport,
  loadAIReports,
  loadAIReport,
  deleteAIReport,
  SavedAIReport,
} from '../services/aiReportService';
import { executeReportData } from '../services/reportDataExecutor';
import { getDocumentsForContext, buildKnowledgeContext } from '../services/knowledgeBaseService';
import { AIReportDefinition, ExecutedReportData, DateRangeType, TableSection } from '../types/aiReport';
import { supabase } from '../lib/supabase';
import { DateRange } from '../components/reports/studio/DateRangeSelector';
import { exportReportToPDF } from '../utils/pdfExport';
import { ColumnConfig } from '../services/exportService';
import { SchedulePromptBanner } from '../components/reports/SchedulePromptBanner';
import { EmailReportModal } from '../components/reports/EmailReportModal';

type ActiveTab = 'create' | 'library';
type SortOption = 'newest' | 'oldest' | 'name';

function generateColumnsFromData(data: Record<string, unknown>[]): ColumnConfig[] {
  if (!data.length) return [];
  const firstRow = data[0];
  return Object.keys(firstRow).map(key => {
    const value = firstRow[key];
    let format: ColumnConfig['format'] = 'text';
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('cost') || lowerKey.includes('spend') || lowerKey.includes('revenue') || lowerKey.includes('charge') || lowerKey.includes('retail')) {
      format = 'currency';
    } else if (lowerKey.includes('date')) {
      format = 'date';
    } else if (lowerKey.includes('percent') || lowerKey.includes('rate') || lowerKey.includes('margin')) {
      format = 'percent';
    } else if (typeof value === 'number') {
      format = 'number';
    }
    return { key, header: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), format };
  });
}

function extractExportableData(
  report: AIReportDefinition | null,
  executedData: ExecutedReportData | null
): { data: Record<string, unknown>[]; columns: ColumnConfig[] } {
  if (!report || !executedData) return { data: [], columns: [] };

  const tableSections = report.sections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section.type === 'table');

  if (tableSections.length === 0) {
    const chartSections = report.sections
      .map((section, index) => ({ section, index }))
      .filter(({ section }) => section.type === 'chart' || section.type === 'category-grid');

    for (const { index } of chartSections) {
      const sectionData = executedData.sections.find(s => s.sectionIndex === index);
      if (sectionData?.data && Array.isArray(sectionData.data) && sectionData.data.length > 0) {
        const data = sectionData.data as Record<string, unknown>[];
        return { data, columns: generateColumnsFromData(data) };
      }
    }
    return { data: [], columns: [] };
  }

  const { section, index } = tableSections[0];
  const tableSection = section as TableSection;
  const sectionData = executedData.sections.find(s => s.sectionIndex === index);
  if (!sectionData?.data || !Array.isArray(sectionData.data)) return { data: [], columns: [] };

  const data = sectionData.data as Record<string, unknown>[];
  const columns: ColumnConfig[] = tableSection.config.columns.map(col => ({
    key: col.field,
    header: col.label,
    format: col.format === 'string' ? 'text' : (col.format || 'text')
  }));

  return { data, columns };
}

export function AIReportStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, effectiveCustomerId, isViewingAsCustomer, viewingCustomer, customers } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<AIReportDefinition | null>(null);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedAIReport[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [knowledgeContext, setKnowledgeContext] = useState<string>('');
  const [widgetContext, setWidgetContext] = useState<any>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [showAddToDashboard, setShowAddToDashboard] = useState(false);
  const [dashboardAddSuccess, setDashboardAddSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(() => !sessionStorage.getItem('hideSchedulePrompt'));
  const [showEmailModal, setShowEmailModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const hasReport = currentReport !== null;
  const effectiveCustomerName = isViewingAsCustomer
    ? viewingCustomer?.company_name
    : customers.find((c) => c.customer_id === effectiveCustomerId)?.customer_name;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { setEditableTitle(currentReport?.name || 'Untitled Report'); }, [currentReport?.name]);

  const loadSavedReports = useCallback(async () => {
    if (!effectiveCustomerId) return;
    setIsLoadingSaved(true);
    try {
      const reports = await loadAIReports(String(effectiveCustomerId));
      setSavedReports(reports);
    } catch (error) {
      console.error('Failed to load saved reports:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [effectiveCustomerId]);

  useEffect(() => { loadSavedReports(); }, [loadSavedReports]);

  const loadKnowledgeContext = useCallback(async () => {
    if (!effectiveCustomerId) return;
    try {
      const docs = await getDocumentsForContext(supabase, String(effectiveCustomerId));
      const context = buildKnowledgeContext(docs);
      setKnowledgeContext(context);
    } catch (error) {
      console.error('Failed to load knowledge context:', error);
    }
  }, [effectiveCustomerId]);

  useEffect(() => { loadKnowledgeContext(); }, [loadKnowledgeContext]);

  const executeReport = useCallback(async (report: AIReportDefinition) => {
    if (!effectiveCustomerId) return;
    setIsExecuting(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;
    try {
      const data = await executeReportData(supabase, report, String(effectiveCustomerId), effectiveIsAdmin);
      setExecutedData(data);
    } catch (error) {
      console.error('Failed to execute report:', error);
      setExecutedData(null);
    } finally {
      setIsExecuting(false);
    }
  }, [effectiveCustomerId, isAdmin, isViewingAsCustomer]);

  const loadReportFromUrl = useCallback(async () => {
    const reportId = searchParams.get('reportId');
    const mode = searchParams.get('mode');
    if (!reportId || !effectiveCustomerId || mode !== 'edit') return;

    setIsLoadingFromUrl(true);
    setActiveTab('create');
    try {
      const report = await loadAIReport(String(effectiveCustomerId), reportId);
      if (report) {
        setCurrentReport(report.definition);
        setIsChatCollapsed(false);
        setMobileView('chat');
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've loaded "${report.name}" for editing. What changes would you like to make?`,
          timestamp: new Date(),
        }]);
        executeReport(report.definition);
      }
    } catch (error) {
      console.error('Failed to load report from URL:', error);
    } finally {
      setIsLoadingFromUrl(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, effectiveCustomerId, setSearchParams, executeReport]);

  useEffect(() => { loadReportFromUrl(); }, [loadReportFromUrl]);

  useEffect(() => {
    const checkForContext = () => {
      const contextStr = sessionStorage.getItem('ai_studio_context');
      if (contextStr) {
        try {
          const context = JSON.parse(contextStr);
          const contextTime = new Date(context.timestamp).getTime();
          const isValid = Date.now() - contextTime < 5 * 60 * 1000;
          if (isValid) {
            setWidgetContext(context);
            setActiveTab('create');
            sessionStorage.removeItem('ai_studio_context');
          } else {
            sessionStorage.removeItem('ai_studio_context');
          }
        } catch (e) {
          sessionStorage.removeItem('ai_studio_context');
        }
      }
    };
    if (location.state?.hasContext) checkForContext();
  }, [location.state, location.key]);

  const handleSendMessage = async (content: string) => {
    if (!effectiveCustomerId) return;
    const userMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      const response = await generateReport(content, messages, String(effectiveCustomerId), effectiveIsAdmin, knowledgeContext || undefined, currentReport, effectiveCustomerName || undefined);
      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.report ? response.message || `I've created "${response.report.name}" for you.` : response.message,
        timestamp: new Date(),
        report: response.report || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (response.report) {
        setCurrentReport(response.report);
        executeReport(response.report);
        setMobileView('preview');
      }
    } catch (error) {
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to generate report. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!currentReport || !effectiveCustomerId || isSaving) return;
    setIsSaving(true);
    try {
      const reportToSave = { ...currentReport, name: editableTitle || currentReport.name || 'Untitled Report' };
      await saveAIReport(reportToSave, String(effectiveCustomerId));
      setSaveSuccess(true);
      await loadSavedReports();
      setTimeout(() => {
        setCurrentReport(null);
        setExecutedData(null);
        setMessages([]);
        setMobileView('chat');
        setIsChatCollapsed(false);
        setActiveTab('library');
        setIsSaving(false);
        setSaveSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to save report:', error);
      setIsSaving(false);
    }
  };

  const handleDeleteSavedReport = async (reportId: string) => {
    if (!effectiveCustomerId) return;
    try {
      await deleteAIReport(String(effectiveCustomerId), reportId);
      await loadSavedReports();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleDateRangeChange = async (range: DateRangeType, dates?: DateRange) => {
    if (!currentReport || !effectiveCustomerId) return;
    const updatedReport = {
      ...currentReport,
      dateRange: { type: range, customStart: dates?.start?.toISOString(), customEnd: dates?.end?.toISOString() },
    };
    setCurrentReport(updatedReport);
    executeReport(updatedReport);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !currentReport) return;
    const titleToUse = editableTitle || currentReport.name || 'Report';
    await exportReportToPDF(reportRef.current, { title: titleToUse, filename: titleToUse });
  };

  const handleNewReport = () => {
    setCurrentReport(null);
    setExecutedData(null);
    setMessages([]);
    setMobileView('chat');
    setIsChatCollapsed(false);
    setEditableTitle('');
    setIsEditingTitle(false);
    setActiveTab('create');
  };

  const handleAddToDashboard = (config: AIReportWidgetConfig) => {
    const existing = JSON.parse(localStorage.getItem('dashboard_ai_widgets') || '[]');
    existing.push(config);
    localStorage.setItem('dashboard_ai_widgets', JSON.stringify(existing));
    setDashboardAddSuccess(true);
    setTimeout(() => setDashboardAddSuccess(false), 2000);
  };

  const handleAddToDashboardClick = async () => {
    if (!currentReport || !effectiveCustomerId) return;
    const isReportSaved = savedReports.some(r => r.id === currentReport.id);
    if (!isReportSaved) {
      setIsSaving(true);
      try {
        const reportToSave = { ...currentReport, name: editableTitle || currentReport.name || 'Untitled Report' };
        await saveAIReport(reportToSave, String(effectiveCustomerId));
        await loadSavedReports();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
      } catch (error) {
        console.error('Failed to save report:', error);
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    setShowAddToDashboard(true);
  };

  const handleEditReport = (report: SavedAIReport) => {
    setActiveTab('create');
    setCurrentReport(report.definition);
    executeReport(report.definition);
    setIsChatCollapsed(false);
    setMobileView('chat');
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `I've loaded "${report.name}" for editing. What changes would you like to make?`,
      timestamp: new Date(),
    }]);
  };

  const handleExportReport = (report: SavedAIReport) => {
    const blob = new Blob([JSON.stringify(report.definition, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportableData = useMemo(() => extractExportableData(currentReport, executedData), [currentReport, executedData]);
  const hasExportableData = exportableData.data.length > 0;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <StudioHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
        hasReport={hasReport}
        savedReportsCount={savedReports.length}
        onNewReport={handleNewReport}
      />

      {activeTab === 'library' ? (
        <ReportLibrary
          reports={savedReports}
          isLoading={isLoadingSaved}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onEditReport={handleEditReport}
          onExportReport={handleExportReport}
          onDeleteReport={handleDeleteSavedReport}
          onCreateNew={() => setActiveTab('create')}
          deleteConfirm={deleteConfirm}
          onDeleteConfirmChange={setDeleteConfirm}
        />
      ) : (
        <div className="flex-1 flex min-h-0 relative">
          {!hasReport ? (
            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
              <SuggestedPrompts
                messages={messages}
                widgetContext={widgetContext}
                onClearContext={() => setWidgetContext(null)}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                messagesEndRef={messagesEndRef}
              />
              <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
                <ChatInput onSend={handleSendMessage} isLoading={isGenerating} placeholder="Describe your report..." />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${isChatCollapsed ? 'lg:w-12' : 'w-full lg:w-[400px] xl:w-[450px]'}`}>
                {isChatCollapsed ? (
                  <div className="flex flex-col items-center py-4">
                    <button onClick={() => setIsChatCollapsed(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Expand chat">
                      <PanelLeft className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                      <button onClick={handleNewReport} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        New Report
                      </button>
                      <button onClick={() => setIsChatCollapsed(true)} className="hidden lg:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Collapse chat">
                        <PanelLeftClose className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {widgetContext && (
                        <div className="mb-4 p-3 bg-rocket-50 border border-rocket-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rocket-600" />
                            <span className="text-sm text-rocket-700">Analyzing: <span className="font-medium">{widgetContext.title}</span></span>
                          </div>
                          <button onClick={() => setWidgetContext(null)} className="text-rocket-500 hover:text-rocket-700 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="space-y-4">
                        {messages.map((message) => <ChatMessage key={message.id} message={message} isCompact />)}
                        {isGenerating && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Updating report...</span>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 border-t border-gray-200 p-3">
                      <ChatInput onSend={handleSendMessage} isLoading={isGenerating} placeholder="Refine your report..." />
                    </div>
                  </>
                )}
              </div>

              <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-gray-50 min-w-0`}>
                <ReportPreviewHeader
                  report={currentReport}
                  editableTitle={editableTitle}
                  isEditingTitle={isEditingTitle}
                  onEditTitle={setIsEditingTitle}
                  onTitleChange={setEditableTitle}
                  onRefresh={() => executeReport(currentReport)}
                  onExportPDF={handleExportPDF}
                  onEmail={() => setShowEmailModal(true)}
                  onAddToDashboard={handleAddToDashboardClick}
                  onSave={handleSaveReport}
                  isExecuting={isExecuting}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  dashboardAddSuccess={dashboardAddSuccess}
                  hasExportableData={hasExportableData}
                  exportData={exportableData.data}
                  exportColumns={exportableData.columns}
                />
                <div className="flex-1 overflow-y-auto">
                  <div className="relative">
                    {isExecuting && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-rocket-600" />
                          <span className="text-gray-700">Loading data...</span>
                        </div>
                      </div>
                    )}
                    <div ref={reportRef} data-report-content className="p-6 bg-white">
                      <ReportRenderer report={currentReport} data={executedData} isLoading={false} onDateRangeChange={handleDateRangeChange} embedded />
                    </div>
                    {showSchedulePrompt && executedData && (
                      <div className="px-6 pb-6">
                        <SchedulePromptBanner reportType="ai" reportName={editableTitle || currentReport?.name || 'AI Report'} onDismiss={() => setShowSchedulePrompt(false)} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoadingFromUrl && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-rocket-600" />
            <span className="text-gray-700">Loading report...</span>
          </div>
        </div>
      )}

      {currentReport && (
        <AddToDashboardModal
          isOpen={showAddToDashboard}
          onClose={() => setShowAddToDashboard(false)}
          report={{ id: currentReport.id, name: editableTitle || currentReport.name, description: currentReport.description, definition: currentReport, customerId: String(effectiveCustomerId), createdAt: currentReport.createdAt, createdBy: currentReport.createdBy }}
          onAdd={handleAddToDashboard}
        />
      )}

      {hasExportableData && (
        <EmailReportModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} reportName={editableTitle || currentReport?.name || 'AI Report'} reportData={exportableData.data} reportType="ai" />
      )}
    </div>
  );
}

export default AIReportStudioPage;
