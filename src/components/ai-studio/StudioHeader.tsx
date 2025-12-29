import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  MessageSquare,
  BarChart3,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';

type ActiveTab = 'create' | 'library';
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

          <button
            onClick={onNewReport}
            className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white hover:bg-rocket-700 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Report</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-4 border-b border-gray-100 -mb-3">
        <button
          onClick={() => onTabChange('create')}
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
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          My Reports
          {savedReportsCount > 0 && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              activeTab === 'library'
                ? 'bg-blue-100 text-blue-600'
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
