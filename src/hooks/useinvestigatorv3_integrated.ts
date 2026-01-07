import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface ReasoningStepV3 {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
  timestamp: Date;
}

export interface FollowUpQuestionV3 {
  id: string;
  question: string;
}

export interface Visualization {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'stat' | 'table';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export interface InvestigationResultV3 {
  answer: string;
  reasoning: ReasoningStepV3[];
  followUpQuestions: FollowUpQuestionV3[];
  visualizations: Visualization[];
  metadata: {
    processingTimeMs: number;
    toolCallCount: number;
    mode: 'quick' | 'deep' | 'visual';
    classification?: {
      detected: string;
      confidence: number;
      reason: string;
    };
  };
}

export interface ConversationMessageV3 {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStepV3[];
  followUpQuestions?: FollowUpQuestionV3[];
  visualizations?: Visualization[];
  metadata?: {
    processingTimeMs: number;
    toolCallCount: number;
    mode: 'quick' | 'deep' | 'visual';
  };
  timestamp: Date;
}

export interface UseInvestigatorV3Options {
  customerId?: string;
  userId?: string;
  showReasoning?: boolean;
  onReasoningStep?: (step: ReasoningStepV3) => void;
  onVisualization?: (viz: Visualization) => void;
  onError?: (error: Error) => void;
}

export interface UseInvestigatorV3Return {
  isInvestigating: boolean;
  error: string | null;
  conversation: ConversationMessageV3[];
  currentReasoning: ReasoningStepV3[];
  currentMode: 'quick' | 'deep' | 'visual' | null;
  investigate: (question: string, forceMode?: 'quick' | 'deep' | 'visual') => Promise<void>;
  answerFollowUp: (questionId: string, answer: string) => Promise<void>;
  clearConversation: () => void;
  lastInvestigation: InvestigationResultV3 | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useInvestigatorV3(options: UseInvestigatorV3Options = {}): UseInvestigatorV3Return {
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessageV3[]>([]);
  const [currentReasoning, setCurrentReasoning] = useState<ReasoningStepV3[]>([]);
  const [currentMode, setCurrentMode] = useState<'quick' | 'deep' | 'visual' | null>(null);
  const [lastInvestigation, setLastInvestigation] = useState<InvestigationResultV3 | null>(null);

  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const investigate = useCallback(async (question: string, forceMode?: 'quick' | 'deep' | 'visual') => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      return;
    }

    if (!options.customerId) {
      setError('No customer selected');
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsInvestigating(true);
    setError(null);
    setCurrentReasoning([]);
    setCurrentMode(null);

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
            forceMode,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Investigation failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Investigation failed');
      }

      // Extract mode
      const mode = data.metadata?.mode || 'deep';
      setCurrentMode(mode);

      // Process reasoning steps
      const reasoning: ReasoningStepV3[] = (data.reasoning || []).map((r: ReasoningStepV3) => ({
        ...r,
        timestamp: new Date(),
      }));

      for (const step of reasoning) {
        options.onReasoningStep?.(step);
        setCurrentReasoning(prev => [...prev, step]);
      }

      // Process visualizations
      const visualizations: Visualization[] = data.visualizations || [];
      for (const viz of visualizations) {
        options.onVisualization?.(viz);
      }

      // Create assistant message
      const assistantMessage: ConversationMessageV3 = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions,
        visualizations,
        metadata: {
          processingTimeMs: data.metadata?.processingTimeMs || 0,
          toolCallCount: data.metadata?.toolCallCount || 0,
          mode,
        },
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
      conversationHistoryRef.current.push({ role: 'assistant', content: data.answer });

      setLastInvestigation({
        answer: data.answer,
        reasoning,
        followUpQuestions: data.followUpQuestions || [],
        visualizations,
        metadata: data.metadata,
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
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
    setCurrentMode(null);
    setError(null);
    setLastInvestigation(null);
    conversationHistoryRef.current = [];
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isInvestigating,
    error,
    conversation,
    currentReasoning,
    currentMode,
    investigate,
    answerFollowUp,
    clearConversation,
    lastInvestigation,
  };
}

export default useInvestigatorV3;
