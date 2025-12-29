import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Trash2,
  Download,
  Save,
  RefreshCw,
  BarChart3,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Check,
  Pencil,
  LayoutDashboard,
  Search,
  ArrowUpDown,
  TrendingUp,
  Table2,
  FolderOpen,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage, ChatInput, AddToDashboardModal, AIReportWidgetConfig } from '../components/ai-studio';
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
import {
  getDocumentsForContext,
  buildKnowledgeContext,
} from '../services/knowledgeBaseService';
import { AIReportDefinition, ExecutedReportData, DateRangeType, TableSection } from '../types/aiReport';
import { supabase } from '../lib/supabase';
import { DateRange } from '../components/reports/studio/DateRangeSelector';
import { exportReportToPDF } from '../utils/pdfExport';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ColumnConfig } from '../services/exportService';

const SUGGESTIONS = [
  'Show me total spend by transportation mode',
  'Create an executive summary of shipping activity',
  'Analyze my top shipping lanes by volume',
  'Compare costs across different equipment types',
];

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

    return {
      key,
      header: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      format
    };
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

  if (!sectionData?.data || !Array.isArray(sectionData.data)) {
    return { data: [], columns: [] };
  }

  const data = sectionData.data as Record<string, unknown>[];

  const columns: ColumnConfig[] = tableSection.config.columns.map(col => ({
    key: col.field,
    header: col.label,
    format: col.format === 'string' ? 'text' : (col.format || 'text')
  }));

  return { data, columns };
}

type ActiveTab = 'create' | 'library';
type SortOption = 'newest' | 'oldest' | 'name';

