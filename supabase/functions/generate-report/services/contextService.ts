import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { RESTRICTED_FIELDS, isRestrictedField, getAccessControlPrompt } from "./restrictedFields.ts";

interface SchemaField {
  name: string;
  type: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  businessContext?: string;
  aiInstructions?: string;
  adminOnly?: boolean;
}

interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
  hasCanadaData?: boolean;
}

interface TermDefinition {
  key: string;
  label?: string;
  definition: string;
  aiInstructions?: string;
  scope: "global" | "customer";
  aliases?: string[];
}

interface ProductMapping {
  name: string;
  keywords: string[];
  searchField: string;
}

interface CustomerProfile {
  priorities: string[];
  products: Array<{ name: string; keywords: string[]; field: string }>;
  keyMarkets: string[];
  terminology: Array<{ term: string; means: string; source: string }>;
  benchmarkPeriod?: string;
  accountNotes?: string;
  preferences?: Record<string, Record<string, number>>;
}

interface ContextResult {
  schemaFields: SchemaField[];
  dataProfile: DataProfile | null;
  fieldNames: string[];
  availableFieldNames: string[];
  terms: TermDefinition[];
  products: ProductMapping[];
  customerProfile: CustomerProfile | null;
  prompts: {
    schema: string;
    knowledge: string;
    profile: string;
    access: string;
  };
}

export class ContextService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async compileContext(customerId: string, isAdmin: boolean): Promise<ContextResult> {
    const [schemaFields, dataProfile, terms, products, customerProfile] = await Promise.all([
      this.fetchSchemaFields(isAdmin),
      this.fetchDataProfile(customerId),
      this.fetchTerms(customerId),
      this.fetchProducts(customerId),
      this.fetchCustomerProfile(customerId)
    ]);

    const fieldNames = schemaFields.map(f => f.name);
    const availableFieldNames = isAdmin 
      ? fieldNames 
      : fieldNames.filter(f => !isRestrictedField(f));

    const prompts = {
      schema: this.buildSchemaPrompt(schemaFields, isAdmin),
      knowledge: this.buildKnowledgePrompt(terms, products),
      profile: this.buildProfilePrompt(customerProfile),
      access: getAccessControlPrompt(isAdmin)
    };

