/**
 * AI Logic Compilation Service
 * 
 * LOCATION: /src/admin/visual-builder/logic/aiCompilation.ts
 * 
 * This file compiles natural language prompts into deterministic filter rules.
 * AI only runs at authoring time - execution is always deterministic.
 */

import type { CompiledRule, AILogicBlock } from '../types/BuilderSchema';
import { supabase } from '../../../lib/supabase';
import { getAvailableFieldsForAI, type FieldInfo } from '../services/fieldService';

interface AICompilationRequest {
  prompt: string;
  availableFields?: FieldInfo[];
  sampleData?: Record<string, unknown>[];
}

interface AICompilationResponse {
  success: boolean;
  compiledRule?: CompiledRule;
  explanation?: string;
  error?: string;
}

// Re-export for backward compatibility with existing code
export const AVAILABLE_FIELDS: FieldInfo[] = getAvailableFieldsForAI();

export async function compileAILogic(
  request: AICompilationRequest
): Promise<AICompilationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Use provided fields or get from service
    const fields = request.availableFields || getAvailableFieldsForAI();

    const response = await fetch(`${supabaseUrl}/functions/v1/compile-ai-logic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        availableFields: fields,
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

/**
 * Local fallback parser for simple filter patterns
 * Used when the AI service is unavailable
 */
export function parseSimpleLogic(prompt: string): CompiledRule | null {
  const filters: CompiledRule['filters'] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Cost/retail filters - "over $X", "greater than $X", "more than $X"
  const overMatch = lowerPrompt.match(/(?:over|greater than|more than|above)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (overMatch) {
    const value = parseFloat(overMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'gt', value });
  }

  // "under $X", "less than $X", "below $X"
  const underMatch = lowerPrompt.match(/(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (underMatch) {
    const value = parseFloat(underMatch[1].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'lt', value });
  }

  // Between pattern for ranges - "between $X and $Y"
  const betweenMatch = lowerPrompt.match(/between\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*and\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (betweenMatch) {
    const min = parseFloat(betweenMatch[1].replace(/,/g, ''));
    const max = parseFloat(betweenMatch[2].replace(/,/g, ''));
    filters.push({ field: 'retail', operator: 'between', value: [min, max] });
  }

  // Weight filters - "weight over X"
  const weightMatch = lowerPrompt.match(/weight\s+(?:over|greater than|more than|above)\s*(\d+(?:,\d{3})*)/);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(/,/g, ''));
    filters.push({ field: 'total_weight', operator: 'gt', value });
  }

  // Miles filters - "miles over X", "distance over X"
  const milesMatch = lowerPrompt.match(/(?:miles?|distance)\s+(?:over|greater than|more than|above)\s*(\d+(?:,\d{3})*)/);
  if (milesMatch) {
    const value = parseFloat(milesMatch[1].replace(/,/g, ''));
    filters.push({ field: 'miles', operator: 'gt', value });
  }

  // ========================================================================
  // PRODUCT FILTERING - "contains any of" pattern (OR logic)
  // ========================================================================

  // Parse quoted values from prompt: "drawer system", "cargoglide", "toolbox"
  const quotedValues = prompt.match(/["']([^"']+)["']/g);
  if (quotedValues && quotedValues.length > 0) {
    const productValues = quotedValues.map(qv => qv.replace(/["']/g, '').trim());

    // Detect if this is about descriptions/products
    if (lowerPrompt.includes('description') ||
        lowerPrompt.includes('product') ||
        lowerPrompt.includes('contains') ||
        lowerPrompt.includes('includes')) {
      filters.push({
        field: 'shipment_description',
        operator: 'contains_any' as any,
        value: productValues
      });
    }
  }

  // Also detect known product keywords even without quotes
  const knownProducts = ['drawer system', 'cargoglide', 'cargo glide', 'toolbox', 'tool box'];
  const foundProducts: string[] = [];
  for (const product of knownProducts) {
    if (lowerPrompt.includes(product)) {
      foundProducts.push(product);
    }
  }
  if (foundProducts.length > 0 && !filters.some(f => (f.operator as string) === 'contains_any')) {
    filters.push({
      field: 'shipment_description',
      operator: 'contains_any' as any,
      value: foundProducts,
    });
  }

  // Origin state - "from CA", "origin TX"
  const statePattern = /(?:from|origin)\s+([A-Z]{2})\b/i;
  const stateMatch = prompt.match(statePattern);
  if (stateMatch) {
    filters.push({ field: 'origin_state', operator: 'eq', value: stateMatch[1].toUpperCase() });
  }

  // Destination state - "to CA", "destination TX"
  const destPattern = /(?:to|destination)\s+([A-Z]{2})\b/i;
  const destMatch = prompt.match(destPattern);
  if (destMatch) {
    filters.push({ field: 'destination_state', operator: 'eq', value: destMatch[1].toUpperCase() });
  }

  // Carrier pattern - "carrier FedEx"
  const carrierPattern = /(?:carrier)\s+["']?([^"'\n,]+)["']?/i;
  const carrierMatch = prompt.match(carrierPattern);
  if (carrierMatch && !stateMatch) { // Avoid matching "from" in carrier names
    filters.push({ field: 'carrier_name', operator: 'contains', value: carrierMatch[1].trim() });
  }

  // Status patterns
  if (lowerPrompt.includes('delivered')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Delivered' });
  } else if (lowerPrompt.includes('in transit')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'In Transit' });
  } else if (lowerPrompt.includes('picked up')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Picked Up' });
  } else if (lowerPrompt.includes('pending')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Pending' });
  }

  // Mode patterns
  if (lowerPrompt.includes('ltl')) {
    filters.push({ field: 'mode_name', operator: 'eq', value: 'LTL' });
  } else if (lowerPrompt.includes('truckload') || lowerPrompt.match(/\btl\b/)) {
    filters.push({ field: 'mode_name', operator: 'eq', value: 'TL' });
  } else if (lowerPrompt.includes('partial')) {
    filters.push({ field: 'mode_name', operator: 'eq', value: 'Partial' });
  }

  // No valid filters found
  if (filters.length === 0) return null;

  return { filters };
}
