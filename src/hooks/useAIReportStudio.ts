import { useState, useCallback, useEffect } from 'react';
import {
  generateReportV2,
  ChatMessage,
  ConversationState,
  fetchSuggestedPrompts
} from '../services/aiReportServiceV2';
import { LearningEngine } from '../ai/learning/learningEngine';
import { PatternTracker } from '../ai/learning/patternTracker';
import { AIReportDefinition } from '../types/aiReport';
import { supabase } from '../lib/supabase';

interface UseAIReportStudioOptions {
  customerId: string;
  isAdmin: boolean;
  customerName?: string;
}

interface UseAIReportStudioReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentReport: AIReportDefinition | null;
  conversationState: ConversationState;
  suggestedPrompts: Array<{ category: string; prompt: string; description?: string }>;
  sendMessage: (message: string) => Promise<void>;
  selectPrompt: (prompt: string) => Promise<void>;
  clearConversation: () => void;
  saveReport: () => Promise<string | null>;
}

export function useAIReportStudio({
  customerId,
  isAdmin,
  customerName
}: UseAIReportStudioOptions): UseAIReportStudioReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<AIReportDefinition | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    reportInProgress: null
  });
  const [suggestedPrompts, setSuggestedPrompts] = useState<Array<{
    category: string;
    prompt: string;
    description?: string
  }>>([]);

  const learningEngine = new LearningEngine(customerId);
  const patternTracker = new PatternTracker(customerId);

  useEffect(() => {
    fetchSuggestedPrompts(isAdmin).then(setSuggestedPrompts);
  }, [isAdmin]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await generateReportV2(
        message,
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
        setCurrentReport(response.report);
      }

      learningEngine.processConversationTurn(
        message,
        response.message,
        response.toolsUsed
      ).catch(console.error);

      patternTracker.recordUsage({
        eventType: response.report ? 'report_generated' : 'question_asked',
        details: {
          toolsUsed: response.toolsUsed,
          hasReport: !!response.report,
          reportType: response.report?.sections?.[0]?.type
        }
      }).catch(console.error);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: errorMsg
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationState, customerId, isAdmin, customerName, isLoading, learningEngine, patternTracker]);

  const selectPrompt = useCallback(async (prompt: string) => {
    await sendMessage(prompt);
  }, [sendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentReport(null);
    setConversationState({ reportInProgress: null });
    setError(null);
  }, []);

  const saveReport = useCallback(async (): Promise<string | null> => {
    if (!currentReport) return null;

    try {
      const { data, error: saveError } = await supabase
        .from('ai_reports')
        .insert({
          customer_id: parseInt(customerId),
          name: currentReport.name,
          description: currentReport.description,
          report_definition: currentReport,
          created_by: 'ai',
          is_active: true
        })
        .select('id')
        .single();

      if (saveError) throw saveError;
      return data?.id || null;
    } catch (err) {
      console.error('Failed to save report:', err);
      setError('Failed to save report');
      return null;
    }
  }, [currentReport, customerId]);

  return {
    messages,
    isLoading,
    error,
    currentReport,
    conversationState,
    suggestedPrompts,
    sendMessage,
    selectPrompt,
    clearConversation,
    saveReport
  };
}
