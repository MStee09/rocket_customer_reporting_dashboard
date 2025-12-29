import { User, Bot, AlertCircle, Check } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/aiReportService';
import { AIReportDefinition } from '../../types/aiReport';

interface ChatMessageProps {
  message: ChatMessageType;
  onPreviewReport?: (report: AIReportDefinition) => void;
  onSaveReport?: (report: AIReportDefinition) => void;
  isCompact?: boolean;
}

export function ChatMessage({
  message,
  onPreviewReport,
  onSaveReport,
  isCompact = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={`flex-1 ${isCompact ? 'max-w-full' : 'max-w-[80%]'} ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-rocket-600 text-white rounded-tr-md'
              : 'bg-gray-100 text-gray-800 rounded-tl-md'
          }`}
        >
          {message.error ? (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span>{message.error}</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>

        {message.report && !isUser && (
          isCompact ? (
            <CompactReportIndicator report={message.report} />
          ) : (
            <ReportCard
              report={message.report}
              onPreview={onPreviewReport}
              onSave={onSaveReport}
            />
          )
        )}

        <p
          className={`text-xs text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : typeof message.timestamp === 'string'
            ? new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </p>
      </div>
    </div>
  );
}

interface CompactReportIndicatorProps {
  report: AIReportDefinition;
}

function CompactReportIndicator({ report }: CompactReportIndicatorProps) {
  const sectionCount = report.sections?.length || 0;

  return (
    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-left">
      <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
        <Check className="w-3 h-3 text-white" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-green-700">Report updated</span>
        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
          {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
        </span>
      </div>
    </div>
  );
}

interface ReportCardProps {
  report: AIReportDefinition;
  onPreview?: (report: AIReportDefinition) => void;
  onSave?: (report: AIReportDefinition) => void;
}

function ReportCard({ report, onPreview, onSave }: ReportCardProps) {
  const sectionTypes = (report.sections || []).map((s) => s.type);
  const uniqueTypes = [...new Set(sectionTypes)];

  return (
    <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{report.name}</h4>
          {report.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {report.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-full">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Generated</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {uniqueTypes.map((type) => (
          <span
            key={type}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs"
          >
            {type.replace('-', ' ')}
          </span>
        ))}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs">
          {report.sections?.length || 0} sections
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {onPreview && (
          <button
            onClick={() => onPreview(report)}
            className="flex-1 px-3 py-2 bg-rocket-600 text-white text-sm font-medium rounded-lg hover:bg-rocket-700 transition-colors"
          >
            Preview Report
          </button>
        )}
        {onSave && (
          <button
            onClick={() => onSave(report)}
            className="px-3 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
