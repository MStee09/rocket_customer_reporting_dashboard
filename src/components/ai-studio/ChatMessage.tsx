import { useState } from 'react';
import { User, Bot, AlertCircle, Check, Brain, Zap, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/aiReportService';
import type { ToolExecution, LearningV2 } from '../../services/aiReportServiceV2';
import { AIReportDefinition } from '../../types/aiReport';
import { Card } from '../ui/Card';
import { ThinkingSteps, ThinkingStepsInline } from './ThinkingSteps';

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  latencyMs: number;
}

interface ChatMessageProps {
  message: ChatMessageType & {
    toolExecutions?: ToolExecution[];
    learnings?: LearningV2[];
    needsClarification?: boolean;
    clarificationOptions?: string[];
  };
  onPreviewReport?: (report: AIReportDefinition) => void;
  onSaveReport?: (report: AIReportDefinition) => void;
  onClarificationSelect?: (option: string) => void;
  isCompact?: boolean;
  hasLearning?: boolean;
  usage?: UsageInfo;
  showToolExecutions?: boolean;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
}

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export function ChatMessage({
  message,
  onPreviewReport,
  onSaveReport,
  onClarificationSelect,
  isCompact = false,
  hasLearning = false,
  usage,
  showToolExecutions = true,
}: ChatMessageProps) {
  const [showUsage, setShowUsage] = useState(false);
  const isUser = message.role === 'user';
  const hasToolExecutions = message.toolExecutions && message.toolExecutions.length > 0;
  const hasLearnings = message.learnings && message.learnings.length > 0;
  const hasClarification = message.needsClarification && message.clarificationOptions && message.clarificationOptions.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-rocket-100 text-rocket-600' : 'bg-gray-100 text-gray-600'
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

        {hasClarification && !isUser && (
          <ClarificationOptions
            options={message.clarificationOptions!}
            onSelect={onClarificationSelect}
          />
        )}

        {showToolExecutions && hasToolExecutions && !isUser && (
          isCompact ? (
            <ThinkingStepsInline toolExecutions={message.toolExecutions!} />
          ) : (
            <ThinkingSteps toolExecutions={message.toolExecutions!} compact={isCompact} />
          )
        )}

        {hasLearnings && !isUser && (
          <LearningsIndicator learnings={message.learnings!} />
        )}

        <div
          className={`flex items-center gap-2 text-xs text-gray-400 mt-1 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>
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
          </span>
          {(hasLearning || hasLearnings) && !isUser && (
            <span className="inline-flex items-center gap-1 text-teal-600" title="AI learned something new from this conversation">
              <Brain className="w-3 h-3" />
              <span className="text-[10px]">Learned</span>
            </span>
          )}
          {usage && !isUser && (
            <button
              onClick={() => setShowUsage(!showUsage)}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="View token usage"
            >
              <Zap className="w-3 h-3" />
              <span className="text-[10px]">{formatTokens(usage.totalTokens)}</span>
              {showUsage ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {showUsage && usage && !isUser && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Input:</span>{' '}
                <span className="font-medium text-gray-600">{formatTokens(usage.inputTokens)}</span>
              </div>
              <div>
                <span className="text-gray-400">Output:</span>{' '}
                <span className="font-medium text-gray-600">{formatTokens(usage.outputTokens)}</span>
              </div>
              <div>
                <span className="text-gray-400">Cost:</span>{' '}
                <span className="font-medium text-gray-600">{formatCost(usage.totalCostUsd)}</span>
              </div>
              <div>
                <span className="text-gray-400">Latency:</span>{' '}
                <span className="font-medium text-gray-600">{formatLatency(usage.latencyMs)}</span>
              </div>
            </div>
          </div>
        )}
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
    <Card variant="default" padding="md" className="mt-3 text-left">
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rocket-50 text-rocket-600 text-xs">
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
    </Card>
  );
}

interface ClarificationOptionsProps {
  options: string[];
  onSelect?: (option: string) => void;
}

function ClarificationOptions({ options, onSelect }: ClarificationOptionsProps) {
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">Choose an option to continue:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect?.(option)}
            className="px-3 py-1.5 text-sm bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 hover:border-amber-400 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LearningsIndicatorProps {
  learnings: LearningV2[];
}

function LearningsIndicator({ learnings }: LearningsIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (learnings.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 transition-colors"
      >
        <Brain className="w-3 h-3" />
        <span>Learned {learnings.length} {learnings.length === 1 ? 'thing' : 'things'}</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {learnings.map((learning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 px-3 py-2 bg-teal-50 rounded-lg text-sm"
            >
              <span className="text-teal-500 text-xs uppercase font-medium mt-0.5">
                {learning.type}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-teal-800">{learning.key}:</span>
                <span className="text-teal-700 ml-1">{learning.value}</span>
                <span className="text-teal-500 text-xs ml-2">
                  ({Math.round(learning.confidence * 100)}% confidence)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
