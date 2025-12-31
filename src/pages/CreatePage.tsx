import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Table, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AIReportStudioPage } from './AIReportStudioPage';
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

  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'ai-studio');

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

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
        visualization: state.visualization as ReportConfig['visualization'],
        createdAt: new Date().toISOString(),
        createdBy: 'user',
      };

      (reportConfig as ReportConfig & { simpleReport: unknown }).simpleReport = {
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
    <div className="h-full flex flex-col -mx-6 -mt-6">
      {isViewingAsCustomer && viewingCustomer && (
        <div className="mx-6 mt-4 px-4 py-3 bg-orange-500/10 border border-orange-500/40 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">
              Creating reports for {viewingCustomer.company_name}
            </span>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 bg-white px-6 flex-shrink-0">
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

      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai-studio' ? (
          <AIReportStudioPage />
        ) : (
          <ColumnBuilderTab onSave={handleSaveReport} />
        )}
      </div>
    </div>
  );
}

function ColumnBuilderTab({ onSave }: { onSave: (state: SimpleReportBuilderState) => void }) {
  return (
    <div className="h-full bg-slate-50 overflow-auto">
      <div className="h-full">
        <SimpleReportBuilder
          onClose={() => {}}
          onSave={onSave}
          isInline
        />
      </div>
    </div>
  );
}

export default CreatePage;
