import { useState, useCallback, useRef, useEffect } from 'react';
import { createSecureInvestigator, InvestigatorClient } from '../ai/investigator/clientService';
import type {
  InvestigatorResponse,
  ConversationMessage,
  ReportDraft,
  DataInsight,
  ToolExecution,
  LearningEntry,
} from '../ai/investigator/types';

export interface UseInvestigatorOptions {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  onInsight?: (insight: DataInsight) => void;
  onLearning?: (learning: LearningEntry) => void;
  onToolExecution?: (execution: ToolExecution) => void;
  onReportUpdate?: (report: ReportDraft) => void;
}

export interface UseInvestigatorReturn {
  isLoading: boolean;
  error: string | null;
  messages: ConversationMessage[];
  currentReport: ReportDraft | null;
  insights: DataInsight[];
  toolExecutions: ToolExecution[];
  sendMessage: (message: string, mode?: 'investigate' | 'build' | 'modify' | 'analyze') => Promise<InvestigatorResponse | null>;
  clearConversation: () => void;
  setCurrentReport: (report: ReportDraft | null) => void;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  clarificationOptions: string[] | null;
  respondToClarification: (response: string) => Promise<InvestigatorResponse | null>;
  usage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    totalToolCalls: number;
    sessionDuration: number;
  };
}

export function useInvestigator(options: UseInvestigatorOptions): UseInvestigatorReturn {
  const {
    customerId,
    customerName,
    isAdmin,
    userId,
    userEmail,
    onInsight,
    onLearning,
    onToolExecution,
    onReportUpdate,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportDraft | null>(null);
  const [insights, setInsights] = useState<DataInsight[]>([]);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [clarificationOptions, setClarificationOptions] = useState<string[] | null>(null);
  const [usage, setUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    totalToolCalls: 0,
    sessionDuration: 0,
  });

  const clientRef = useRef<InvestigatorClient | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const pendingClarificationRef = useRef<{
    originalMessage: string;
    mode: 'investigate' | 'build' | 'modify' | 'analyze';
  } | null>(null);

  useEffect(() => {
    clientRef.current = createSecureInvestigator();
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    mode: 'investigate' | 'build' | 'modify' | 'analyze' = 'investigate'
  ): Promise<InvestigatorResponse | null> => {
    if (!clientRef.current) {
      setError('Client not initialized');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setNeedsClarification(false);
    setClarificationQuestion(null);
    setClarificationOptions(null);

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await clientRef.current.processRequest({
        prompt: message,
        conversationHistory: messages,
        context: {
          customerId,
          customerName,
          isAdmin,
          userId,
          userEmail,
          sessionId: sessionIdRef.current,
        },
        currentReport: currentReport || undefined,
        mode,
      });

      setUsage(prev => ({
        totalInputTokens: prev.totalInputTokens + response.usage.inputTokens,
        totalOutputTokens: prev.totalOutputTokens + response.usage.outputTokens,
        totalCost: prev.totalCost + response.usage.totalCostUsd,
        totalToolCalls: prev.totalToolCalls + response.usage.toolCalls,
        sessionDuration: Date.now() - sessionStartRef.current,
      }));

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        toolExecutions: response.toolExecutions,
        reportDraft: response.report,
        insights: response.insights,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (response.toolExecutions.length > 0) {
        setToolExecutions(prev => [...prev, ...response.toolExecutions]);
        response.toolExecutions.forEach(exec => onToolExecution?.(exec));
      }

      if (response.insights && response.insights.length > 0) {
        setInsights(prev => [...prev, ...response.insights!]);
        response.insights.forEach(insight => onInsight?.(insight));
      }

      if (response.learnings) {
        response.learnings.forEach(learning => onLearning?.(learning));
      }

      if (response.report) {
        setCurrentReport(response.report);
        onReportUpdate?.(response.report);
      }

      if (response.needsClarification) {
        setNeedsClarification(true);
        setClarificationQuestion(response.clarificationQuestion || null);
        setClarificationOptions(response.clarificationOptions || null);
        pendingClarificationRef.current = { originalMessage: message, mode };
      }

      setIsLoading(false);
      return response;

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString(),
      }]);

      return null;
    }
  }, [messages, currentReport, customerId, customerName, isAdmin, userId, userEmail, onInsight, onLearning, onToolExecution, onReportUpdate]);

  const respondToClarification = useCallback(async (
    response: string
  ): Promise<InvestigatorResponse | null> => {
    if (!pendingClarificationRef.current) {
      setError('No pending clarification');
      return null;
    }

    const { mode } = pendingClarificationRef.current;
    pendingClarificationRef.current = null;

    return sendMessage(response, mode);
  }, [sendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setInsights([]);
    setToolExecutions([]);
    setError(null);
    setNeedsClarification(false);
    setClarificationQuestion(null);
    setClarificationOptions(null);
    pendingClarificationRef.current = null;
    sessionIdRef.current = crypto.randomUUID();
    sessionStartRef.current = Date.now();
    setUsage({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalToolCalls: 0,
      sessionDuration: 0,
    });
  }, []);

  return {
    isLoading,
    error,
    messages,
    currentReport,
    insights,
    toolExecutions,
    sendMessage,
    clearConversation,
    setCurrentReport,
    needsClarification,
    clarificationQuestion,
    clarificationOptions,
    respondToClarification,
    usage,
  };
}
