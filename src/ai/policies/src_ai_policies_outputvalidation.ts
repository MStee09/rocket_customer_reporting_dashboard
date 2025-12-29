// src/ai/policies/outputValidation.ts
// Validates AI outputs against database schema

import { AIReportDefinition, ReportSection } from '../../types/aiReport';
import { SchemaContext, ValidationResult } from '../types';

const VALID_SECTION_TYPES = ['hero', 'stat-row', 'category-grid', 'chart', 'table', 'header', 'map'];
const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'treemap', 'radar', 'area', 'scatter', 'bump', 'funnel', 'heatmap'];
const VALID_MAP_TYPES = ['choropleth', 'flow', 'cluster'];
const VALID_AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max'];

export function validateReportOutput(
  report: AIReportDefinition,
  schema: SchemaContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const availableFields = schema.fields.map(f => f.name.toLowerCase());

  if (!report.name || typeof report.name !== 'string') {
    errors.push('Report must have a name');
  }

  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push('Report must have a sections array');
    return { valid: false, errors, warnings };
  }

  if (report.sections.length === 0) {
    warnings.push('Report has no sections');
  }

  for (let i = 0; i < report.sections.length; i++) {
    const section = report.sections[i];
    const sectionId = `Section ${i + 1} ("${section.title || 'untitled'}")`;

    if (!section.type || !VALID_SECTION_TYPES.includes(section.type)) {
      errors.push(`${sectionId}: Invalid section type "${section.type}". Valid: ${VALID_SECTION_TYPES.join(', ')}`);
      continue;
    }

    const sectionErrors = validateSection(section, availableFields, schema, sectionId);
    errors.push(...sectionErrors.errors);
    warnings.push(...sectionErrors.warnings);
  }

  if (report.calculatedFields) {
    for (const calc of report.calculatedFields) {
      const calcErrors = validateCalculatedField(calc, availableFields);
      errors.push(...calcErrors.map(e => `Calculated field "${calc.name}": ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixedReport: errors.length === 0 ? report : undefined,
  };
}

function validateSection(
  section: ReportSection,
  availableFields: string[],
  schema: SchemaContext,
  sectionId: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = section.config as Record<string, any>;

  if (!config) {
    if (section.type !== 'header') {
      errors.push(`${sectionId}: Missing config`);
    }
    return { errors, warnings };
  }

  if (section.type === 'chart') {
    const chartType = config.chartType;
    if (chartType && !VALID_CHART_TYPES.includes(chartType)) {
      errors.push(`${sectionId}: Invalid chart type "${chartType}". Valid: ${VALID_CHART_TYPES.join(', ')}`);
    }
  }

  if (section.type === 'map') {
    const mapType = config.mapType;
    if (mapType && !VALID_MAP_TYPES.includes(mapType)) {
      errors.push(`${sectionId}: Invalid map type "${mapType}". Valid: ${VALID_MAP_TYPES.join(', ')}`);
    }
  }

  const fieldRefs = extractFieldReferences(config);
  for (const fieldRef of fieldRefs) {
    if (isCalculatedFieldReference(fieldRef)) continue;
    if (!availableFields.includes(fieldRef.toLowerCase())) {
      errors.push(`${sectionId}: Unknown field "${fieldRef}" - not in database schema`);
    }
  }

  if (config.groupBy) {
    const field = schema.fields.find(f => f.name.toLowerCase() === config.groupBy.toLowerCase());
    if (field && !field.isGroupable) {
      warnings.push(`${sectionId}: Field "${config.groupBy}" may not be ideal for grouping`);
    }
  }

  if (config.metric?.field && config.metric?.aggregation) {
    const agg = config.metric.aggregation.toLowerCase();
    if (['sum', 'avg'].includes(agg)) {
      const field = schema.fields.find(f => f.name.toLowerCase() === config.metric.field.toLowerCase());
      if (field && !field.isAggregatable) {
        errors.push(`${sectionId}: Field "${config.metric.field}" cannot be aggregated with ${agg.toUpperCase()}`);
      }
    }
  }

  if (config.metric?.aggregation) {
    const agg = config.metric.aggregation.toLowerCase();
    if (!VALID_AGGREGATIONS.includes(agg)) {
      errors.push(`${sectionId}: Invalid aggregation "${agg}". Valid: ${VALID_AGGREGATIONS.join(', ')}`);
    }
  }

  return { errors, warnings };
}

function extractFieldReferences(config: Record<string, any>): string[] {
  const fields: string[] = [];

  if (config.metric?.field) fields.push(config.metric.field);
  if (config.groupBy) fields.push(config.groupBy);
  if (config.secondaryGroupBy) fields.push(config.secondaryGroupBy);

  if (config.metrics && Array.isArray(config.metrics)) {
    for (const m of config.metrics) {
      if (m.field) fields.push(m.field);
    }
  }

  if (config.columns && Array.isArray(config.columns)) {
    for (const col of config.columns) {
      if (col.field) fields.push(col.field);
    }
  }

  if (config.filters && Array.isArray(config.filters)) {
    for (const filter of config.filters) {
      if (filter.field) fields.push(filter.field);
    }
  }

  if (config.calculatedFields && Array.isArray(config.calculatedFields)) {
    for (const calc of config.calculatedFields) {
      if (calc.fields && Array.isArray(calc.fields)) {
        fields.push(...calc.fields);
      }
    }
  }

  return fields;
}

function isCalculatedFieldReference(fieldName: string): boolean {
  return fieldName.includes('_per_') || fieldName.startsWith('calc_') || fieldName.startsWith('computed_');
}

function validateCalculatedField(
  calc: { name: string; formula?: string; fields?: string[] },
  availableFields: string[]
): string[] {
  const errors: string[] = [];

  if (!calc.name) errors.push('Missing name');
  if (!calc.formula && !calc.fields) errors.push('Must have either formula or fields');

  if (calc.fields) {
    for (const field of calc.fields) {
      if (!availableFields.includes(field.toLowerCase())) {
        errors.push(`References unknown field "${field}"`);
      }
    }
  }

  return errors;
}

export function attemptAutoFix(
  report: AIReportDefinition,
  schema: SchemaContext
): AIReportDefinition | null {
  const fixed = JSON.parse(JSON.stringify(report)) as AIReportDefinition;
  let madeChanges = false;

  fixed.sections = fixed.sections.filter(s => {
    if (!VALID_SECTION_TYPES.includes(s.type)) {
      madeChanges = true;
      return false;
    }
    return true;
  });

  for (const section of fixed.sections) {
    if (section.type === 'chart') {
      const config = section.config as Record<string, any>;
      if (config?.chartType && !VALID_CHART_TYPES.includes(config.chartType)) {
        config.chartType = 'bar';
        madeChanges = true;
      }
    }
  }

  if (madeChanges) {
    const validation = validateReportOutput(fixed, schema);
    if (validation.valid) return fixed;
  }

  return null;
}
