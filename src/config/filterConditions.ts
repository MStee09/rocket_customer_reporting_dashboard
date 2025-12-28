import { FilterCondition } from '../types/filters';

export interface ConditionOption {
  value: FilterCondition;
  label: string;
  requiresValue: boolean;
  requiresRange?: boolean;
  supportsMultiple?: boolean;
}

export const TEXT_CONDITIONS: ConditionOption[] = [
  { value: 'is', label: 'is', requiresValue: true },
  { value: 'is_not', label: 'is not', requiresValue: true },
  { value: 'contains', label: 'contains', requiresValue: true },
  { value: 'starts_with', label: 'starts with', requiresValue: true },
  { value: 'is_empty', label: 'is empty', requiresValue: false },
  { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
];

export const NUMBER_CONDITIONS: ConditionOption[] = [
  { value: 'equals', label: 'equals', requiresValue: true },
  { value: 'not_equals', label: 'does not equal', requiresValue: true },
  { value: 'greater_than', label: 'is greater than', requiresValue: true },
  { value: 'less_than', label: 'is less than', requiresValue: true },
  { value: 'between', label: 'is between', requiresValue: true, requiresRange: true },
  { value: 'is_empty', label: 'is empty', requiresValue: false },
  { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
];

export const CURRENCY_CONDITIONS: ConditionOption[] = [
  { value: 'equals', label: 'equals', requiresValue: true },
  { value: 'not_equals', label: 'does not equal', requiresValue: true },
  { value: 'greater_than', label: 'is more than', requiresValue: true },
  { value: 'less_than', label: 'is less than', requiresValue: true },
  { value: 'between', label: 'is between', requiresValue: true, requiresRange: true },
  { value: 'is_empty', label: 'is empty', requiresValue: false },
  { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
];

export const DATE_CONDITIONS: ConditionOption[] = [
  { value: 'is', label: 'is', requiresValue: true },
  { value: 'before', label: 'is before', requiresValue: true },
  { value: 'after', label: 'is after', requiresValue: true },
  { value: 'between', label: 'is between', requiresValue: true, requiresRange: true },
  { value: 'last_7_days', label: 'in the last 7 days', requiresValue: false },
  { value: 'last_30_days', label: 'in the last 30 days', requiresValue: false },
  { value: 'last_60_days', label: 'in the last 60 days', requiresValue: false },
  { value: 'last_90_days', label: 'in the last 90 days', requiresValue: false },
  { value: 'this_month', label: 'this month', requiresValue: false },
  { value: 'last_month', label: 'last month', requiresValue: false },
  { value: 'this_quarter', label: 'this quarter', requiresValue: false },
  { value: 'this_year', label: 'this year', requiresValue: false },
  { value: 'ytd', label: 'year to date', requiresValue: false },
  { value: 'mtd', label: 'month to date', requiresValue: false },
  { value: 'is_empty', label: 'is empty', requiresValue: false },
  { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
];

export const LOOKUP_CONDITIONS: ConditionOption[] = [
  { value: 'is', label: 'is', requiresValue: true },
  { value: 'is_not', label: 'is not', requiresValue: true },
  { value: 'is_any_of', label: 'is any of', requiresValue: true, supportsMultiple: true },
  { value: 'is_none_of', label: 'is none of', requiresValue: true, supportsMultiple: true },
  { value: 'is_empty', label: 'is empty', requiresValue: false },
  { value: 'is_not_empty', label: 'is not empty', requiresValue: false },
];

export const BOOLEAN_CONDITIONS: ConditionOption[] = [
  { value: 'is_true', label: 'is Yes', requiresValue: false },
  { value: 'is_false', label: 'is No', requiresValue: false },
];

export type FieldFilterType = 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'lookup';

export const getConditionsForFieldType = (fieldType: FieldFilterType, format?: string): ConditionOption[] => {
  switch (fieldType) {
    case 'string': return TEXT_CONDITIONS;
    case 'number': return format === 'currency' ? CURRENCY_CONDITIONS : NUMBER_CONDITIONS;
    case 'currency': return CURRENCY_CONDITIONS;
    case 'date': return DATE_CONDITIONS;
    case 'boolean': return BOOLEAN_CONDITIONS;
    case 'lookup': return LOOKUP_CONDITIONS;
    default: return TEXT_CONDITIONS;
  }
};

export const getConditionOption = (condition: FilterCondition, fieldType: FieldFilterType, format?: string): ConditionOption | undefined => {
  const conditions = getConditionsForFieldType(fieldType, format);
  return conditions.find(c => c.value === condition);
};

export const getDefaultCondition = (fieldType: FieldFilterType): FilterCondition => {
  switch (fieldType) {
    case 'string': return 'contains';
    case 'number':
    case 'currency': return 'equals';
    case 'date': return 'last_30_days';
    case 'boolean': return 'is_true';
    case 'lookup': return 'is';
    default: return 'is';
  }
};
