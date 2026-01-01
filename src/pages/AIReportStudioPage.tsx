import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Loader2, PanelLeftClose, PanelLeft, Plus, X, Brain,
  ArrowLeft, MessageSquare, BarChart3
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import {
  ChatMessage,
  ChatInput,
  AddToDashboardModal,
  AIReportWidgetConfig,
  SuggestedPrompts,
  ReportPreviewHeader,
  FollowUpSuggestions,
} from '../components/ai-studio';
import type { DataProfile } from '../components/ai-studio/SuggestedPrompts';
import { ReportRenderer } from '../components/reports/studio';
import {
  ChatMessage as ChatMessageType,
  generateReport,
  saveAIReport,
  loadAIReports,
  loadAIReport,
  SavedAIReport,
  AILearning,
  ExtractedReportContext,
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
import { ReportEnhancementContext } from '../types/reportEnhancement';
import { formatContextForAI, generateEnhancementSuggestions } from '../utils/reportEnhancementContext';

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
  if (!report || !executedData || !report.sections || !executedData.sections) {
    return { data: [], columns: [] };
  }

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
  const tableColumns = tableSection.config?.columns;
  if (!tableColumns || !Array.isArray(tableColumns)) {
    return { data, columns: generateColumnsFromData(data) };
  }

  const columns: ColumnConfig[] = tableColumns.map(col => ({
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

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<AIReportDefinition | null>(null);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedAIReport[]>([]);
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
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(() => !sessionStorage.getItem('hideSchedulePrompt'));
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null);
  const [enhancementContext, setEnhancementContext] = useState<ReportEnhancementContext | null>(null);
  const [learningToast, setLearningToast] = useState<{ visible: boolean; learnings: AILearning[] }>({ visible: false, learnings: [] });
  const [buildReportContext, setBuildReportContext] = useState<ExtractedReportContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const hasReport = currentReport !== null;
  const effectiveCustomerName = isViewingAsCustomer
    ? viewingCustomer?.company_name
    : customers.find((c) => c.customer_id === effectiveCustomerId)?.customer_name;

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch {
      }
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { setEditableTitle(currentReport?.name || 'Untitled Report'); }, [currentReport?.name]);

  const loadSavedReports = useCallback(async () => {
    if (!effectiveCustomerId) return;
    try {
      const reports = await loadAIReports(String(effectiveCustomerId));
      setSavedReports(reports);
    } catch (error) {
      console.error('Failed to load saved reports:', error);
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

  const loadDataProfile = useCallback(async () => {
    if (!effectiveCustomerId) return;
    try {
      const { data, error } = await supabase.rpc('get_customer_data_profile', {
        p_customer_id: String(effectiveCustomerId)
      });
      if (error) {
        console.error('Failed to load data profile:', error);
        return;
      }
      setDataProfile(data as DataProfile);
    } catch (error) {
      console.error('Failed to load data profile:', error);
    }
  }, [effectiveCustomerId]);

  useEffect(() => { loadDataProfile(); }, [loadDataProfile]);

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

  const urlReportId = searchParams.get('reportId');
  const urlMode = searchParams.get('mode');
  const urlQuery = searchParams.get('query');

  useEffect(() => {
    if (urlQuery && messages.length === 0 && !isGenerating && effectiveCustomerId) {
      handleSendMessage(urlQuery);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('query');
      setSearchParams(newParams, { replace: true });
    }
  }, [urlQuery, effectiveCustomerId]);

  useEffect(() => {
    if (!urlReportId || !effectiveCustomerId || urlMode !== 'edit') return;

    let isMounted = true;
    setIsLoadingFromUrl(true);

    const loadReport = async () => {
      try {
        const report = await loadAIReport(String(effectiveCustomerId), urlReportId);
        if (report && isMounted) {
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
        if (isMounted) {
          setIsLoadingFromUrl(false);
          setSearchParams({}, { replace: true });
        }
      }
    };

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [urlReportId, urlMode, effectiveCustomerId, executeReport, setSearchParams]);

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

  useEffect(() => {
    const checkForEnhancementContext = () => {
      const contextStr = sessionStorage.getItem('enhancement_context');
      if (contextStr) {
        try {
          const context: ReportEnhancementContext = JSON.parse(contextStr);
          const contextTime = new Date(context.timestamp).getTime();
          const isValid = Date.now() - contextTime < 10 * 60 * 1000;

          if (isValid) {
            setEnhancementContext(context);

            const suggestions = generateEnhancementSuggestions(context);
            const suggestionsText = suggestions.length > 0
              ? `\n\n**Suggestions:**\n${suggestions.map(s => `- ${s}`).join('\n')}`
              : '';

            const initialMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I've loaded your custom report "${context.sourceReportName}" with ${context.rowCount.toLocaleString()} rows.\n\n**Available columns:**\n${context.columns.map(c => `- **${c.label}** (${c.type})`).join('\n')}${suggestionsText}\n\nWhat visualization would you like to create? You can:\n- Group by any text column and show as a chart\n- Categorize by keywords (e.g., "group description by 'drawer', 'cargoglide', 'toolbox'")\n- Calculate metrics (e.g., "cost per item")\n\nThis will be a **live report** that updates automatically with new data.`,
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

    checkForEnhancementContext();
  }, [location.state]);

  const handleSendMessage = async (content: string) => {
    if (!effectiveCustomerId) return;
    const userMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      let combinedContext = knowledgeContext || '';
      if (enhancementContext) {
        combinedContext = formatContextForAI(enhancementContext) + '\n\n' + combinedContext;
      }

      const response = await generateReport(content, messages, String(effectiveCustomerId), effectiveIsAdmin, combinedContext || undefined, currentReport, effectiveCustomerName || undefined);

      if (response.reportContext) {
        setBuildReportContext({
          hasIntent: response.reportContext.hasIntent,
          hasColumns: response.reportContext.hasColumns,
          hasFilters: response.reportContext.hasFilters,
          suggestedColumns: response.reportContext.suggestedColumns || [],
          suggestedFilters: response.reportContext.suggestedFilters || [],
        });
      }

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
      if (response.learnings && response.learnings.length > 0) {
        setLearningToast({ visible: true, learnings: response.learnings });
        setTimeout(() => setLearningToast({ visible: false, learnings: [] }), 5000);
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
        setIsSaving(false);
        setSaveSuccess(false);
        navigate('/analyze?tab=my-reports');
      }, 1500);
    } catch (error) {
      console.error('Failed to save report:', error);
      setIsSaving(false);
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

  const handleBuildReportFromContext = (context: ExtractedReportContext) => {
    navigate('/custom-reports', {
      state: {
        initialColumns: context.suggestedColumns.map(col => ({
          id: col,
          label: col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        })),
        initialFilters: context.suggestedFilters.map(f => ({
          columnId: f.column,
          operator: f.operator,
          value: f.value,
          enabled: true,
        })),
        reportName: context.reportName || 'New Report',
      }
    });
  };

  const extractColumnsFromAIReport = useCallback((report: AIReportDefinition): Array<{ id: string; label: string }> => {
    const columns: Array<{ id: string; label: string }> = [];

    for (const section of report.sections) {
      if (section.type === 'table') {
        const tableConfig = (section as TableSection).config;
        if (tableConfig?.columns) {
          for (const col of tableConfig.columns) {
            if (!columns.some(c => c.id === col.field)) {
              columns.push({
                id: col.field,
                label: col.label || col.field,
              });
            }
          }
        }
      }

      if (section.type === 'chart') {
        const chartConfig = (section as { type: 'chart'; config: { groupBy?: string; metric?: string } }).config;
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
  }, []);

  const handleEditColumnsInBuilder = useCallback(() => {
    if (!currentReport) return;

    const extractedColumns = extractColumnsFromAIReport(currentReport);

    navigate('/custom-reports', {
      state: {
        initialColumns: extractedColumns,
        reportName: currentReport.name,
      }
    });
  }, [currentReport, extractColumnsFromAIReport, navigate]);

  const exportableData = useMemo(() => extractExportableData(currentReport, executedData), [currentReport, executedData]);
  const hasExportableData = exportableData.data.length > 0;

  return (
    <ErrorBoundary>
    <div className="h-[calc(100vh-64px)] flex flex-col">
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

      {enhancementContext && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-medium shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>Enhancement Mode</span>
              </div>
              <span className="text-gray-700 font-medium">
                Enhancing: <span className="text-amber-700">{enhancementContext.sourceReportName}</span>
              </span>
              <span className="text-gray-500 text-sm">
                ({enhancementContext.rowCount.toLocaleString()} rows, {enhancementContext.columns.length} columns)
              </span>
            </div>
            <button
              onClick={() => setEnhancementContext(null)}
              className="ml-4 hover:bg-amber-100 rounded-full p-1.5 transition-colors"
              title="Exit enhancement mode"
            >
              <X className="w-4 h-4 text-amber-700" />
            </button>
          </div>
        </div>
      )}

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
              dataProfile={dataProfile}
              enhancementContext={enhancementContext}
            />
            <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isGenerating}
                placeholder="Ask me anything about your shipping data..."
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
                          <span>Thinking...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 border-t border-gray-200 p-3">
                    <ChatInput
                      onSend={handleSendMessage}
                      isLoading={isGenerating}
                      placeholder="Ask a question or refine your report..."
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
                onEditColumns={handleEditColumnsInBuilder}
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
                    {executedData && currentReport && (
                      <FollowUpSuggestions
                        currentReportType={currentReport.sections[0]?.type || 'default'}
                        groupBy={
                          (currentReport.sections.find(s => s.type === 'chart') as { config?: { groupBy?: string } })?.config?.groupBy ||
                          (currentReport.sections.find(s => s.type === 'table') as { config?: { groupBy?: string } })?.config?.groupBy
                        }
                        onSuggestionClick={handleSendMessage}
                      />
                    )}
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

      {learningToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Learned {learningToast.learnings.length} new {learningToast.learnings.length === 1 ? 'thing' : 'things'}</p>
              <p className="text-xs text-white/80 mt-0.5">
                {learningToast.learnings.map(l => l.key).join(', ')}
              </p>
            </div>
            <button
              onClick={() => setLearningToast({ visible: false, learnings: [] })}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

export default AIReportStudioPage;
