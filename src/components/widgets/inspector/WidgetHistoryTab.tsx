import { Clock, RotateCcw, Eye, FileText } from 'lucide-react';

interface WidgetForHistory {
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { userEmail?: string };
  source?: string;
  visibility?: {
    promotedFrom?: {
      promotedByEmail?: string;
      originalCreatorEmail?: string;
    };
  };
  dataSource?: {
    reportReference?: {
      reportName?: string;
    };
  };
}

interface WidgetHistoryTabProps {
  widget: WidgetForHistory;
}

export const WidgetHistoryTab = ({ widget }: WidgetHistoryTabProps) => {
  const versions = buildVersionHistory(widget);
  const hasHistory = versions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Version History</h4>

        {hasHistory ? (
          <div className="space-y-4">
            {versions.map((v, i) => (
              <div
                key={i}
                className={`relative pl-8 ${i !== versions.length - 1 ? 'pb-6' : ''}`}
              >
                {i !== versions.length - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-slate-200" />
                )}

                <div className={`absolute left-0 top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  v.isCurrent
                    ? 'bg-rocket-500 border-rocket-500'
                    : 'bg-white border-slate-300'
                }`}>
                  {v.isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>

                <div className={`p-4 rounded-xl ${v.isCurrent ? 'bg-rocket-50 border border-rocket-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${v.isCurrent ? 'text-rocket-900' : 'text-slate-900'}`}>
                      v{v.version} {v.isCurrent && <span className="font-normal text-rocket-600">(current)</span>}
                    </span>
                    <span className="text-sm text-slate-500">{v.timestamp}</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-1">
                    {v.action} by {v.changedBy}
                  </div>
                  {v.changes && (
                    <div className="text-sm text-slate-500 italic">{v.changes}</div>
                  )}

                  {!v.isCurrent && (
                    <div className="flex items-center gap-3 mt-3">
                      <button className="text-xs text-rocket-600 hover:text-rocket-700 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button className="text-xs text-rocket-600 hover:text-rocket-700 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-slate-50 rounded-xl text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No version history available</p>
            <p className="text-xs text-slate-400 mt-1">Changes will be tracked as the widget is modified</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-700">Version Tracking</p>
            <p className="text-sm text-slate-500 mt-1">
              Each time the widget is modified, a new version is created.
              You can view previous versions and restore them if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const buildVersionHistory = (widget: WidgetForHistory) => {
  const versions = [];

  if (widget.version || widget.createdAt) {
    versions.push({
      version: widget.version || 1,
      timestamp: formatDate(widget.updatedAt || widget.createdAt),
      changedBy: widget.createdBy?.userEmail || 'Unknown',
      action: widget.version > 1 ? 'Modified' : 'Created',
      changes: widget.source === 'promoted'
        ? `Promoted from customer widget by ${widget.visibility?.promotedFrom?.promotedByEmail}`
        : widget.source === 'report'
          ? `Created from report "${widget.dataSource?.reportReference?.reportName}"`
          : null,
      isCurrent: true,
    });
  }

  if (widget.visibility?.promotedFrom) {
    versions.push({
      version: 0,
      timestamp: formatDate(widget.createdAt),
      changedBy: widget.visibility.promotedFrom.originalCreatorEmail,
      action: 'Original created',
      changes: 'Original customer widget',
      isCurrent: false,
    });
  }

  return versions;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Unknown';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default WidgetHistoryTab;
