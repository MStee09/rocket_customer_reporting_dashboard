export type TextCondition = 'is' | 'is_not' | 'contains' | 'starts_with' | 'is_empty' | 'is_not_empty';
export type NumberCondition = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'is_empty' | 'is_not_empty';
export type DateCondition =
  | 'is'
  | 'before'
  | 'after'
  | 'between'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_60_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'ytd'
  | 'mtd'
  | 'is_empty'
  | 'is_not_empty';
export type LookupCondition = 'is' | 'is_not' | 'is_any_of' | 'is_none_of' | 'is_empty' | 'is_not_empty';
export type BooleanCondition = 'is_true' | 'is_false';

export type FilterCondition = TextCondition | NumberCondition | DateCondition | LookupCondition | BooleanCondition;

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface NumberRangeValue {
  min: number;
  max: number;
}

export type FilterValue =
  | string
  | number
  | string[]
  | number[]
  | DateRangeValue
  | NumberRangeValue
  | boolean
  | null;

export type SortDirection = 'asc' | 'desc' | 'none';

export interface ColumnFilter {
  id: string;
  columnId: string;
  condition: FilterCondition;
  value: FilterValue;
  enabled: boolean;
}

export interface ColumnSort {
  columnId: string;
  direction: SortDirection;
}

export interface ReportFilterState {
  filters: ColumnFilter[];
  sorts: ColumnSort[];
}

export const conditionRequiresValue = (condition: FilterCondition): boolean => {
  const noValueConditions: FilterCondition[] = [
    'is_empty', 'is_not_empty', 'is_true', 'is_false',
    'last_7_days', 'last_30_days', 'last_60_days', 'last_90_days',
    'this_month', 'last_month', 'this_quarter', 'this_year', 'ytd', 'mtd'
  ];
  return !noValueConditions.includes(condition);
};

export const conditionRequiresRange = (condition: FilterCondition): boolean => {
  return condition === 'between';
};

export const conditionSupportsMultiple = (condition: FilterCondition): boolean => {
  return condition === 'is_any_of' || condition === 'is_none_of';
};
