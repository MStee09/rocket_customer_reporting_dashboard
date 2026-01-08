/**
 * AI Logic Compilation Service
 * 
 * Handles the AI-assisted creation of logic rules.
 * 
 * IMPORTANT: AI runs at AUTHORING TIME only.
 * The output is a deterministic CompiledRule that executes without AI.
 * 
 * Example flow:
 * 1. Admin writes: "Only include shipments over $1000 from the top 3 carriers"
 * 2. This service calls Claude to interpret and compile
 * 3. Claude returns: { filters: [{ field: 'retail', operator: 'gte', value: 1000 }, { field: 'carrier_name', operator: 'in', value: ['FedEx', 'UPS', 'XPO'] }] }
 * 4. That compiled rule is stored and executed deterministically
 */

import type { CompiledRule, AILogicBlock } from '../types/BuilderSchema';
import { supabase } from '../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// AVAILABLE FIELDS (from your schema)
// =============================================================================

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

// =============================================================================
// AI COMPILATION
// =============================================================================

/**
 * Compile a natural language prompt into a deterministic rule
 */
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

/**
 * Update an AI logic block with compilation results
 */
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

// =============================================================================
// LOCAL FALLBACK (for when edge function isn't deployed)
// =============================================================================

/**
 * Simple local parser for common patterns
 * Used as fallback when AI isn't available
 */
export function parseSimpleLogic(prompt: string): CompiledRule | null {
  const filters: CompiledRule['filters'] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Pattern: "over $X" or "greater than X"
  const overMatch = lowerPrompt.match(/(?:over|greater than|more than)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (overMatch) {
    const value = parseFloat(overMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'gt', value });
  }

  // Pattern: "under $X" or "less than X"
  const underMatch = lowerPrompt.match(/(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (underMatch) {
    const value = parseFloat(underMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'lt', value });
  }

  // Pattern: "from [state]" or "origin [state]"
  const statePattern = /(?:from|origin)\s+([A-Z]{2})\b/i;
  const stateMatch = prompt.match(statePattern);
  if (stateMatch) {
    filters.push({ field: 'origin_state', operator: 'eq', value: stateMatch[1].toUpperCase() });
  }

  // Pattern: "to [state]" or "destination [state]"
  const destPattern = /(?:to|destination)\s+([A-Z]{2})\b/i;
  const destMatch = prompt.match(destPattern);
  if (destMatch) {
    filters.push({ field: 'destination_state', operator: 'eq', value: destMatch[1].toUpperCase() });
  }

  // Pattern: "carrier [name]" or "from [carrier]"
  const carrierPattern = /(?:carrier|from)\s+["']?([^"'\n,]+)["']?/i;
  const carrierMatch = prompt.match(carrierPattern);
  if (carrierMatch && !stateMatch) { // Don't conflict with state match
    filters.push({ field: 'carrier_name', operator: 'contains', value: carrierMatch[1].trim() });
  }

  // Pattern: "delivered" or "in transit"
  if (lowerPrompt.includes('delivered')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Delivered' });
  } else if (lowerPrompt.includes('in transit')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'In Transit' });
  }

  if (filters.length === 0) return null;

  return { filters };
}
