import type { AILogicBlock, CompiledRule, FilterOperator } from '../types/BuilderSchema';
import { supabase } from '../../../lib/supabase';

export const AVAILABLE_FIELDS = [
  { name: 'carrier_name', type: 'string', label: 'Carrier Name' },
  { name: 'service_type', type: 'string', label: 'Service Type' },
  { name: 'mode', type: 'string', label: 'Mode' },
  { name: 'origin_state', type: 'string', label: 'Origin State' },
  { name: 'destination_state', type: 'string', label: 'Destination State' },
  { name: 'origin_city', type: 'string', label: 'Origin City' },
  { name: 'destination_city', type: 'string', label: 'Destination City' },
  { name: 'retail', type: 'number', label: 'Retail Cost' },
  { name: 'carrier_cost', type: 'number', label: 'Carrier Cost' },
  { name: 'total_weight', type: 'number', label: 'Total Weight' },
  { name: 'status', type: 'string', label: 'Status' },
  { name: 'ship_date', type: 'date', label: 'Ship Date' },
  { name: 'delivery_date', type: 'date', label: 'Delivery Date' },
] as const;

export interface CompilationResult {
  success: boolean;
  compiledRule?: CompiledRule;
  error?: string;
}

export async function compileAILogic(block: AILogicBlock): Promise<CompilationResult> {
  if (!block.prompt.trim()) {
    return { success: false, error: 'Prompt is empty' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: {
        action: 'compile_logic',
        prompt: block.prompt,
        availableFields: AVAILABLE_FIELDS,
      },
    });

    if (error) {
      const parsed = parseSimpleLogic(block.prompt);
      if (parsed) {
        return { success: true, compiledRule: parsed };
      }
      return { success: false, error: error.message };
    }

    if (data?.compiledRule) {
      return { success: true, compiledRule: data.compiledRule };
    }

    const parsed = parseSimpleLogic(block.prompt);
    if (parsed) {
      return { success: true, compiledRule: parsed };
    }

    return { success: false, error: 'Failed to compile logic' };
  } catch (err) {
    const parsed = parseSimpleLogic(block.prompt);
    if (parsed) {
      return { success: true, compiledRule: parsed };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function parseSimpleLogic(prompt: string): CompiledRule | null {
  const filters: CompiledRule['filters'] = [];
  const lower = prompt.toLowerCase();

  const greaterThanMatch = lower.match(/(?:over|greater than|more than|above|>)\s*\$?([\d,]+)/);
  if (greaterThanMatch) {
    const value = parseFloat(greaterThanMatch[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      if (lower.includes('retail') || lower.includes('cost') || lower.includes('spend')) {
        filters.push({ field: 'retail', operator: 'gt', value });
      }
    }
  }

  const lessThanMatch = lower.match(/(?:under|less than|below|<)\s*\$?([\d,]+)/);
  if (lessThanMatch) {
    const value = parseFloat(lessThanMatch[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      if (lower.includes('retail') || lower.includes('cost') || lower.includes('spend')) {
        filters.push({ field: 'retail', operator: 'lt', value });
      }
    }
  }

  const carriers = ['fedex', 'ups', 'usps', 'dhl', 'amazon'];
  const mentionedCarriers = carriers.filter(c => lower.includes(c));
  if (mentionedCarriers.length > 0) {
    const properNames = mentionedCarriers.map(c => {
      switch (c) {
        case 'fedex': return 'FedEx';
        case 'ups': return 'UPS';
        case 'usps': return 'USPS';
        case 'dhl': return 'DHL';
        case 'amazon': return 'Amazon';
        default: return c;
      }
    });
    filters.push({
      field: 'carrier_name',
      operator: mentionedCarriers.length === 1 ? 'eq' : 'in',
      value: mentionedCarriers.length === 1 ? properNames[0] : properNames,
    });
  }

  const modes = ['ltl', 'truckload', 'parcel', 'air', 'ocean'];
  const mentionedModes = modes.filter(m => lower.includes(m));
  if (mentionedModes.length > 0) {
    const properNames = mentionedModes.map(m => m.toUpperCase());
    filters.push({
      field: 'mode',
      operator: mentionedModes.length === 1 ? 'eq' : 'in',
      value: mentionedModes.length === 1 ? properNames[0] : properNames,
    });
  }

  const stateMatch = lower.match(/(?:from|in|to)\s+([a-z]{2})\b/i);
  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    if (lower.includes('from') || lower.includes('origin')) {
      filters.push({ field: 'origin_state', operator: 'eq', value: state });
    } else if (lower.includes('to') || lower.includes('destination')) {
      filters.push({ field: 'destination_state', operator: 'eq', value: state });
    }
  }

  const statuses = ['delivered', 'in transit', 'pending', 'cancelled'];
  const mentionedStatuses = statuses.filter(s => lower.includes(s));
  if (mentionedStatuses.length > 0) {
    filters.push({
      field: 'status',
      operator: 'eq',
      value: mentionedStatuses[0].charAt(0).toUpperCase() + mentionedStatuses[0].slice(1),
    });
  }

  if (filters.length === 0) {
    return null;
  }

  return { filters };
}
