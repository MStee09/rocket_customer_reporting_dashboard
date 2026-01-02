// File: src/services/aiReportServiceV2.ts
// FIND AND REPLACE the formatToolExecution function (around line 194-217)

// REPLACE THIS OLD CODE:
/*
export function formatToolExecution(execution: ToolExecution): { icon: string; label: string; detail: string } {
  const { toolName, toolInput, result } = execution;
  const res = result as Record<string, unknown>;

  switch (toolName) {
    case 'explore_field':
      if (res.error) return { icon: 'X', label: `Failed: ${toolInput.field_name}`, detail: String(res.error) };
      return { icon: 'Search', label: `Explored ${toolInput.field_name}`, detail: `${res.unique_count || 0} values, ${res.populated_percent || 0}% coverage` };
    case 'preview_grouping':
      if (res.error) return { icon: 'X', label: `Failed: ${toolInput.group_by}`, detail: String(res.error) };
      return { icon: 'BarChart2', label: `Previewed ${toolInput.group_by}`, detail: `${res.total_groups || 0} groups` };
    case 'emit_learning':
      return { icon: 'Brain', label: `Learned: ${toolInput.key}`, detail: String(toolInput.value) };
    case 'finalize_report':
      const validation = res.validation as Record<string, unknown>;
      return validation?.valid
        ? { icon: 'CheckCircle', label: 'Built report', detail: 'Ready' }
        : { icon: 'AlertTriangle', label: 'Validation failed', detail: ((validation?.errors as string[]) || []).join(', ') };
    case 'ask_clarification':
      return { icon: 'HelpCircle', label: 'Clarifying', detail: String(toolInput.question) };
    default:
      return { icon: 'Wrench', label: toolName, detail: '' };
  }
}
*/

// WITH THIS NEW CODE:
export function formatToolExecution(execution: ToolExecution): { icon: string; label: string; detail: string } {
  const { toolName, toolInput, result } = execution;
  const res = result as Record<string, unknown>;

  // Human-readable field labels
  const fieldLabels: Record<string, string> = {
    carrier_name: 'carriers',
    origin_state: 'origin states',
    destination_state: 'destination states',
    origin_city: 'origin cities',
    destination_city: 'destination cities',
    mode_name: 'shipping modes',
    status: 'statuses',
    customer_name: 'customers',
    service_type: 'service types',
  };

  const humanizeField = (field: string): string => {
    return fieldLabels[field] || field.replace(/_/g, ' ');
  };

  switch (toolName) {
    case 'explore_field': {
      if (res.error) return { icon: 'X', label: `Failed: ${toolInput.field_name}`, detail: String(res.error) };
      const field = toolInput.field_name as string;
      const count = res.unique_count || 0;
      const coverage = res.populated_percent as number || 0;
      const label = fieldLabels[field] 
        ? `Found ${count} ${fieldLabels[field]} in your data`
        : `Found ${count} unique ${humanizeField(field)} values`;
      const detail = coverage < 80 
        ? `(${Math.round(100 - coverage)}% of records missing this field)`
        : '';
      return { icon: 'Search', label, detail };
    }
    case 'preview_grouping': {
      if (res.error) return { icon: 'X', label: `Preview failed`, detail: String(res.error) };
      const groupBy = toolInput.group_by as string;
      const groups = res.total_groups || 0;
      return { 
        icon: 'BarChart2', 
        label: `Grouped by ${humanizeField(groupBy)}`, 
        detail: `${groups} categories ready to visualize` 
      };
    }
    case 'emit_learning':
      return { 
        icon: 'Brain', 
        label: `Learned: "${toolInput.key}"`, 
        detail: `Means: ${toolInput.value}` 
      };
    case 'finalize_report': {
      const validation = res.validation as Record<string, unknown>;
      return validation?.valid
        ? { icon: 'CheckCircle', label: 'Report ready', detail: 'All validations passed' }
        : { icon: 'AlertTriangle', label: 'Validation issues', detail: ((validation?.errors as string[]) || []).join(', ') };
    }
    case 'ask_clarification':
      return { icon: 'HelpCircle', label: 'Need more info', detail: String(toolInput.question) };
    default:
      return { icon: 'Wrench', label: toolName, detail: '' };
  }
}
