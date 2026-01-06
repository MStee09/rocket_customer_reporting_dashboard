import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface ReasoningStepV3 {
  type: 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
  timestamp: Date;
}

export interface FollowUpQuestionV3 {
  id: string;
  question: string;
}

export interface InvestigationResultV3 {
  answer: string;
  reasoning: ReasoningStepV3[];
  followUpQuestions: FollowUpQuestionV3[];
  metadata: {
    processingTimeMs: number;
    toolCallCount: number;
    iterations: number;
  };
}

export interface ConversationMessageV3 {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStepV3[];
  followUpQuestions?: FollowUpQuestionV3[];
  timestamp: Date;
}

export interface UseInvestigatorV3Options {
  customerId?: string;
  userId?: string;
  showReasoning?: boolean;
  onReasoningStep?: (step: ReasoningStepV3) => void;
  onError?: (error: Error) => void;
}

export interface UseInvestigatorV3Return {
  isInvestigating: boolean;
  error: string | null;
  conversation: ConversationMessageV3[];
  currentReasoning: ReasoningStepV3[];
  investigate: (question: string) => Promise<void>;
  answerFollowUp: (questionId: string, answer: string) => Promise<void>;
  clearConversation: () => void;
  lastInvestigation: InvestigationResultV3 | null;
}

export function useInvestigatorV3(options: UseInvestigatorV3Options = {}): UseInvestigatorV3Return {
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessageV3[]>([]);
  const [currentReasoning, setCurrentReasoning] = useState<ReasoningStepV3[]>([]);
  const [lastInvestigation, setLastInvestigation] = useState<InvestigationResultV3 | null>(null);

  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const investigate = useCallback(async (question: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      return;
    }

    if (!options.customerId) {
      setError('No customer selected');
      return;
    }

    setIsInvestigating(true);
    setError(null);
    setCurrentReasoning([]);

    const userMessage: ConversationMessageV3 = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, userMessage]);
    conversationHistoryRef.current.push({ role: 'user', content: question });

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/investigate`;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question,
          customerId: options.customerId,
          userId: user.id,
          conversationHistory: conversationHistoryRef.current.slice(-10),
          preferences: {
            showReasoning: options.showReasoning ?? true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Investigation failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Investigation failed');
      }

      const reasoning: ReasoningStepV3[] = (data.reasoning || []).map((r: any) => ({
        ...r,
        timestamp: new Date(),
      }));

      for (const step of reasoning) {
        options.onReasoningStep?.(step);
        setCurrentReasoning(prev => [...prev, step]);
      }

      const assistantMessage: ConversationMessageV3 = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
      conversationHistoryRef.current.push({ role: 'assistant', content: data.answer });

      setLastInvestigation({
        answer: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions || [],
        metadata: data.metadata,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Investigation failed';
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsInvestigating(false);
      setCurrentReasoning([]);
    }
  }, [options]);

  const answerFollowUp = useCallback(async (questionId: string, answer: string) => {
    const question = lastInvestigation?.followUpQuestions.find(q => q.id === questionId);
    if (!question) return;

    const contextualQuestion = `Regarding "${question.question}" - ${answer}. Please update your analysis with this context.`;
    await investigate(contextualQuestion);
  }, [lastInvestigation, investigate]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setCurrentReasoning([]);
    setError(null);
    setLastInvestigation(null);
    conversationHistoryRef.current = [];
  }, []);

  return {
    isInvestigating,
    error,
    conversation,
    currentReasoning,
    investigate,
    answerFollowUp,
    clearConversation,
    lastInvestigation,
  };
}

export default useInvestigatorV3;
