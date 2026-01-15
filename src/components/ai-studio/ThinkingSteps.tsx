import { useState } from 'react';
import {
  Search, BarChart2, Brain, CheckCircle, AlertTriangle,
  HelpCircle, Wrench, ChevronDown, ChevronUp, X, Loader2
} from 'lucide-react';
import type { ToolExecution } from '../../services/aiReportGeneratorService';

interface ThinkingStepsProps {
  toolExecutions: ToolExecution[];
  isLoading?: boolean;
  compact?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Search,
  BarChart2,
  Brain,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Wrench,
  X,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || Wrench;
}

function formatToolStep(execution: ToolExecution): { icon: string; label: string; detail: string } {
  const { toolName, toolInput, result } = execution;
  const res = result as Record<string, unknown>;

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
    case 'get_customer_context':
      return { icon: 'Search', label: 'Loading customer profile', detail: 'Fetching business context' };
    case 'query_schema':
      return { icon: 'Search', label: 'Checking data structure', detail: 'Finding available columns' };
    case 'generate_visualization':
      return { icon: 'BarChart2', label: 'Building visualization', detail: 'Creating chart configuration' };
    default:
      return { icon: 'Wrench', label: toolName.replace(/_/g, ' '), detail: '' };
  }
}

export function ThinkingSteps({ toolExecutions, isLoading = false, compact = false }: ThinkingStepsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (toolExecutions.length === 0 && !isLoading) {
    return null;
  }

  const steps = toolExecutions.map(formatToolStep);

  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Wrench className="w-3 h-3" />
        <span>{toolExecutions.length} tool{toolExecutions.length !== 1 ? 's' : ''} used</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors mb-2"
      >
        <span>AI reasoning</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isExpanded && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {steps.map((step, index) => {
            const IconComponent = getIcon(step.icon);
            const isSuccess = step.icon === 'CheckCircle';
            const isError = step.icon === 'X' || step.icon === 'AlertTriangle';
            const isLearning = step.icon === 'Brain';

            return (
              <div
                key={index}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  isSuccess
                    ? 'bg-green-50 text-green-700'
                    : isError
                    ? 'bg-red-50 text-red-700'
                    : isLearning
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isSuccess ? 'text-green-500' :
                  isError ? 'text-red-500' :
                  isLearning ? 'text-teal-500' :
                  'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{step.label}</span>
                  {step.detail && (
                    <span className="text-gray-500 ml-1 text-xs">{step.detail}</span>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="font-medium">Processing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThinkingStepsInline({ toolExecutions }: { toolExecutions: ToolExecution[] }) {
  if (toolExecutions.length === 0) return null;

  const steps = toolExecutions.map(formatToolStep);

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {steps.slice(0, 3).map((step, index) => {
        const IconComponent = getIcon(step.icon);
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            title={step.detail}
          >
            <IconComponent className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{step.label}</span>
          </span>
        );
      })}
      {steps.length > 3 && (
        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
          +{steps.length - 3} more
        </span>
      )}
    </div>
  );
}

export default ThinkingSteps;
