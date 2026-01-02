import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { RESTRICTED_FIELDS, isRestrictedField, getAccessControlPrompt } from './restrictedFields.ts';

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
  scope: 'global' | 'customer';
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

interface CompiledContext {
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

  async compileContext(customerId: string, isAdmin: boolean): Promise<CompiledContext> {
    const [schemaFields, dataProfile, terms, products, customerProfile] = await Promise.all([
      this.fetchSchemaFields(isAdmin),
      this.fetchDataProfile(customerId),
      this.fetchTerms(customerId),
      this.fetchProducts(customerId),
      this.fetchCustomerProfile(customerId),
    ]);

    const fieldNames = schemaFields.map(f => f.name.toLowerCase());
    const availableFieldNames = isAdmin
      ? fieldNames
      : fieldNames.filter(f => !isRestrictedField(f));

    const prompts = {
      schema: this.buildSchemaPrompt(schemaFields, isAdmin),
      knowledge: this.buildKnowledgePrompt(terms, products),
      profile: this.buildProfilePrompt(customerProfile, dataProfile),
      access: getAccessControlPrompt(isAdmin),
    };

    return {
      schemaFields,
      dataProfile,
      fieldNames,
      availableFieldNames,
      terms,
      products,
      customerProfile,
      prompts,
    };
  }

  private async fetchSchemaFields(isAdmin: boolean): Promise<SchemaField[]> {
    try {
      const { data, error } = await this.supabase
        .from('schema_columns_metadata')
        .select('column_name, data_type, is_groupable, is_aggregatable, business_context, ai_instructions')
        .eq('table_name', 'shipment_report_view')
        .eq('is_active', true);

      if (error || !data?.length) {
        return this.getDefaultSchemaFields();
      }

      return data.map(col => ({
        name: col.column_name,
        type: col.data_type,
        isGroupable: col.is_groupable ?? true,
        isAggregatable: col.is_aggregatable ?? false,
        businessContext: col.business_context,
        aiInstructions: col.ai_instructions,
        adminOnly: isRestrictedField(col.column_name),
      }));
    } catch {
      return this.getDefaultSchemaFields();
    }
  }

  private getDefaultSchemaFields(): SchemaField[] {
    return [
      { name: 'ship_date', type: 'date', isGroupable: true, isAggregatable: false },
      { name: 'carrier_name', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'origin_state', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'destination_state', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'retail', type: 'numeric', isGroupable: false, isAggregatable: true },
      { name: 'total_weight', type: 'numeric', isGroupable: false, isAggregatable: true },
      { name: 'mode_name', type: 'text', isGroupable: true, isAggregatable: false },
      { name: 'status', type: 'text', isGroupable: true, isAggregatable: false },
    ];
  }

