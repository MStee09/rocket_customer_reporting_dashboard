import { supabase } from '../../lib/supabase';

export interface LearningExtraction {
  type: 'terminology' | 'preference' | 'correction' | 'pattern' | 'product';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'implicit' | 'correction';
  context?: string;
}

const TERMINOLOGY_PATTERNS = [
  /when i say ['"]?([^'"]+)['"]?,?\s*(?:i mean|that means|refers to|is)\s+['"]?([^'"]+)['"]?/i,
  /['"]?([^'"]+)['"]?\s*(?:means?|refers? to|is our|is my)\s+['"]?([^'"]+)['"]?/i,
  /(?:we call|i call|our term for)\s+['"]?([^'"]+)['"]?\s+(?:is|means?)\s+['"]?([^'"]+)['"]?/i,
  /([A-Z]{2,6})\s*(?:stands for|means|is)\s+([^.!?]+)/i,
  /([A-Z]{2,6})\s*=\s*([^.!?]+)/i,
];

const PREFERENCE_INDICATORS: Record<string, RegExp[]> = {
  chart_type: [
    /(?:i (?:prefer|like|want)|always use|default to)\s+(bar|line|pie|area|table)\s*(?:chart)?s?/i,
    /(?:show|display|make)\s+(?:it|this|that|them)\s+(?:as|in)\s+(?:a\s+)?(bar|line|pie|area|table)/i,
  ],
  sort_order: [
    /sort(?:ed)?\s+(?:by\s+)?(\w+)\s+(asc|desc|ascending|descending|high.to.low|low.to.high)/i,
    /(?:highest|largest|biggest|top)\s+(?:first|to\s+lowest)/i,
    /(?:lowest|smallest|bottom)\s+(?:first|to\s+highest)/i,
  ],
  date_range: [
    /(?:always|usually|typically)\s+(?:look at|use|want)\s+(?:the\s+)?(?:last\s+)?(\d+)\s*(day|week|month|quarter|year)s?/i,
  ],
};