    return {
      schemaFields,
      dataProfile,
      fieldNames,
      availableFieldNames,
      terms,
      products,
      customerProfile,
      prompts
    };
  }

  private async fetchSchemaFields(isAdmin: boolean): Promise<SchemaField[]> {
    try {
      const { data, error } = await this.supabase
        .from('schema_columns_metadata')
        .select('column_name, data_type, is_groupable, is_aggregatable, business_context, ai_instructions')
        .eq('view_name', 'shipment_report_view');

      if (error || !data) {
        console.error('[Context] Schema fetch error:', error);
        return this.getDefaultSchema(isAdmin);
      }

      return data.map(col => ({
        name: col.column_name,
        type: col.data_type,
        isGroupable: col.is_groupable ?? true,
        isAggregatable: col.is_aggregatable ?? false,
        businessContext: col.business_context,
        aiInstructions: col.ai_instructions,
        adminOnly: isRestrictedField(col.column_name)
      }));
    } catch (e) {
      console.error('[Context] Schema exception:', e);
      return this.getDefaultSchema(isAdmin);
    }
  }

  private getDefaultSchema(isAdmin: boolean): SchemaField[] {
    const baseFields = [
      { name: 'pro_number', type: 'text', isGroupable: false, isAggregatable: false },
      { name: 'customer_name', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'carrier_name', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'origin_city', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'origin_state', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'destination_city', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'destination_state', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'weight', type: 'numeric', isGroupable: false, isAggregatable: true },
      { name: 'retail', type: 'numeric', isGroupable: false, isAggregatable: true },
      { name: 'ship_date', type: 'date', isGroupable: true, isAggregatable: false },
      { name: 'delivery_date', type: 'date', isGroupable: true, isAggregatable: false },
      { name: 'status', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'mode', type: 'text', isGroupable: true, isAggregatable: false }
    ];

    if (isAdmin) {
      baseFields.push(
        { name: 'cost', type: 'numeric', isGroupable: false, isAggregatable: true },
        { name: 'margin', type: 'numeric', isGroupable: false, isAggregatable: true }
      );
    }

    return baseFields;
  }

  private async fetchDataProfile(customerId: string): Promise<DataProfile | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_customer_data_profile', {
        p_customer_id: parseInt(customerId, 10)
      });

      if (error || !data) {
        console.error('[Context] Data profile error:', error);
        return null;
      }

      return {
        totalShipments: data.total_shipments || 0,
        stateCount: data.state_count || 0,
        carrierCount: data.carrier_count || 0,
        monthsOfData: data.months_of_data || 0,
        topStates: data.top_states || [],
        topCarriers: data.top_carriers || [],
        avgShipmentsPerDay: data.avg_shipments_per_day || 0,
        hasCanadaData: data.has_canada_data || false
      };
    } catch (e) {
      console.error('[Context] Data profile exception:', e);
      return null;
    }
  }

  private async fetchTerms(customerId: string): Promise<TermDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_knowledge')
        .select('key, label, definition, ai_instructions, scope, aliases')
        .eq('knowledge_type', 'term')
        .eq('is_active', true)
        .or(`scope.eq.global,customer_id.eq.${customerId}`);

      if (error || !data) {
        console.error('[Context] Terms fetch error:', error);
        return [];
      }

      return data.map(t => ({
        key: t.key,
        label: t.label,
        definition: t.definition,
        aiInstructions: t.ai_instructions,
        scope: t.scope as 'global' | 'customer',
        aliases: t.aliases
      }));
    } catch (e) {
      console.error('[Context] Terms exception:', e);
      return [];
    }
  }

  private async fetchProducts(customerId: string): Promise<ProductMapping[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_knowledge')
        .select('key, label, definition, metadata')
        .eq('knowledge_type', 'product')
        .eq('is_active', true)
        .or(`scope.eq.global,customer_id.eq.${customerId}`);

      if (error || !data) {
        console.error('[Context] Products fetch error:', error);
        return [];
      }

      return data.map(p => ({
        name: p.label || p.key,
        keywords: p.metadata?.keywords || [p.key],
        searchField: p.metadata?.search_field || 'description'
      }));
    } catch (e) {
      console.error('[Context] Products exception:', e);
      return [];
    }
  }

  private async fetchCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('customer_profiles')
        .select('*')
        .eq('customer_id', parseInt(customerId, 10))
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        priorities: data.priorities || [],
        products: data.products || [],
        keyMarkets: data.key_markets || [],
        terminology: data.terminology || [],
        benchmarkPeriod: data.benchmark_period,
        accountNotes: data.account_notes,
        preferences: data.preferences
      };
    } catch (e) {
      console.error('[Context] Profile exception:', e);
      return null;
    }
  }

  private buildSchemaPrompt(fields: SchemaField[], isAdmin: boolean): string {
    const availableFields = isAdmin ? fields : fields.filter(f => !f.adminOnly);
    
    const fieldList = availableFields.map(f => {
      let desc = `- **${f.name}** (${f.type})`;
      if (f.isGroupable) desc += ' [groupable]';
      if (f.isAggregatable) desc += ' [aggregatable]';
      if (f.businessContext) desc += `: ${f.businessContext}`;
      return desc;
    }).join('\n');

    return `## AVAILABLE DATA FIELDS\n\n${fieldList}`;
  }

  private buildKnowledgePrompt(terms: TermDefinition[], products: ProductMapping[]): string {
    if (terms.length === 0 && products.length === 0) {
      return '';
    }

    let prompt = '## BUSINESS KNOWLEDGE\n\n';

    if (terms.length > 0) {
      prompt += '### Terms & Definitions\n';
      for (const term of terms) {
        prompt += `- **${term.label || term.key}**: ${term.definition}`;
        if (term.aiInstructions) prompt += ` (${term.aiInstructions})`;
        prompt += '\n';
      }
      prompt += '\n';
    }

    if (products.length > 0) {
      prompt += '### Product Mappings\n';
      for (const product of products) {
        prompt += `- **${product.name}**: Search "${product.searchField}" for: ${product.keywords.join(', ')}\n`;
      }
    }

    return prompt;
  }

  private buildProfilePrompt(profile: CustomerProfile | null): string {
    if (!profile) return '';

    let prompt = '## CUSTOMER CONTEXT\n\n';

    if (profile.priorities.length > 0) {
      prompt += `**Priorities**: ${profile.priorities.join(', ')}\n\n`;
    }

    if (profile.keyMarkets.length > 0) {
      prompt += `**Key Markets**: ${profile.keyMarkets.join(', ')}\n\n`;
    }

    if (profile.terminology.length > 0) {
      prompt += '**Custom Terms**:\n';
      for (const t of profile.terminology) {
        prompt += `- "${t.term}" means ${t.means}\n`;
      }
      prompt += '\n';
    }

    if (profile.accountNotes) {
      prompt += `**Account Notes**: ${profile.accountNotes}\n\n`;
    }

    if (profile.benchmarkPeriod) {
      prompt += `**Benchmark Period**: ${profile.benchmarkPeriod}\n\n`;
    }

    return prompt;
  }
}