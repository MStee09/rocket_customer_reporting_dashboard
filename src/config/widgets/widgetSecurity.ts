import { WidgetQueryConfig, CustomWidgetDefinition } from './customWidgetTypes';

const ALLOWED_TABLES = [
  'shipment',
  'shipment_address',
  'shipment_carrier',
  'shipment_item',
  'shipment_accessorial',
  'carrier',
  'customer',
];

const BLOCKED_FIELDS = [
  'password',
  'api_key',
  'secret',
  'token',
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateWidgetQuery = (
  query: WidgetQueryConfig,
  isAdmin: boolean,
  customerId?: number
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ALLOWED_TABLES.includes(query.baseTable)) {
    errors.push(`Table "${query.baseTable}" is not allowed`);
  }

  if (query.baseTable === 'customer' && !isAdmin) {
    errors.push('Customer table is only accessible to admins');
  }

  const allFields = [
    ...query.columns.map(c => c.field),
    ...(query.groupBy || []),
    ...(query.orderBy || []).map(o => o.field),
    ...(query.filters || []).map(f => f.field),
  ];

  for (const field of allFields) {
    if (BLOCKED_FIELDS.some(blocked => field.toLowerCase().includes(blocked))) {
      errors.push(`Field "${field}" is not allowed`);
    }
  }

  if (!isAdmin && customerId) {
    const hasCustomerFilter = query.filters?.some(f =>
      f.field === 'customer_id' && f.isDynamic
    );

    if (!hasCustomerFilter) {
      warnings.push('Query should filter by customer_id for customer widgets');
    }
  }

  if (query.limit && query.limit > 1000) {
    warnings.push('Query limit is very high (>1000), may impact performance');
  }

  for (const join of query.joins || []) {
    if (!ALLOWED_TABLES.includes(join.table)) {
      errors.push(`Join table "${join.table}" is not allowed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

export const validateCustomWidget = (
  widget: CustomWidgetDefinition,
  isAdmin: boolean,
  customerId?: number
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!widget.id) errors.push('Widget ID is required');
  if (!widget.name) errors.push('Widget name is required');
  if (!widget.type) errors.push('Widget type is required');

  if (widget.visibility.type === 'admin_only' && !isAdmin) {
    errors.push('Only admins can create admin-only widgets');
  }

  if (widget.dataSource.type === 'query' && widget.dataSource.query) {
    const queryValidation = validateWidgetQuery(
      widget.dataSource.query,
      isAdmin,
      customerId
    );
    errors.push(...queryValidation.errors);
    warnings.push(...queryValidation.warnings);
  }

  if (widget.dataSource.type === 'ai_generated') {
    if (!widget.dataSource.aiGenerated?.validatedBy && !isAdmin) {
      errors.push('AI-generated widgets must be validated by an admin');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
