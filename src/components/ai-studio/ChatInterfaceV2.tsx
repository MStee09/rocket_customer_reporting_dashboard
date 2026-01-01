import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Brain,
  Search,
  X
} from 'lucide-react';
import {
  ChatMessage,
  ToolExecution,
  LearningV2,
  generateReportV2,
  ConversationState,
  formatToolExecution,
  buildThinkingSteps
} from '../../services/aiReportServiceV2';
import { AIReportDefinition } from '../../types/aiReport';

interface ChatInterfaceV2Props {
  customerId: string;
  isAdmin: boolean;
  customerName?: string;
  onReportGenerated: (report: AIReportDefinition) => void;
  initialPrompt?: string;
}

function ThinkingIndicator({ steps }: { steps: Array<{ icon: string; label: string; detail?: string }> }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
        <Bot className="w-5 h-5 text-orange-600" />
      </div>
      <div className="flex-1">
        <div className="bg-gray-100 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Search className="w-4 h-4 animate-pulse" />
            <span className="font-medium">Investigating your data...</span>
          </div>
          <div className="space-y-1.5">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                <span>{step.icon}</span>
                <span>{step.label}</span>
                {step.detail && <span className="text-gray-400">- {step.detail}</span>}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Working...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearningToast({ learnings, onClose }: { learnings: LearningV2[]; onClose: () => void }) {
  if (learnings.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-md">
        <div className="p-2 bg-white/20 rounded-full flex-shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            I learned {learnings.length === 1 ? 'something new' : `${learnings.length} new things`}!
          </p>
          <p className="text-xs text-white/80 mt-0.5 truncate">
            {learnings.map(l => l.key).join(', ')}
          </p>
        </div>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ToolExecutionBadges({ executions }: { executions: ToolExecution[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (executions.length === 0) return null;

  const formattedExecutions = executions.map(formatToolExecution);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{executions.length} tool{executions.length > 1 ? 's' : ''} used</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
          {formattedExecutions.map((exec, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
              <span>{exec.icon}</span>
              <span className="font-medium">{exec.label}</span>
              {exec.detail && <span className="text-gray-400">- {exec.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClarificationOptions({
  options,
  onSelect
}: {
  options: string[];
  onSelect: (option: string) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(option)}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          {option}
        </button>
      ))}
    </div>
  );
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
  const [conversationState, setConversationState] = useState<ConversationState>({ reportInProgress: null });
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<Array<{ icon: string; label: string; detail?: string }>>([]);
  const [learningToast, setLearningToast] = useState<{ visible: boolean; learnings: LearningV2[] }>({ visible: false, learnings: [] });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThinkingSteps]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !initialPromptSent.current) {
      initialPromptSent.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (learningToast.visible) {
      const timer = setTimeout(() => setLearningToast({ visible: false, learnings: [] }), 5000);
      return () => clearTimeout(timer);
    }
  }, [learningToast.visible]);

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
    setCurrentThinkingSteps([]);

    try {
      const response = await generateReportV2(
        messageText,
        messages,
        customerId,
        isAdmin,
        conversationState,
        customerName,
        true
      );

      if (response.toolExecutions && response.toolExecutions.length > 0) {
        const steps = buildThinkingSteps(response.toolExecutions);
        setCurrentThinkingSteps(steps);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        report: response.report || undefined,
        toolExecutions: response.toolExecutions,
        learnings: response.learnings,
        needsClarification: response.needsClarification,
        clarificationOptions: response.clarificationOptions
      };
      setMessages(prev => [...prev, assistantMessage]);

      setConversationState(response.conversationState);

      if (response.report) {
        onReportGenerated(response.report);
      }

      if (response.learnings && response.learnings.length > 0) {
        setLearningToast({ visible: true, learnings: response.learnings });
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
      setCurrentThinkingSteps([]);
      inputRef.current?.focus();
    }
  };

  const handleClarificationSelect = (option: string) => {
    handleSend(option);
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
            <p className="mt-2">Ask me anything about your shipping data. I'll explore your data and show you what I find.</p>
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

                {message.needsClarification && message.clarificationOptions && (
                  <ClarificationOptions
                    options={message.clarificationOptions}
                    onSelect={handleClarificationSelect}
                  />
                )}
              </div>

              {message.toolExecutions && message.toolExecutions.length > 0 && (
                <ToolExecutionBadges executions={message.toolExecutions} />
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

        {isLoading && <ThinkingIndicator steps={currentThinkingSteps} />}

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
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <LearningToast
        learnings={learningToast.learnings}
        onClose={() => setLearningToast({ visible: false, learnings: [] })}
      />
    </div>
  );
}

export default ChatInterfaceV2;
