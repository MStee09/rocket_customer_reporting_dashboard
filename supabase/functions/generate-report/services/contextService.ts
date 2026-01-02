/**
 * CONTEXT SERVICE
 * Compiles all context needed for AI report generation:
 * - Schema fields
 * - Data profile
 * - Knowledge base
 * - Customer intelligence profile
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isRestrictedField, getAccessControlPrompt } from './restrictedFields.ts';

export interface SchemaField {
  name: string;
  type: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  businessContext?: string;
  aiInstructions?: string;
  adminOnly?: boolean;
}

export interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
  hasCanadaData?: boolean;
}

export interface TermDefinition {
  key: string;
  label?: string;
  definition: string;
  aiInstructions?: string;
  scope: 'global' | 'customer';
  aliases?: string[];
}

export interface ProductMapping {
  name: string;
  keywords: string[];
  searchField: string;
}

export interface CustomerProfile {
  priorities: string[];
  products: Array<{ name: string; keywords: string[]; field: string }>;
  keyMarkets: string[];
  terminology: Array<{ term: string; means: string; source: string }>;
  benchmarkPeriod?: string;
  accountNotes?: string;
  preferences?: Record<string, Record<string, number>>;
}

export interface CompiledContext {
  schemaFields: SchemaField[];
  dataProfile: DataProfile;
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
    const [schemaResult, knowledgeResult, profileResult] = await Promise.all([
      this.compileSchemaContext(customerId),
      this.compileKnowledgeContext(customerId, isAdmin),
      this.getCustomerProfile(customerId),
    ]);

    const { fields: schemaFields, dataProfile, fieldNames } = schemaResult;
    const { terms, products } = knowledgeResult;
    const customerProfile = profileResult;

    const availableFieldNames = schemaFields
      .filter(f => isAdmin || !f.adminOnly)
      .map(f => f.name.toLowerCase());

    return {
      schemaFields,
      dataProfile,
      fieldNames,
      availableFieldNames,
      terms,
      products,
      customerProfile,
      prompts: {
        schema: this.formatSchemaForPrompt(schemaFields, dataProfile, isAdmin),
        knowledge: terms.length > 0 || products.length > 0
          ? this.formatKnowledgeForPrompt(terms, products) : '',
        profile: customerProfile ? this.formatProfileForPrompt(customerProfile) : '',
        access: getAccessControlPrompt(isAdmin),
      },
    };
  }

  private async compileSchemaContext(customerId: string): Promise<{ fields: SchemaField[]; dataProfile: DataProfile; fieldNames: string[] }> {
    const { data: columns } = await this.supabase
      .from('schema_columns')
      .select('*')
      .eq('view_name', 'shipment_report_view')
      .order('ordinal_position');

    const { data: fieldContext } = await this.supabase.from('field_business_context').select('*');

    let dataProfile: DataProfile = {
      totalShipments: 0, stateCount: 0, carrierCount: 0, monthsOfData: 0,
      topStates: [], topCarriers: [], avgShipmentsPerDay: 0,
    };

    try {
      const { data: profileData } = await this.supabase.rpc('get_customer_data_profile', { p_customer_id: customerId });
      if (profileData) {
        dataProfile = {
          totalShipments: profileData.totalShipments || 0,
          stateCount: profileData.stateCount || 0,
          carrierCount: profileData.carrierCount || 0,
          monthsOfData: profileData.monthsOfData || 0,
          topStates: profileData.topStates || [],
          topCarriers: profileData.topCarriers || [],
          avgShipmentsPerDay: profileData.avgShipmentsPerDay || 0,
          hasCanadaData: profileData.hasCanadaData,
        };
      }
    } catch (e) {
      console.error('Error fetching data profile:', e);
    }

    const contextMap = new Map<string, any>();
    (fieldContext || []).forEach((fc: any) => contextMap.set(fc.field_name, fc));

    const fields: SchemaField[] = (columns || []).map((col: any) => {
      const context = contextMap.get(col.column_name);
      return {
        name: col.column_name,
        type: col.data_type,
        isGroupable: col.is_groupable ?? true,
        isAggregatable: col.is_aggregatable ?? false,
        businessContext: context?.business_description,
        aiInstructions: context?.ai_instructions,
        adminOnly: isRestrictedField(col.column_name) || context?.admin_only,
      };
    });

    return { fields, dataProfile, fieldNames: fields.map(f => f.name.toLowerCase()) };
  }

  private async compileKnowledgeContext(customerId: string, isAdmin: boolean): Promise<{ terms: TermDefinition[]; products: ProductMapping[] }> {
    const { data: knowledge } = await this.supabase
      .from('ai_knowledge')
      .select('*')
      .eq('is_active', true)
      .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`)
      .order('confidence', { ascending: false });

    const allKnowledge = knowledge || [];

    const terms: TermDefinition[] = allKnowledge
      .filter((k: any) => k.knowledge_type === 'term')
      .filter((k: any) => isAdmin || k.is_visible_to_customers !== false)
      .map((t: any) => ({
        key: t.key, label: t.label, definition: t.definition || '',
        aiInstructions: t.ai_instructions, scope: t.scope as 'global' | 'customer',
        aliases: (t.metadata?.aliases as string[]) || [],
      }));

    const products: ProductMapping[] = allKnowledge
      .filter((k: any) => k.knowledge_type === 'product')
      .map((p: any) => ({
        name: p.label || p.key,
        keywords: (p.metadata?.keywords as string[]) || [],
        searchField: (p.metadata?.search_field as string) || 'description',
      }));

    return { terms, products };
  }

  private async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    try {
      const { data: profile } = await this.supabase
        .from('customer_intelligence_profiles')
        .select('*')
        .eq('customer_id', parseInt(customerId))
        .single();

      if (!profile) return null;

      const { data: learnedTerms } = await this.supabase
        .from('ai_knowledge')
        .select('key, label, definition, source')
        .eq('scope', 'customer')
        .eq('customer_id', customerId)
        .eq('knowledge_type', 'term')
        .eq('is_active', true);

      return {
        priorities: profile.priorities || [],
        products: profile.products || [],
        keyMarkets: profile.key_markets || [],
        terminology: [
          ...(profile.terminology || []).map((t: any) => ({ term: t.term || t.key, means: t.means || t.definition, source: 'admin' })),
          ...(learnedTerms || []).map((t: any) => ({ term: t.key, means: t.definition || t.label, source: 'learned' }))
        ],
        benchmarkPeriod: profile.benchmark_period,
        accountNotes: profile.account_notes,
        preferences: profile.preferences || {},
      };
    } catch (e) {
      return null;
    }
  }

  private formatSchemaForPrompt(fields: SchemaField[], dataProfile: DataProfile, isAdmin: boolean): string {
    let output = '## AVAILABLE DATA FIELDS\n\nYou can ONLY use these fields in reports.\n\n';
    output += '| Field | Type | Group By | Aggregate | Description |\n|-------|------|----------|-----------|-------------|\n';

    for (const field of fields) {
      if (!isAdmin && field.adminOnly) continue;
      output += `| ${field.name} | ${field.type} | ${field.isGroupable ? 'yes' : ''} | ${field.isAggregatable ? 'SUM/AVG' : 'COUNT'} | ${field.businessContext || ''} |\n`;
    }

    output += '\n## CUSTOMER DATA PROFILE\n\n';
    output += `- **Total Shipments:** ${dataProfile.totalShipments.toLocaleString()}\n`;
    output += `- **Ships to:** ${dataProfile.stateCount} states${dataProfile.hasCanadaData ? ' (including Canada)' : ''}\n`;
    output += `- **Uses:** ${dataProfile.carrierCount} carriers\n`;
    output += `- **Data History:** ${dataProfile.monthsOfData} months\n`;
    if (dataProfile.topStates.length > 0) output += `- **Top Destinations:** ${dataProfile.topStates.slice(0, 5).join(', ')}\n`;
    if (dataProfile.topCarriers.length > 0) output += `- **Top Carriers:** ${dataProfile.topCarriers.slice(0, 3).join(', ')}\n`;

    return output;
  }

  private formatKnowledgeForPrompt(terms: TermDefinition[], products: ProductMapping[]): string {
    let output = '## KNOWLEDGE BASE\n\n';

    const customerTerms = terms.filter(t => t.scope === 'customer');
    if (customerTerms.length > 0) {
      output += '### Customer Terminology\n';
      for (const term of customerTerms) {
        const aliases = term.aliases?.length ? ` (also: ${term.aliases.join(', ')})` : '';
        output += `- **"${term.key}"**${aliases}: ${term.definition}\n`;
      }
      output += '\n';
    }

    if (products.length > 0) {
      output += '### Product Categories\n';
      for (const product of products) {
        output += `- **${product.name}**: Search \`${product.searchField}\` for: ${product.keywords.join(', ')}\n`;
      }
    }

    return output;
  }

  private formatProfileForPrompt(profile: CustomerProfile): string {
    let output = '## CUSTOMER INTELLIGENCE\n\n';
    if (profile.priorities.length > 0) output += `**Priorities:** ${profile.priorities.join(', ')}\n\n`;
    if (profile.keyMarkets.length > 0) output += `**Key Markets:** ${profile.keyMarkets.join(', ')}\n\n`;
    if (profile.terminology.length > 0) {
      output += '**Terminology:**\n';
      for (const term of profile.terminology) output += `- "${term.term}" -> ${term.means}\n`;
    }
    return output;
  }
}