  private async fetchDataProfile(customerId: string): Promise<DataProfile | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_customer_data_profile', {
        p_customer_id: parseInt(customerId, 10),
      });
      if (error || !data) return null;
      return {
        totalShipments: data.total_shipments || 0,
        stateCount: data.state_count || 0,
        carrierCount: data.carrier_count || 0,
        monthsOfData: data.months_of_data || 0,
        topStates: data.top_states || [],
        topCarriers: data.top_carriers || [],
        avgShipmentsPerDay: data.avg_shipments_per_day || 0,
        hasCanadaData: data.has_canada_data || false,
      };
    } catch {
      return null;
    }
  }

  private async fetchTerms(customerId: string): Promise<TermDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_knowledge')
        .select('key, label, definition, ai_instructions, scope, metadata')
        .eq('knowledge_type', 'term')
        .eq('is_active', true)
        .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`);

      if (error || !data) return [];

      return data.map(t => ({
        key: t.key,
        label: t.label,
        definition: t.definition,
        aiInstructions: t.ai_instructions,
        scope: t.scope as 'global' | 'customer',
        aliases: t.metadata?.aliases,
      }));
    } catch {
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
        .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`);

      if (error || !data) return [];

      return data.map(p => ({
        name: p.label || p.key,
        keywords: p.metadata?.keywords || [p.key],
        searchField: p.metadata?.search_field || 'description',
      }));
    } catch {
      return [];
    }
  }

  private async fetchCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('customer_profiles')
        .select('priorities, products, key_markets, terminology, benchmark_period, account_notes, preferences')
        .eq('customer_id', parseInt(customerId, 10))
        .maybeSingle();

      if (error || !data) return null;

      return {
        priorities: data.priorities || [],
        products: data.products || [],
        keyMarkets: data.key_markets || [],
        terminology: data.terminology || [],
        benchmarkPeriod: data.benchmark_period,
        accountNotes: data.account_notes,
        preferences: data.preferences,
      };
    } catch {
      return null;
    }
  }

  private buildSchemaPrompt(fields: SchemaField[], isAdmin: boolean): string {
    const availableFields = isAdmin ? fields : fields.filter(f => !f.adminOnly);

    const groupableFields = availableFields.filter(f => f.isGroupable);
    const aggregatableFields = availableFields.filter(f => f.isAggregatable);

    let prompt = `## AVAILABLE DATA FIELDS\n\n`;
    prompt += `### Fields for grouping (use in groupBy):\n`;
    prompt += groupableFields.map(f => {
      let line = `- **${f.name}** (${f.type})`;
      if (f.businessContext) line += `: ${f.businessContext}`;
      return line;
    }).join('\n');

    prompt += `\n\n### Fields for metrics (use in aggregations):\n`;
    prompt += aggregatableFields.map(f => {
      let line = `- **${f.name}** (${f.type})`;
      if (f.businessContext) line += `: ${f.businessContext}`;
      return line;
    }).join('\n');

    return prompt;
  }

  private buildKnowledgePrompt(terms: TermDefinition[], products: ProductMapping[]): string {
    if (terms.length === 0 && products.length === 0) return '';

    let prompt = `## CUSTOMER KNOWLEDGE\n\n`;

    if (terms.length > 0) {
      prompt += `### Terminology:\n`;
      prompt += terms.map(t => {
        let line = `- **${t.label || t.key}**: ${t.definition}`;
        if (t.aiInstructions) line += ` [AI: ${t.aiInstructions}]`;
        return line;
      }).join('\n');
      prompt += '\n\n';
    }

    if (products.length > 0) {
      prompt += `### Products:\n`;
      prompt += products.map(p => 
        `- **${p.name}**: Search in ${p.searchField} for: ${p.keywords.join(', ')}`
      ).join('\n');
    }

    return prompt;
  }

  private buildProfilePrompt(profile: CustomerProfile | null, dataProfile: DataProfile | null): string {
    if (!profile && !dataProfile) return '';

    let prompt = `## CUSTOMER CONTEXT\n\n`;

    if (dataProfile) {
      prompt += `### Data Overview:\n`;
      prompt += `- Total shipments: ${dataProfile.totalShipments.toLocaleString()}\n`;
      prompt += `- Active states: ${dataProfile.stateCount}\n`;
      prompt += `- Active carriers: ${dataProfile.carrierCount}\n`;
      prompt += `- Data history: ${dataProfile.monthsOfData} months\n`;
      if (dataProfile.topStates.length > 0) {
        prompt += `- Top states: ${dataProfile.topStates.slice(0, 5).join(', ')}\n`;
      }
      if (dataProfile.topCarriers.length > 0) {
        prompt += `- Top carriers: ${dataProfile.topCarriers.slice(0, 5).join(', ')}\n`;
      }
      if (dataProfile.hasCanadaData) {
        prompt += `- Note: Customer has Canadian shipment data\n`;
      }
      prompt += '\n';
    }

    if (profile) {
      if (profile.priorities.length > 0) {
        prompt += `### Business Priorities:\n`;
        prompt += profile.priorities.map(p => `- ${p}`).join('\n');
        prompt += '\n\n';
      }

      if (profile.keyMarkets.length > 0) {
        prompt += `### Key Markets: ${profile.keyMarkets.join(', ')}\n\n`;
      }

      if (profile.accountNotes) {
        prompt += `### Account Notes:\n${profile.accountNotes}\n\n`;
      }
    }

    return prompt;
  }
}