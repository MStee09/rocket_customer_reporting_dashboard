import { supabase } from '../../lib/supabase';
import type {
  InvestigationContext,
  InvestigatorRequest,
  InvestigatorResponse,
  ConversationMessage,
  ReportDraft,
} from './types';

export class InvestigatorClient {
  async processRequest(request: InvestigatorRequest): Promise<InvestigatorResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: request.prompt,
          conversationHistory: request.conversationHistory.map(m => ({
            role: m.role,
            content: m.content
          })),
          customerId: request.context.customerId,
          customerName: request.context.customerName,
          isAdmin: request.context.isAdmin,
          userId: request.context.userId,
          userEmail: request.context.userEmail,
          sessionId: request.context.sessionId,
          mode: request.mode,
          currentReport: request.currentReport,
          useTools: true,
          investigatorMode: true
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          message: error.message || 'Failed to process request',
          toolExecutions: [],
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalCostUsd: 0,
            latencyMs: 0,
            toolCalls: 0,
          },
        };
      }

      return {
        success: !data.error,
        message: data.message || '',
        report: data.report || undefined,
        insights: data.insights || [],
        toolExecutions: data.toolExecutions || [],
        learnings: data.learnings,
        needsClarification: data.needsClarification,
        clarificationQuestion: data.clarificationQuestion,
        clarificationOptions: data.clarificationOptions,
        usage: data.usage || {
          inputTokens: 0,
          outputTokens: 0,
          totalCostUsd: 0,
          latencyMs: 0,
          toolCalls: data.toolExecutions?.length || 0,
        },
      };
    } catch (error) {
      console.error('Client error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        toolExecutions: [],
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalCostUsd: 0,
          latencyMs: 0,
          toolCalls: 0,
        },
      };
    }
  }
}

export function createSecureInvestigator(): InvestigatorClient {
  return new InvestigatorClient();
}

export async function investigateSecure(
  prompt: string,
  context: InvestigationContext,
  options: {
    conversationHistory?: ConversationMessage[];
    currentReport?: ReportDraft;
    mode?: 'investigate' | 'build' | 'modify' | 'analyze';
  } = {}
): Promise<InvestigatorResponse> {
  const client = createSecureInvestigator();

  return client.processRequest({
    prompt,
    conversationHistory: options.conversationHistory || [],
    context,
    currentReport: options.currentReport,
    mode: options.mode || 'investigate',
  });
}
