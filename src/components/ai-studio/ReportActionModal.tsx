import { X, Pencil, Eye } from 'lucide-react';
import { SavedAIReport } from '../../services/aiReportStorageService';

interface ReportActionModalProps {
  report: SavedAIReport;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onView: () => void;
}

export function ReportActionModal({
  report,
  isOpen,
  onClose,
  onEdit,
  onView,
}: ReportActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{report.name}</h2>
            {report.description && (
              <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">What would you like to do with this report?</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onEdit}
            className="w-full px-4 py-3 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Pencil className="w-5 h-5" />
            Edit in AI Studio
          </button>
          <p className="text-xs text-gray-400 text-center -mt-1 mb-2">
            Continue refining with AI assistance
          </p>

          <button
            onClick={onView}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Eye className="w-5 h-5" />
            View Report
          </button>
          <p className="text-xs text-gray-400 text-center -mt-1">
            Full screen view with export options
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
