import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { ChatMessage, generateReportV2, ConversationState } from '../../services/aiReportServiceV2';
import { AIReportDefinition } from '../../types/aiReport';

interface ChatInterfaceV2Props {
  customerId: string;
  isAdmin: boolean;
  customerName?: string;
  onReportGenerated: (report: AIReportDefinition) => void;
  initialPrompt?: string;
}

export function ChatInterfaceV2({
  customerId,
  isAdmin,
  customerName,
  onReportGenerated,
  initialPrompt
}: ChatInterfaceV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    reportInProgress: null
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !initialPromptSent.current) {
      initialPromptSent.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async (prompt?: string) => {
    const messageText = prompt || inputValue.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await generateReportV2(
        messageText,
        messages,
        customerId,
        isAdmin,
        conversationState,
        customerName
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        report: response.report || undefined,
        toolsUsed: response.toolsUsed
      };
      setMessages(prev => [...prev, assistantMessage]);

      setConversationState(response.conversationState);

      if (response.report) {
        onReportGenerated(response.report);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">Hi! I'm your analytics assistant.</p>
            <p className="mt-2">Ask me anything about your shipping data, or select a question above to get started.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-orange-600" />
              </div>
            )}

            <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.toolsUsed && message.toolsUsed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      <Wrench className="w-3 h-3" />
                      {formatToolName(tool)}
                    </span>
                  ))}
                </div>
              )}

              {message.report && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Report generated: {message.report.name}</span>
                  <FileText className="w-4 h-4 ml-auto" />
                </div>
              )}

              {message.error && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Error occurred</span>
                </div>
              )}

              <p className={`text-xs text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-orange-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversationState.reportInProgress && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <FileText className="w-4 h-4" />
            <span>
              Building: {conversationState.reportInProgress.name || 'Untitled Report'}
              ({conversationState.reportInProgress.sections?.length || 0} sections)
            </span>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your shipping data..."
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatToolName(tool: string): string {
  return tool
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
