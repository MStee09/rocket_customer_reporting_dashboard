// src/ai/compiler/knowledgeCompiler.ts
// Compiles knowledge base into AI context

import { supabase } from '../../lib/supabase';
import {
  KnowledgeContext,
  TermDefinition,
  CalculationDefinition,
  ProductMapping,
  BusinessRule,
  KnowledgeDocument,
} from '../types';

export async function compileKnowledgeContext(
  customerId: string,
  isAdmin: boolean
): Promise<KnowledgeContext> {
  // Fetch unified knowledge (global + customer-specific)
  const { data: knowledge } = await supabase
    .from('ai_knowledge')
    .select('*')
    .eq('is_active', true)
    .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`)
    .order('confidence', { ascending: false });

  // Fetch knowledge documents
  const { data: documents } = await supabase
    .from('ai_knowledge_documents')
    .select('*')
    .eq('is_active', true)
    .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`)
    .order('priority', { ascending: false });

  const allKnowledge = knowledge || [];

  const terms: TermDefinition[] = allKnowledge
    .filter(k => k.knowledge_type === 'term')
    .filter(k => isAdmin || k.is_visible_to_customers)
    .map(t => ({
      key: t.key,
      label: t.label,
      definition: t.definition || '',
      aiInstructions: t.ai_instructions,
      scope: t.scope as 'global' | 'customer',
      aliases: (t.metadata?.aliases as string[]) || [],
    }));

  const calculations: CalculationDefinition[] = allKnowledge
    .filter(k => k.knowledge_type === 'calculation')
    .map(c => ({
      key: c.key,
      label: c.label,
      definition: c.definition || '',
      formula: c.metadata?.formula as string,
      aiInstructions: c.ai_instructions,
    }));

  const products: ProductMapping[] = allKnowledge
    .filter(k => k.knowledge_type === 'product')
    .map(p => ({
      name: p.label || p.key,
      keywords: (p.metadata?.keywords as string[]) || [],
      searchField: (p.metadata?.search_field as string) || 'description',
    }));

  const rules: BusinessRule[] = allKnowledge
    .filter(k => k.knowledge_type === 'rule')
    .map(r => ({
      key: r.key,
      definition: r.definition || '',
      aiInstructions: r.ai_instructions,
    }));

  const docs: KnowledgeDocument[] = (documents || []).map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    scope: d.scope as 'global' | 'customer',
    extractedText: d.extracted_text,
    priority: d.priority,
  }));

  return { terms, calculations, products, rules, documents: docs };
}

export function formatKnowledgeForPrompt(
  knowledge: KnowledgeContext,
  isAdmin: boolean
): string {
  let output = '## KNOWLEDGE BASE\n\n';

  const customerTerms = knowledge.terms.filter(t => t.scope === 'customer');
  const globalTerms = knowledge.terms.filter(t => t.scope === 'global');

  if (customerTerms.length > 0) {
    output += '### Customer Terminology (USE THESE)\n';
    for (const term of customerTerms) {
      const aliases = term.aliases?.length ? ` (also: ${term.aliases.join(', ')})` : '';
      output += `- **${term.key}**${aliases}: ${term.definition}\n`;
      if (term.aiInstructions) output += `  - Note: ${term.aiInstructions}\n`;
    }
    output += '\n';
  }

  if (globalTerms.length > 0) {
    output += '### Industry Terms\n';
    for (const term of globalTerms.slice(0, 20)) {
      output += `- **${term.key}**: ${term.definition}\n`;
    }
    output += '\n';
  }

  if (knowledge.products.length > 0) {
    output += '### Product Categories\n';
    output += 'When user asks about products, use these categorizations:\n';
    for (const product of knowledge.products) {
      output += `- **${product.name}**: Search \`${product.searchField}\` for: ${product.keywords.join(', ')}\n`;
    }
    output += '\n';
  }

  if (knowledge.calculations.length > 0) {
    output += '### Available Calculations\n';
    for (const calc of knowledge.calculations) {
      output += `- **${calc.label || calc.key}**: ${calc.definition}\n`;
      if (calc.formula) output += `  - Formula: ${calc.formula}\n`;
    }
    output += '\n';
  }

  if (knowledge.documents.length > 0) {
    output += '### Reference Documents\n';
    for (const doc of knowledge.documents.slice(0, 5)) {
      const preview = doc.extractedText?.slice(0, 200) || doc.description || '';
      output += `- **${doc.title}**: ${preview}...\n`;
    }
  }

  return output;
}
