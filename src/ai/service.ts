// src/ai/service.ts
// Unified AI Service - Main entry point

import { supabase } from '../lib/supabase';
import { AIReportDefinition } from '../types/aiReport';
import {
  AIContext,
  AIRequest,
  AIResponse,
  Message,
  LearningExtraction,
} from './types';

import { compileSchemaContext, formatSchemaForPrompt } from './compiler/schemaCompiler';
import { compileKnowledgeContext, formatKnowledgeForPrompt } from './compiler/knowledgeCompiler';
import { getPromptAccessInstructions, enforceAccessControl } from './policies/accessControl';
import { validateReportOutput, attemptAutoFix } from './policies/outputValidation';
import { extractLearnings, saveCustomerLearnings, parseLearningFlags } from './learning/conversationProcessor';
import { getCustomerProfile, formatProfileForPrompt } from './learning/profileUpdater';

export class AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
  }

  async buildContext(
    customerId: string,
    isAdmin: boolean,
    customerName?: string,
    currentReport?: AIReportDefinition
  ): Promise<AIContext> {
    const [schema, knowledge, profile] = await Promise.all([
      compileSchemaContext(customerId),
      compileKnowledgeContext(customerId, isAdmin),
      getCustomerProfile(customerId),
    ]);

    return {
      customerId,
      customerName,
      isAdmin,
      schema,
      knowledge,
      customerProfile: profile,
      currentReport,
    };
  }

  async generateReport(request: AIRequest): Promise<AIResponse<AIReportDefinition>> {
    const { prompt, conversationHistory, context } = request;

    try {
      const systemPrompt = this.compileSystemPrompt(context);
      const rawResponse = await this.callClaude(systemPrompt, prompt, conversationHistory);
      const { message, report, learningFlag } = this.parseResponse(rawResponse);

      if (report) {
        const validation = validateReportOutput(report, context.schema);

        if (!validation.valid) {
          const fixed = attemptAutoFix(report, context.schema);
          if (fixed) {
            return await this.finalizeReport(fixed, message, context, conversationHistory, prompt, learningFlag);
          }

          return {
            success: false,
            message: `I generated a report but found issues: ${validation.errors.slice(0, 2).join('; ')}. Let me try again.`,
            validationErrors: validation.errors,
          };
        }

        return await this.finalizeReport(report, message, context, conversationHistory, prompt, learningFlag);
      }

      const learnings = extractLearnings(conversationHistory, prompt, null);
      if (learnings.length > 0) {
        await saveCustomerLearnings(context.customerId, learnings);
      }

      return { success: true, message };
    } catch (error) {
      console.error('AI Service error:', error);
      return {
        success: false,
        message: 'I encountered an error processing your request. Please try again.',
      };
    }
  }

  private async finalizeReport(
    report: AIReportDefinition,
    message: string,
    context: AIContext,
    history: Message[],
    prompt: string,
    learningFlag: LearningExtraction | null
  ): Promise<AIResponse<AIReportDefinition>> {
    const accessResult = enforceAccessControl(report, {
      isAdmin: context.isAdmin,
      customerId: context.customerId,
    });

    if (accessResult.violations?.length) {
      await this.logAccessViolation(context, accessResult.violations);
    }

    const learnings = extractLearnings(history, prompt, report);
    if (learningFlag) learnings.push(learningFlag);
    if (learnings.length > 0) {
      await saveCustomerLearnings(context.customerId, learnings);
    }

    await this.logAudit(context, prompt, message, accessResult.sanitizedReport!);

    return {
      success: true,
      data: accessResult.sanitizedReport,
      message,
      learnings: learnings.length > 0 ? learnings : undefined,
    };
  }

  private compileSystemPrompt(context: AIContext): string {
    const parts: string[] = [];

    parts.push(`You are an expert logistics data analyst for Go Rocket Shipping.
You help users build beautiful, insightful reports from their shipment data.

Your approach:
- Ask clarifying questions when requests are ambiguous
- Never guess at what fields or terms mean - ask the user
- Provide insights when you notice patterns
- Suggest next steps after generating reports
- Be conversational but efficient`);

    parts.push(getPromptAccessInstructions({
      isAdmin: context.isAdmin,
      customerId: context.customerId,
    }));

    parts.push(formatSchemaForPrompt(context.schema, context.isAdmin));
    parts.push(formatKnowledgeForPrompt(context.knowledge, context.isAdmin));

    if (context.customerProfile) {
      parts.push(formatProfileForPrompt(context.customerProfile));
    }

    parts.push(this.getReportInstructions());

    if (context.currentReport) {
      parts.push(`## CURRENT REPORT

The user is viewing this report. Modify it when asked:

\`\`\`json
${JSON.stringify(context.currentReport, null, 2)}
\`\`\`

For modifications: Keep sections intact unless specifically asked to change.`);
    }

    return parts.join('\n\n');
  }

  private getReportInstructions(): string {
    return `## REPORT GENERATION

When generating a report, output valid JSON wrapped in <report_json></report_json> tags.

### Report Structure
\`\`\`typescript
{
  "name": "Report Title",
  "description": "Brief description",
  "theme": "blue" | "green" | "purple" | "orange" | "red",
  "calculatedFields": [...],
  "sections": [...]
}
\`\`\`

### Section Types
- **hero**: Large metric (metric, filters)
- **stat-row**: Row of 2-4 metrics (metrics array)
- **chart**: Visualization (chartType, metric, groupBy)
- **table**: Data table (columns, groupBy, metrics)
- **map**: Geographic (mapType: choropleth|flow|cluster)
- **header**: Section divider

### Chart Types
bar, line, pie, treemap, radar, area, scatter, bump, funnel, heatmap

### Calculated Fields
Define at report level, reference by name:
\`\`\`json
"calculatedFields": [{
  "name": "cost_per_mile",
  "label": "Cost/Mile",
  "formula": "divide",
  "fields": ["retail", "miles"],
  "format": "currency"
}]
\`\`\`

### Important Rules
1. Only use fields from AVAILABLE DATA FIELDS
2. Define calculated fields at report level before using
3. Respect access control restrictions
4. Include title for each section

### Response Format
Include conversational text, then JSON:

"Here's your carrier comparison..."

<report_json>
{...}
</report_json>

"Would you like me to add anything?"`;
  }

  private async callClaude(
    systemPrompt: string,
    userMessage: string,
    history: Message[]
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private parseResponse(text: string): {
    message: string;
    report?: AIReportDefinition;
    learningFlag: LearningExtraction | null;
  } {
    let report: AIReportDefinition | undefined;
    const reportMatch = text.match(/<report_json>\s*([\s\S]*?)\s*<\/report_json>/);

    if (reportMatch) {
      try {
        report = JSON.parse(reportMatch[1].trim());
      } catch (e) {
        console.error('Failed to parse report JSON:', e);
      }
    } else {
      const jsonMatch = text.match(/\{[\s\S]*"name"[\s\S]*"sections"[\s\S]*\}/);
      if (jsonMatch) {
        try { report = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    const learningFlag = parseLearningFlags(text);

    const message = text
      .replace(/<report_json>[\s\S]*?<\/report_json>/g, '')
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .trim();

    return { message, report, learningFlag };
  }

  private async logAudit(
    context: AIContext,
    userRequest: string,
    aiResponse: string,
    report: AIReportDefinition
  ): Promise<void> {
    try {
      await supabase.from('ai_report_audit').insert({
        customer_id: context.customerId,
        customer_name: context.customerName,
        user_request: userRequest,
        ai_interpretation: aiResponse.slice(0, 500),
        report_definition: report,
        status: 'ok',
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  }

  private async logAccessViolation(context: AIContext, violations: string[]): Promise<void> {
    console.warn(`[SECURITY] Access violation - Customer ${context.customerId}:`, violations);
    try {
      await supabase.from('ai_report_audit').insert({
        customer_id: context.customerId,
        customer_name: context.customerName,
        user_request: 'ACCESS_VIOLATION',
        ai_interpretation: violations.join('; '),
        status: 'flagged',
      });
    } catch (e) {
      console.error('Failed to log violation:', e);
    }
  }
}

export function getAIService(apiKey?: string): AIService {
  return new AIService(apiKey);
}

export const aiService = {
  async generateReport(
    prompt: string,
    conversationHistory: Message[],
    customerId: string,
    isAdmin: boolean,
    currentReport?: AIReportDefinition,
    customerName?: string,
    apiKey?: string
  ): Promise<AIResponse<AIReportDefinition>> {
    const service = new AIService(apiKey);
    const context = await service.buildContext(customerId, isAdmin, customerName, currentReport);
    return service.generateReport({ prompt, conversationHistory, context });
  },
};
