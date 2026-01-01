import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles, FileText } from 'lucide-react';

export interface BuildReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns?: string[];
  suggestedFilters?: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  buildReportContext?: BuildReportContext | null;
  onBuildReport?: (context: BuildReportContext) => void;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder = 'Ask me anything about your shipping data...',
  suggestions = [],
  buildReportContext,
  onBuildReport,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showBuildTooltip, setShowBuildTooltip] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    textareaRef.current?.focus();
  };

  const isBuildReportReady = buildReportContext &&
    buildReportContext.hasIntent &&
    (buildReportContext.hasColumns || (buildReportContext.suggestedColumns && buildReportContext.suggestedColumns.length > 0));

  const handleBuildReportClick = () => {
    if (isBuildReportReady && onBuildReport && buildReportContext) {
      onBuildReport(buildReportContext);
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.length > 0 && !message && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rocket-50 text-rocket-700 text-sm rounded-full hover:bg-rocket-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:border-rocket-500 focus-within:ring-2 focus-within:ring-rocket-100 transition-all">
        <div className="relative">
          <button
            onClick={handleBuildReportClick}
            onMouseEnter={() => setShowBuildTooltip(true)}
            onMouseLeave={() => setShowBuildTooltip(false)}
            disabled={isLoading}
            className={`flex-shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-xl transition-all duration-300 ${
              isBuildReportReady
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 animate-pulse-subtle'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Build Report</span>
          </button>

          {showBuildTooltip && (
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
              {isBuildReportReady ? (
                <>
                  <div className="font-semibold text-amber-400 mb-1">Ready to build!</div>
                  <div className="text-gray-300">
                    Click to open the report builder with AI suggestions pre-filled.
                  </div>
                  {buildReportContext?.suggestedColumns && buildReportContext.suggestedColumns.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-gray-400 mb-1">Suggested columns:</div>
                      <div className="flex flex-wrap gap-1">
                        {buildReportContext.suggestedColumns.slice(0, 5).map((col, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                            {col}
                          </span>
                        ))}
                        {buildReportContext.suggestedColumns.length > 5 && (
                          <span className="px-1.5 py-0.5 text-gray-500">
                            +{buildReportContext.suggestedColumns.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold text-gray-300 mb-1">Keep chatting</div>
                  <div className="text-gray-400">
                    Describe what data you want to see. This button will light up when I understand your request well enough to build a report.
                  </div>
                </>
              )}
              <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent border-none outline-none px-2 py-1.5 text-gray-800 placeholder-gray-400 text-sm leading-relaxed disabled:opacity-50"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-rocket-600 text-white rounded-xl hover:bg-rocket-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

export default ChatInput;
