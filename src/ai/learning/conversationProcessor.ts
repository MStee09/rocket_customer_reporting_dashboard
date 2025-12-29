// src/ai/learning/conversationProcessor.ts
// Extracts learnable knowledge from conversations

import { supabase } from '../../lib/supabase';
import { Message, LearningExtraction } from '../types';
import { AIReportDefinition } from '../../types/aiReport';

export function extractLearnings(
  history: Message[],
  currentPrompt: string,
  report: AIReportDefinition | null
): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];

  const userMessages = [
    ...history.filter(m => m.role === 'user').map(m => m.content),
    currentPrompt,
  ].join('\n');

  // Extract terminology teachings
  const termPatterns = [
    /when I say ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /by ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /['"]?([^'"]+)['"]?\s*(?:means|refers to|is)\s+(.+)/gi,
  ];

  for (const pattern of termPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(userMessages)) !== null) {
      const term = match[1]?.trim();
      const meaning = match[2]?.trim() || term;

      if (term && term.length < 50) {
        learnings.push({
          type: 'terminology',
          key: term.toLowerCase().replace(/\s+/g, '_'),
          value: meaning,
          confidence: 1.0,
          source: 'explicit',
        });
      }
    }
  }

  // Extract product definitions
  const productPatterns = [
    /(?:we (?:sell|ship|have)|our products? (?:are|include))\s+(.+)/gi,
    /product types?:\s*(.+)/gi,
  ];

  for (const pattern of productPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(userMessages)) !== null) {
      const products = match[1].split(/,\s*|\s+and\s+/).map(p => p.trim()).filter(p => p.length > 0 && p.length < 50);

      for (const product of products) {
        learnings.push({
          type: 'product',
          key: product.toLowerCase().replace(/\s+/g, '_'),
          value: product,
          confidence: 0.9,
          source: 'explicit',
        });
      }
    }
  }

  // Infer preferences
  if (report) {
    const chartModMatch = userMessages.match(/make it a (\w+) chart/i);
    if (chartModMatch) {
      learnings.push({
        type: 'preference',
        key: 'chart_type',
        value: chartModMatch[1].toLowerCase(),
        confidence: 0.7,
        source: 'inferred',
      });
    }
  }

  // Detect corrections
  const correctionPatterns = [
    /no,?\s*(?:that's not right|that's wrong|I meant)/i,
    /actually,?\s*I (?:want|meant|need)/i,
    /that's incorrect/i,
  ];

  for (const pattern of correctionPatterns) {
    if (pattern.test(userMessages)) {
      learnings.push({
        type: 'correction',
        key: 'needs_review',
        value: currentPrompt,
        confidence: 0.5,
        source: 'inferred',
      });
      break;
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return learnings.filter(l => {
    const key = `${l.type}:${l.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function saveCustomerLearnings(
  customerId: string,
  learnings: LearningExtraction[]
): Promise<void> {
  for (const learning of learnings) {
    try {
      if (learning.type === 'terminology' || learning.type === 'product') {
        await supabase.from('ai_knowledge').upsert({
          knowledge_type: learning.type === 'terminology' ? 'term' : 'product',
          key: learning.key,
          label: learning.value,
          definition: learning.value,
          scope: 'customer',
          customer_id: customerId,
          source: learning.source === 'explicit' ? 'learned' : 'inferred',
          confidence: learning.confidence,
          needs_review: learning.confidence < 0.8,
          is_active: learning.confidence >= 0.8,
        }, {
          onConflict: 'knowledge_type,key,scope,customer_id',
        });
      }

      if (learning.type === 'preference') {
        await updateCustomerPreference(customerId, learning.key, learning.value);
      }

      if (learning.type === 'correction') {
        await supabase.from('ai_learning_feedback').insert({
          customer_id: customerId,
          trigger_type: 'correction',
          user_message: learning.value,
          status: 'pending_review',
        });
      }
    } catch (e) {
      console.error('Failed to save learning:', learning, e);
    }
  }
}

async function updateCustomerPreference(
  customerId: string,
  preferenceKey: string,
  preferenceValue: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('customer_intelligence_profiles')
      .select('preferences')
      .eq('customer_id', parseInt(customerId))
      .single();

    if (!profile) return;

    const preferences = (profile.preferences as Record<string, Record<string, number>>) || {};
    if (!preferences[preferenceKey]) preferences[preferenceKey] = {};

    const currentScore = preferences[preferenceKey][preferenceValue] || 0;
    preferences[preferenceKey][preferenceValue] = Math.min(1.0, currentScore + 0.1);

    await supabase
      .from('customer_intelligence_profiles')
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq('customer_id', parseInt(customerId));
  } catch (e) {
    console.error('Failed to update preference:', e);
  }
}

export function parseLearningFlags(text: string): LearningExtraction | null {
  const match = text.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (!match) return null;

  const result: Record<string, string> = {};
  for (const line of match[1].trim().split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key && value) result[key] = value;
    }
  }

  if (!result.term) return null;

  return {
    type: 'terminology',
    key: result.term.toLowerCase().replace(/\s+/g, '_'),
    value: result.user_said || result.ai_understood || result.term,
    confidence: result.confidence === 'high' ? 0.9 : result.confidence === 'low' ? 0.5 : 0.7,
    source: 'inferred',
  };
}
