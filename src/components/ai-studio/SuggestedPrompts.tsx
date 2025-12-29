import { FileText, Sparkles, X, Loader2 } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/aiReportService';
import { ChatMessage } from './ChatMessage';
import { Card } from '../ui/Card';

const SUGGESTIONS = [
  'Show me total spend by transportation mode',
  'Create an executive summary of shipping activity',
  'Analyze my top shipping lanes by volume',
  'Compare costs across different equipment types',
];

interface WidgetContext {
  title: string;
  [key: string]: unknown;
}

interface SuggestedPromptsProps {
  messages: ChatMessageType[];
  widgetContext: WidgetContext | null;
  onClearContext: () => void;
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function SuggestedPrompts({
  messages,
  widgetContext,
  onClearContext,
  onSendMessage,
  isGenerating,
  messagesEndRef,
}: SuggestedPromptsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {widgetContext && (
        <div className="mb-4 p-3 bg-rocket-50 border border-rocket-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rocket-600" />
            <span className="text-sm text-rocket-700">
              Analyzing: <span className="font-medium">{widgetContext.title}</span>
            </span>
          </div>
          <button
            onClick={onClearContext}
            className="text-rocket-500 hover:text-rocket-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-rocket-500 to-rocket-600 flex items-center justify-center">
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
              <Card
                key={index}
                variant="default"
                padding="md"
                hover={true}
                onClick={() => !isGenerating && onSendMessage(suggestion)}
                className="w-full text-left disabled:opacity-50 group"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-rocket-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 group-hover:text-gray-900">
                    {suggestion}
                  </span>
                </div>
              </Card>
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
  );
}
