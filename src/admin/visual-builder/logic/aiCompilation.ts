import type { CompiledRule, AILogicBlock } from '../types/BuilderSchema';
import { supabase } from '../../../lib/supabase';

interface AICompilationRequest {
  prompt: string;
  availableFields: FieldInfo[];
  sampleData?: Record<string, unknown>[];
}

interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValues?: string[];
}

interface AICompilationResponse {
  success: boolean;
  compiledRule?: CompiledRule;
  explanation?: string;
  error?: string;
}

export const AVAILABLE_FIELDS: FieldInfo[] = [
  { name: 'carrier_name', type: 'string', sampleValues: ['FedEx Freight', 'XPO Logistics', 'Old Dominion'] },
  { name: 'origin_state', type: 'string', sampleValues: ['CA', 'TX', 'NY', 'FL'] },
  { name: 'destination_state', type: 'string', sampleValues: ['CA', 'TX', 'NY', 'FL'] },
  { name: 'origin_city', type: 'string' },
  { name: 'destination_city', type: 'string' },
  { name: 'mode_name', type: 'string', sampleValues: ['LTL', 'TL', 'Partial'] },
  { name: 'equipment_name', type: 'string', sampleValues: ['Van', 'Flatbed', 'Reefer'] },
  { name: 'status_name', type: 'string', sampleValues: ['Delivered', 'In Transit', 'Picked Up'] },
  { name: 'retail', type: 'number' },
  { name: 'miles', type: 'number' },
  { name: 'total_weight', type: 'number' },
  { name: 'pickup_date', type: 'date' },
  { name: 'delivery_date', type: 'date' },
];

export async function compileAILogic(
  request: AICompilationRequest
): Promise<AICompilationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/compile-ai-logic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        availableFields: request.availableFields,
        sampleData: request.sampleData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.message || 'Compilation failed' };
    }

    const result = await response.json();
    return {
      success: true,
      compiledRule: result.compiledRule,
      explanation: result.explanation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Compilation failed',
    };
  }
}

export function updateAIBlockWithCompilation(
  block: AILogicBlock,
  response: AICompilationResponse
): AILogicBlock {
  if (response.success && response.compiledRule) {
    return {
      ...block,
      compiledRule: response.compiledRule,
      status: 'compiled',
      error: undefined,
    };
  } else {
    return {
      ...block,
      status: 'error',
      error: response.error || 'Unknown error',
    };
  }
}

export function parseSimpleLogic(prompt: string): CompiledRule | null {
  const filters: CompiledRule['filters'] = [];
  const lowerPrompt = prompt.toLowerCase();

  const overMatch = lowerPrompt.match(/(?:over|greater than|more than)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (overMatch) {
    const value = parseFloat(overMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'gt', value });
  }

  const underMatch = lowerPrompt.match(/(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (underMatch) {
    const value = parseFloat(underMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'lt', value });
  }

  const statePattern = /(?:from|origin)\s+([A-Z]{2})\b/i;
  const stateMatch = prompt.match(statePattern);
  if (stateMatch) {
    filters.push({ field: 'origin_state', operator: 'eq', value: stateMatch[1].toUpperCase() });
  }

  const destPattern = /(?:to|destination)\s+([A-Z]{2})\b/i;
  const destMatch = prompt.match(destPattern);
  if (destMatch) {
    filters.push({ field: 'destination_state', operator: 'eq', value: destMatch[1].toUpperCase() });
  }

  const carrierPattern = /(?:carrier|from)\s+["']?([^"'\n,]+)["']?/i;
  const carrierMatch = prompt.match(carrierPattern);
  if (carrierMatch && !stateMatch) {
    filters.push({ field: 'carrier_name', operator: 'contains', value: carrierMatch[1].trim() });
  }

  if (lowerPrompt.includes('delivered')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Delivered' });
  } else if (lowerPrompt.includes('in transit')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'In Transit' });
  }

  if (filters.length === 0) return null;

  return { filters };
}
