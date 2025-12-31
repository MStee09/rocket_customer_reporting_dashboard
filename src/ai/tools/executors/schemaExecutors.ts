import { ToolResult, AIToolContext, SchemaFieldInfo, FieldRelationship } from '../types';

export async function executeGetSchemaInfo(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const category = args.category as string | undefined;
  const searchTerm = args.searchTerm as string | undefined;

  let fields = context.schemaFields;

  if (!context.isAdmin) {
    fields = fields.filter(f => !f.adminOnly);
  }

  if (category && category !== 'all') {
    fields = fields.filter(f => f.category === category);
  }

  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    fields = fields.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.displayName.toLowerCase().includes(lower) ||
      f.businessContext?.toLowerCase().includes(lower)
    );
  }

  const grouped: Record<string, SchemaFieldInfo[]> = {};
  for (const field of fields) {
    if (!grouped[field.category]) {
      grouped[field.category] = [];
    }
    grouped[field.category].push(field);
  }

  return {
    toolCallId,
    success: true,
    data: {
      totalFields: fields.length,
      byCategory: grouped,
      fields: fields.map(f => ({
        name: f.name,
        displayName: f.displayName,
        dataType: f.dataType,
        category: f.category,
        isGroupable: f.isGroupable,
        isAggregatable: f.isAggregatable,
        businessContext: f.businessContext
      }))
    }
  };
}

export async function executeGetFieldRelationships(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const fieldName = args.fieldName as string | undefined;

  let relationships = context.fieldRelationships;

  if (fieldName) {
    const lower = fieldName.toLowerCase();
    relationships = relationships.filter(
      r => r.fieldA.toLowerCase() === lower || r.fieldB.toLowerCase() === lower
    );
  }

  const byType: Record<string, FieldRelationship[]> = {};
  for (const rel of relationships) {
    if (!byType[rel.relationshipType]) {
      byType[rel.relationshipType] = [];
    }
    byType[rel.relationshipType].push(rel);
  }

  return {
    toolCallId,
    success: true,
    data: {
      totalRelationships: relationships.length,
      byType,
      relationships: relationships.map(r => ({
        fields: [r.fieldA, r.fieldB],
        type: r.relationshipType,
        description: r.description,
        suggestedUse: r.suggestedUse
      }))
    },
    suggestions: relationships.length === 0 && fieldName
      ? [`No relationships found for "${fieldName}". This field can be used independently.`]
      : undefined
  };
}