const CORRECTION_PATTERNS = [
  /(?:no|wrong|incorrect|that's not right),?\s*(?:it's|it should be|the correct|actually)\s+(.+)/i,
  /(?:actually|correction|to clarify),?\s+(.+)/i,
  /you said (.+) but (?:it's|it should be|the correct answer is) (.+)/i,
];

export class LearningEngine {
  private customerId: string;

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  async processConversationTurn(
    userMessage: string,
    assistantResponse: string,
    toolsUsed: string[]
  ): Promise<LearningExtraction[]> {
    const extractions: LearningExtraction[] = [];

    const terminology = this.extractTerminology(userMessage);
    extractions.push(...terminology);

    const preferences = this.extractPreferences(userMessage, toolsUsed);
    extractions.push(...preferences);

    const corrections = this.extractCorrections(userMessage);
    extractions.push(...corrections);

    for (const extraction of extractions) {
      await this.storeLearning(extraction);
    }

    return extractions;
  }

  private extractTerminology(message: string): LearningExtraction[] {
    const extractions: LearningExtraction[] = [];

    for (const pattern of TERMINOLOGY_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        extractions.push({
          type: 'terminology',
          key: match[1].trim().toLowerCase(),
          value: match[2].trim(),
          confidence: 0.9,
          source: 'explicit',
          context: message
        });
      }
    }

    return extractions;
  }

  private extractPreferences(message: string, toolsUsed: string[]): LearningExtraction[] {
    const extractions: LearningExtraction[] = [];

    for (const [prefType, patterns] of Object.entries(PREFERENCE_INDICATORS)) {
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          extractions.push({
            type: 'preference',
            key: prefType,
            value: this.normalizePreferenceValue(prefType, match[1] || match[0]),
            confidence: 0.8,
            source: 'explicit',
            context: message
          });
        }
      }
    }

    if (toolsUsed.includes('add_report_section')) {
      const chartMatch = message.match(/(?:bar|line|pie|area|treemap)\s*chart/i);
      if (chartMatch) {
        extractions.push({
          type: 'preference',
          key: 'chart_type',
          value: chartMatch[0].replace(/\s*chart/i, '').toLowerCase(),
          confidence: 0.5,
          source: 'implicit'
        });
      }
    }

    return extractions;
  }

  private extractCorrections(message: string): LearningExtraction[] {
    const extractions: LearningExtraction[] = [];

    for (const pattern of CORRECTION_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        extractions.push({
          type: 'correction',
          key: 'correction_' + Date.now(),
          value: JSON.stringify({
            originalText: match[1],
            correctedText: match[2] || match[1],
            timestamp: new Date().toISOString()
          }),
          confidence: 0.95,
          source: 'correction',
          context: message
        });
      }
    }

    return extractions;
  }

  private async storeLearning(extraction: LearningExtraction): Promise<void> {
    try {
      if (extraction.type === 'terminology') {
        await this.storeTerminology(extraction);
      } else if (extraction.type === 'preference') {
        await this.storePreference(extraction);
      } else if (extraction.type === 'correction') {
        await this.storeCorrection(extraction);
      }
    } catch (error) {
      console.error('Failed to store learning:', error);
    }
  }

  private async storeTerminology(extraction: LearningExtraction): Promise<void> {
    const { data: existing } = await supabase
      .from('ai_knowledge')
      .select('id, confidence')
      .eq('customer_id', this.customerId)
      .eq('scope', 'customer')
      .eq('knowledge_type', 'term')
      .eq('key', extraction.key)
      .maybeSingle();

    if (existing) {
      const newConfidence = Math.min((existing.confidence || 0.5) + 0.1, 1.0);
      await supabase
        .from('ai_knowledge')
        .update({
          definition: extraction.value,
          confidence: newConfidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('ai_knowledge').insert({
        customer_id: parseInt(this.customerId),
        scope: 'customer',
        knowledge_type: 'term',
        key: extraction.key,
        label: extraction.key,
        definition: extraction.value,
        confidence: extraction.confidence,
        source: extraction.source,
        is_active: true
      });
    }
  }

  private async storePreference(extraction: LearningExtraction): Promise<void> {
    const { data: profile } = await supabase
      .from('customer_intelligence_profiles')
      .select('id, preferences')
      .eq('customer_id', parseInt(this.customerId))
      .maybeSingle();

    const preferences = (profile?.preferences as Record<string, Record<string, number>>) || {};
    const prefKey = extraction.key;
    const prefValue = extraction.value;

    if (!preferences[prefKey]) {
      preferences[prefKey] = {};
    }

    const currentWeight = preferences[prefKey][prefValue] || 0;
    const increment = extraction.source === 'explicit' ? 0.3 : 0.1;

    for (const key of Object.keys(preferences[prefKey])) {
      if (key !== prefValue) {
        preferences[prefKey][key] = Math.max(0, preferences[prefKey][key] - 0.05);
      }
    }

    preferences[prefKey][prefValue] = Math.min(currentWeight + increment, 1.0);

    if (profile) {
      await supabase
        .from('customer_intelligence_profiles')
        .update({ preferences, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
    } else {
      await supabase.from('customer_intelligence_profiles').insert({
        customer_id: parseInt(this.customerId),
        preferences
      });
    }
  }

  private async storeCorrection(extraction: LearningExtraction): Promise<void> {
    await supabase.from('ai_learning_corrections').insert({
      customer_id: parseInt(this.customerId),
      correction_data: JSON.parse(extraction.value),
      context: extraction.context,
      processed: false,
      created_at: new Date().toISOString()
    });
  }

  private normalizePreferenceValue(type: string, value: string): string {
    const lower = value.toLowerCase();

    switch (type) {
      case 'chart_type':
        if (lower.includes('bar')) return 'bar';
        if (lower.includes('line')) return 'line';
        if (lower.includes('pie')) return 'pie';
        if (lower.includes('area')) return 'area';
        if (lower.includes('table')) return 'table';
        return lower;

      case 'sort_order':
        if (lower.includes('desc') || lower.includes('high') || lower.includes('largest')) {
          return 'descending';
        }
        return 'ascending';

      default:
        return lower;
    }
  }

  async getLearnedPreferences(): Promise<Record<string, string>> {
    const { data: profile } = await supabase
      .from('customer_intelligence_profiles')
      .select('preferences')
      .eq('customer_id', parseInt(this.customerId))
      .maybeSingle();

    if (!profile?.preferences) return {};

    const result: Record<string, string> = {};

    for (const [prefType, values] of Object.entries(profile.preferences as Record<string, Record<string, number>>)) {
      let maxWeight = 0;
      let maxValue = '';

      for (const [value, weight] of Object.entries(values)) {
        if (weight > maxWeight && weight > 0.3) {
          maxWeight = weight;
          maxValue = value;
        }
      }

      if (maxValue) {
        result[prefType] = maxValue;
      }
    }

    return result;
  }

  async getLearnedTerminology(): Promise<Record<string, string>> {
    const { data: terms } = await supabase
      .from('ai_knowledge')
      .select('key, definition')
      .eq('customer_id', this.customerId)
      .eq('scope', 'customer')
      .eq('knowledge_type', 'term')
      .eq('is_active', true)
      .gte('confidence', 0.5);

    const result: Record<string, string> = {};
    for (const term of terms || []) {
      result[term.key] = term.definition;
    }

    return result;
  }
}