function getReportStats(report: SavedAIReport) {
  const sections = report.definition?.sections || [];
  const charts = sections.filter(s => s.type === 'chart').length;
  const tables = sections.filter(s => s.type === 'table').length;
  const metrics = sections.filter(s => s.type === 'hero_metric' || s.type === 'stat_row' || s.type === 'stat_grid').length;

  return { charts, tables, metrics, total: sections.length };
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const hasReport = currentReport !== null;

  const effectiveCustomerName = isViewingAsCustomer
    ? viewingCustomer?.company_name
    : customers.find((c) => c.customer_id === effectiveCustomerId)?.customer_name;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setEditableTitle(currentReport?.name || 'Untitled Report');
  }, [currentReport?.name]);

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

  useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

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

  useEffect(() => {
    loadKnowledgeContext();
  }, [loadKnowledgeContext]);

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
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I've loaded "${report.name}" for editing. What changes would you like to make?\n\nYou can ask me to modify the layout, change colors, add new sections, or update the data being displayed.`,
            timestamp: new Date(),
          },
        ]);

        setIsExecuting(true);
        const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;
        try {
          const data = await executeReportData(
            supabase,
            report.definition,
            String(effectiveCustomerId),
            effectiveIsAdmin
          );
          setExecutedData(data);
        } catch (err) {
          console.error('Failed to execute report:', err);
        } finally {
          setIsExecuting(false);
        }
      }
    } catch (error) {
      console.error('Failed to load report from URL:', error);
    } finally {
      setIsLoadingFromUrl(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, effectiveCustomerId, setSearchParams, isAdmin, isViewingAsCustomer]);

  useEffect(() => {
    loadReportFromUrl();
  }, [loadReportFromUrl]);

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
          console.error('Failed to parse AI context:', e);
          sessionStorage.removeItem('ai_studio_context');
        }
      }
    };

    if (location.state?.hasContext) {
      checkForContext();
    }
  }, [location.state, location.key]);

  const executeReport = useCallback(async (report: AIReportDefinition) => {
    if (!effectiveCustomerId) return;

    setIsExecuting(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      const data = await executeReportData(
        supabase,
        report,
        String(effectiveCustomerId),
        effectiveIsAdmin
      );
      setExecutedData(data);
    } catch (error) {
      console.error('Failed to execute report:', error);
      setExecutedData(null);
    } finally {
      setIsExecuting(false);
    }
  }, [effectiveCustomerId, isAdmin, isViewingAsCustomer]);

  const handleSendMessage = async (content: string) => {
    if (!effectiveCustomerId) return;

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      const response = await generateReport(
        content,
        messages,
        String(effectiveCustomerId),
        effectiveIsAdmin,
        knowledgeContext || undefined,
        currentReport,
        effectiveCustomerName || undefined
      );

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.report
          ? response.message || `I've created "${response.report.name}" for you.`
          : response.message,
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
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate report. Please try again.',
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
      const reportToSave = {
        ...currentReport,
        name: editableTitle || currentReport.name || 'Untitled Report',
      };
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
      dateRange: {
        type: range,
        customStart: dates?.start?.toISOString(),
        customEnd: dates?.end?.toISOString(),
      },
    };

    setCurrentReport(updatedReport);
    executeReport(updatedReport);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !currentReport) return;
    const titleToUse = editableTitle || currentReport.name || 'Report';
    await exportReportToPDF(reportRef.current, {
      title: titleToUse,
      filename: titleToUse,
    });
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
        const reportToSave = {
          ...currentReport,
          name: editableTitle || currentReport.name || 'Untitled Report',
        };
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
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've loaded "${report.name}" for editing. What changes would you like to make?\n\nYou can ask me to modify the layout, change colors, add new sections, or update the data being displayed.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleExportReport = (report: SavedAIReport) => {
    const blob = new Blob(
      [JSON.stringify(report.definition, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = savedReports;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = savedReports.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [savedReports, searchQuery, sortBy]);

  const exportableData = useMemo(() => {
    return extractExportableData(currentReport, executedData);
  }, [currentReport, executedData]);

  const hasExportableData = exportableData.data.length > 0;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/analytics')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Analytics"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900">AI Reports</h1>
              <p className="text-xs text-gray-500">
                Create reports with AI or browse your library
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create New Report</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4 border-b border-gray-100 -mb-3">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Create with AI
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            My Reports
            {savedReports.length > 0 && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                activeTab === 'library'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {savedReports.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {activeTab === 'library' ? (
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
          <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingSaved ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-500">Loading your reports...</p>
              </div>
            ) : filteredAndSortedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-gray-300" />
                </div>
                {searchQuery ? (
                  <>
                    <p className="text-lg font-medium text-gray-700">No reports match your search</p>
                    <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-700">No saved reports yet</p>
                    <p className="text-sm text-gray-400 mt-2 mb-6">Create your first report using AI</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Create Your First Report
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAndSortedReports.map((report, index) => {
                  const stats = getReportStats(report);
                  const isDeleting = deleteConfirm === report.id;
                  const accentColors = [
                    'bg-blue-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-cyan-500',
                  ];
                  const accent = accentColors[index % accentColors.length];

                  return (
                    <div
                      key={report.id}
                      className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex"
                      onClick={() => navigate(`/ai-reports/${report.id}`)}
                    >
                      <div className={`w-1 ${accent} flex-shrink-0`} />

                      <div className="flex-1 min-w-0">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {report.name}
                            </h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                              {new Date(report.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {report.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                              {report.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {stats.metrics > 0 && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                {stats.metrics} metric{stats.metrics > 1 ? 's' : ''}
                              </span>
                            )}
                            {stats.charts > 0 && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-3.5 h-3.5" />
                                {stats.charts} chart{stats.charts > 1 ? 's' : ''}
                              </span>
                            )}
                            {stats.tables > 0 && (
                              <span className="flex items-center gap-1">
                                <Table2 className="w-3.5 h-3.5" />
                                {stats.tables} table{stats.tables > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
                          {isDeleting ? (
                            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs text-red-600">Delete this report?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSavedReport(report.id); }}
                                  className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/ai-reports/${report.id}`); }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditReport(report); }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Edit
                              </button>
                              <div className="flex-1" />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleExportReport(report); }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                title="Export"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(report.id); }}
                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 relative">
          {!hasReport ? (
            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
              <div className="flex-1 overflow-y-auto p-4">
                {widgetContext && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Analyzing: <span className="font-medium">{widgetContext.title}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => setWidgetContext(null)}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                      What would you like to see?
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Describe the report you want to create and watch it build in real-time
                    </p>

                    <div className="grid gap-3 max-w-lg mx-auto">
                      {SUGGESTIONS.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(suggestion)}
                          disabled={isGenerating}
                          className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all group shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 group-hover:text-gray-900">
                              {suggestion}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isCompact={false}
                      />
                    ))}
                    {isGenerating && (
                      <div className="flex items-center gap-3 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating your report...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
                <ChatInput
                  onSend={handleSendMessage}
                  isLoading={isGenerating}
                  placeholder="Describe your report..."
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              <div
                className={`${
                  mobileView === 'chat' ? 'flex' : 'hidden'
                } lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
                  isChatCollapsed ? 'lg:w-12' : 'w-full lg:w-[400px] xl:w-[450px]'
                }`}
              >
                {isChatCollapsed ? (
                  <div className="flex flex-col items-center py-4">
                    <button
                      onClick={() => setIsChatCollapsed(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Expand chat"
                    >
                      <PanelLeft className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                      <button
                        onClick={handleNewReport}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New Report
                      </button>
                      <button
                        onClick={() => setIsChatCollapsed(true)}
                        className="hidden lg:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Collapse chat"
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {widgetContext && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                              Analyzing: <span className="font-medium">{widgetContext.title}</span>
                            </span>
                          </div>
                          <button
                            onClick={() => setWidgetContext(null)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <ChatMessage
                            key={message.id}
                            message={message}
                            isCompact
                          />
                        ))}
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
                      <ChatInput
                        onSend={handleSendMessage}
                        isLoading={isGenerating}
                        placeholder="Refine your report..."
                      />
                    </div>
                  </>
                )}
              </div>

              <div
                className={`${
                  mobileView === 'preview' ? 'flex' : 'hidden'
                } lg:flex flex-1 flex-col bg-gray-50 min-w-0`}
              >
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      {isEditingTitle ? (
                        <input
                          type="text"
                          value={editableTitle}
                          onChange={(e) => setEditableTitle(e.target.value)}
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsEditingTitle(false);
                            }
                            if (e.key === 'Escape') {
                              setIsEditingTitle(false);
                              setEditableTitle(currentReport.name || 'Untitled Report');
                            }
                          }}
                          className="font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
                          autoFocus
                        />
                      ) : (
                        <h2
                          className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 flex items-center gap-2 group"
                          onClick={() => setIsEditingTitle(true)}
                          title="Click to edit title"
                        >
                          {editableTitle}
                          <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h2>
                      )}
                      {currentReport.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {currentReport.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => executeReport(currentReport)}
                        disabled={isExecuting}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh data"
                      >
                        <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      {hasExportableData && (
                        <ExportMenu
                          data={exportableData.data}
                          columns={exportableData.columns}
                          filename={`ai-report-${editableTitle || 'export'}-${new Date().toISOString().split('T')[0]}`}
                          title={editableTitle || 'AI Report'}
                          formats={['csv', 'excel']}
                        />
                      )}
                      <button
                        onClick={handleAddToDashboardClick}
                        disabled={dashboardAddSuccess || isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          dashboardAddSuccess
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        } disabled:opacity-50`}
                        title="Add to Dashboard"
                      >
                        {dashboardAddSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Added!</span>
                          </>
                        ) : (
                          <>
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="hidden sm:inline">Dashboard</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleSaveReport}
                        disabled={isSaving || saveSuccess}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          saveSuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-90`}
                      >
                        {saveSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Saved!</span>
                          </>
                        ) : isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="relative">
                    {isExecuting && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-gray-700">Loading data...</span>
                        </div>
                      </div>
                    )}
                    <div ref={reportRef} data-report-content className="p-6 bg-white">
                      <ReportRenderer
                        report={currentReport}
                        data={executedData}
                        isLoading={false}
                        onDateRangeChange={handleDateRangeChange}
                        embedded
                      />
                    </div>
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-700">Loading report...</span>
          </div>
        </div>
      )}

      {currentReport && (
        <AddToDashboardModal
          isOpen={showAddToDashboard}
          onClose={() => setShowAddToDashboard(false)}
          report={{
            id: currentReport.id,
            name: editableTitle || currentReport.name,
            description: currentReport.description,
            definition: currentReport,
            customerId: String(effectiveCustomerId),
            createdAt: currentReport.createdAt,
            createdBy: currentReport.createdBy,
          }}
          onAdd={handleAddToDashboard}
        />
      )}
    </div>
  );
}

export default AIReportStudioPage;
