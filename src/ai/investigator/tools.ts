import { ToolDefinition } from './types';

export const INVESTIGATOR_TOOLS: ToolDefinition[] = [
  {
    name: 'explore_field',
    description: `Explore a data field to understand its values, distribution, and quality.
ALWAYS use this before referencing a field in reports.
Returns: unique values, coverage %, top values with counts, data quality assessment.`,
    parameters: {
      type: 'object',
      properties: {
        field_name: {
          type: 'string',
          description: 'Field to explore (e.g., "carrier_name", "destination_state")'
        },
        sample_size: {
          type: 'number',
          description: 'Number of top values to return (default: 15)'
        },
        include_nulls: {
          type: 'boolean',
          description: 'Include null/empty analysis (default: true)'
        }
      },
      required: ['field_name']
    }
  },
  {
    name: 'preview_aggregation',
    description: `Preview what an aggregation looks like with REAL DATA.
Use this to validate groupings and see actual numbers before adding to report.
Returns: actual aggregated values, group counts, insights about the data.`,
    parameters: {
      type: 'object',
      properties: {
        group_by: {
          type: 'string',
          description: 'Field to group by'
        },
        metric: {
          type: 'string',
          description: 'Field to aggregate'
        },
        aggregation: {
          type: 'string',
          description: 'Aggregation type',
          enum: ['sum', 'avg', 'count', 'countDistinct', 'min', 'max']
        },
        secondary_group_by: {
          type: 'string',
          description: 'Optional second grouping field'
        },
        filters: {
          type: 'array',
          description: 'Optional filters to apply',
          items: { type: 'object' }
        },
        limit: {
          type: 'number',
          description: 'Max groups to return (default: 15)'
        },
        sort: {
          type: 'string',
          description: 'Sort direction',
          enum: ['desc', 'asc']
        }
      },
      required: ['group_by', 'metric', 'aggregation']
    }
  },
  {
    name: 'compare_periods',
    description: `Compare a metric across two time periods.
Use for trend analysis, period-over-period comparisons.
Returns: values for both periods, change %, insights about significance.`,
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Metric to compare'
        },
        aggregation: {
          type: 'string',
          description: 'How to aggregate',
          enum: ['sum', 'avg', 'count', 'countDistinct']
        },
        period1: {
          type: 'string',
          description: 'First period (e.g., "last30", "2024-Q3")'
        },
        period2: {
          type: 'string',
          description: 'Second period to compare against'
        },
        group_by: {
          type: 'string',
          description: 'Optional grouping for breakdown'
        }
      },
      required: ['metric', 'aggregation', 'period1', 'period2']
    }
  },
  {
    name: 'detect_anomalies',
    description: `Automatically detect anomalies in the data.
Finds spikes, drops, outliers, and unusual patterns.`,
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Metric to analyze for anomalies'
        },
        group_by: {
          type: 'string',
          description: 'Optional grouping (e.g., find anomalies per carrier)'
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['high', 'medium', 'low']
        },
        baseline: {
          type: 'string',
          description: 'What to compare against',
          enum: ['historical_avg', 'previous_period', 'peer_group']
        }
      },
      required: ['metric']
    }
  },
  {
    name: 'investigate_cause',
    description: `Perform root cause analysis for an observed issue.
Drills down into data to find contributing factors.`,
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to investigate'
        },
        metric: {
          type: 'string',
          description: 'Primary metric involved'
        },
        context: {
          type: 'object',
          description: 'Additional context (filters, time range, etc.)'
        },
        max_depth: {
          type: 'number',
          description: 'How many levels deep to investigate (default: 3)'
        }
      },
      required: ['question', 'metric']
    }
  },
  {
    name: 'create_report_draft',
    description: `Start a new report draft with metadata.
Always call this first before adding sections.`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Report title'
        },
        description: {
          type: 'string',
          description: 'Report description'
        },
        theme: {
          type: 'string',
          description: 'Color theme',
          enum: ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'slate']
        },
        date_range: {
          type: 'string',
          description: 'Date range preset',
          enum: ['last7', 'last30', 'last90', 'last6months', 'ytd', 'lastYear', 'all']
        }
      },
      required: ['name']
    }
  },
  {
    name: 'add_section',
    description: `Add a section to the report WITH IMMEDIATE DATA PREVIEW.
The section is executed against real data and results are returned.`,
    parameters: {
      type: 'object',
      properties: {
        section_type: {
          type: 'string',
          description: 'Type of section',
          enum: ['hero', 'stat-row', 'chart', 'table', 'map', 'header', 'category-grid']
        },
        title: {
          type: 'string',
          description: 'Section title'
        },
        config: {
          type: 'object',
          description: 'Section configuration (varies by type)'
        },
        position: {
          type: 'number',
          description: 'Position in report (omit to append)'
        },
        generate_insight: {
          type: 'boolean',
          description: 'Generate AI insight for this section (default: true)'
        }
      },
      required: ['section_type', 'config']
    }
  },
  {
    name: 'modify_section',
    description: `Modify an existing section and re-preview.`,
    parameters: {
      type: 'object',
      properties: {
        section_index: {
          type: 'number',
          description: 'Index of section to modify (0-based)'
        },
        updates: {
          type: 'object',
          description: 'Properties to update'
        },
        regenerate_insight: {
          type: 'boolean',
          description: 'Regenerate insight after modification'
        }
      },
      required: ['section_index', 'updates']
    }
  },
  {
    name: 'remove_section',
    description: `Remove a section from the report.`,
    parameters: {
      type: 'object',
      properties: {
        section_index: {
          type: 'number',
          description: 'Index of section to remove (0-based)'
        }
      },
      required: ['section_index']
    }
  },
  {
    name: 'reorder_sections',
    description: `Reorder sections in the report.`,
    parameters: {
      type: 'object',
      properties: {
        new_order: {
          type: 'array',
          description: 'Array of section indices in new order',
          items: { type: 'number' }
        }
      },
      required: ['new_order']
    }
  },
  {
    name: 'preview_report',
    description: `Execute and preview the entire report with real data.`,
    parameters: {
      type: 'object',
      properties: {
        include_insights: {
          type: 'boolean',
          description: 'Generate insights for each section'
        },
        include_narrative: {
          type: 'boolean',
          description: 'Generate executive narrative'
        }
      },
      required: []
    }
  },
  {
    name: 'finalize_report',
    description: `Finalize the report and mark as ready to save.`,
    parameters: {
      type: 'object',
      properties: {
        generate_narrative: {
          type: 'boolean',
          description: 'Include AI-generated narrative (default: true)'
        },
        summary: {
          type: 'string',
          description: 'Brief conversational summary for user'
        }
      },
      required: ['summary']
    }
  },
  {
    name: 'learn_terminology',
    description: `Record customer-specific terminology.`,
    parameters: {
      type: 'object',
      properties: {
        term: {
          type: 'string',
          description: 'The term/abbreviation used by customer'
        },
        meaning: {
          type: 'string',
          description: 'What it means'
        },
        maps_to_field: {
          type: 'string',
          description: 'Database field this relates to'
        },
        maps_to_filter: {
          type: 'object',
          description: 'Filter to apply when this term is used'
        },
        confidence: {
          type: 'string',
          description: 'How confident are you?',
          enum: ['high', 'medium', 'low']
        }
      },
      required: ['term', 'meaning', 'confidence']
    }
  },
  {
    name: 'learn_preference',
    description: `Record a user preference for future use.`,
    parameters: {
      type: 'object',
      properties: {
        preference_type: {
          type: 'string',
          description: 'Type of preference',
          enum: ['chart_type', 'sort_order', 'grouping', 'theme', 'detail_level', 'metric']
        },
        key: {
          type: 'string',
          description: 'What the preference is about'
        },
        value: {
          type: 'string',
          description: 'The preferred value'
        },
        context: {
          type: 'string',
          description: 'When this preference applies'
        }
      },
      required: ['preference_type', 'key', 'value']
    }
  },
  {
    name: 'record_correction',
    description: `Record when user corrects the AI.`,
    parameters: {
      type: 'object',
      properties: {
        original: {
          type: 'string',
          description: 'What AI said/did'
        },
        corrected: {
          type: 'string',
          description: 'What user wanted'
        },
        context: {
          type: 'string',
          description: 'Full context of the correction'
        },
        apply_immediately: {
          type: 'boolean',
          description: 'Apply to current report? (default: true)'
        }
      },
      required: ['original', 'corrected', 'context']
    }
  },
  {
    name: 'get_customer_memory',
    description: `Retrieve what we've learned about this customer.`,
    parameters: {
      type: 'object',
      properties: {
        include_terminology: {
          type: 'boolean',
          description: 'Include learned terminology'
        },
        include_preferences: {
          type: 'boolean',
          description: 'Include preferences'
        },
        include_history: {
          type: 'boolean',
          description: 'Include recent corrections'
        }
      },
      required: []
    }
  },
  {
    name: 'generate_insight',
    description: `Generate an insight about specific data.`,
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'The data to analyze'
        },
        context: {
          type: 'string',
          description: 'What question this answers'
        },
        comparison_type: {
          type: 'string',
          description: 'Type of comparison',
          enum: ['period', 'peer', 'target', 'trend', 'benchmark']
        },
        audience: {
          type: 'string',
          description: 'Who is this for?',
          enum: ['executive', 'analyst', 'operations']
        }
      },
      required: ['data', 'context']
    }
  },
  {
    name: 'generate_recommendation',
    description: `Generate actionable recommendation from data.`,
    parameters: {
      type: 'object',
      properties: {
        finding: {
          type: 'string',
          description: 'The finding that prompts the recommendation'
        },
        data_support: {
          type: 'object',
          description: 'Data supporting the recommendation'
        },
        action_type: {
          type: 'string',
          description: 'Type of action',
          enum: ['negotiate', 'investigate', 'monitor', 'change', 'escalate']
        },
        urgency: {
          type: 'string',
          description: 'How urgent',
          enum: ['immediate', 'this_week', 'this_month', 'next_quarter']
        }
      },
      required: ['finding', 'data_support', 'action_type']
    }
  },
  {
    name: 'ask_clarification',
    description: `Ask user for clarification when request is ambiguous.`,
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The clarifying question'
        },
        options: {
          type: 'array',
          description: 'Suggested options (if applicable)',
          items: { type: 'string' }
        },
        context: {
          type: 'string',
          description: 'Why you need this clarification'
        },
        default_if_no_response: {
          type: 'string',
          description: 'What you\'ll assume if no response'
        }
      },
      required: ['question']
    }
  },
  {
    name: 'confirm_understanding',
    description: `Confirm your interpretation before proceeding.`,
    parameters: {
      type: 'object',
      properties: {
        interpretation: {
          type: 'string',
          description: 'Your interpretation of the request'
        },
        planned_actions: {
          type: 'array',
          description: 'What you plan to do',
          items: { type: 'string' }
        },
        assumptions: {
          type: 'array',
          description: 'Assumptions you\'re making',
          items: { type: 'string' }
        }
      },
      required: ['interpretation']
    }
  }
];

export function getToolsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: object;
}> {
  return INVESTIGATOR_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

export function getToolsByCategory(): Record<string, ToolDefinition[]> {
  return {
    exploration: INVESTIGATOR_TOOLS.filter(t =>
      ['explore_field', 'preview_aggregation', 'compare_periods', 'detect_anomalies', 'investigate_cause'].includes(t.name)
    ),
    building: INVESTIGATOR_TOOLS.filter(t =>
      ['create_report_draft', 'add_section', 'modify_section', 'remove_section', 'reorder_sections', 'preview_report', 'finalize_report'].includes(t.name)
    ),
    learning: INVESTIGATOR_TOOLS.filter(t =>
      ['learn_terminology', 'learn_preference', 'record_correction', 'get_customer_memory'].includes(t.name)
    ),
    narrative: INVESTIGATOR_TOOLS.filter(t =>
      ['generate_insight', 'generate_recommendation'].includes(t.name)
    ),
    clarification: INVESTIGATOR_TOOLS.filter(t =>
      ['ask_clarification', 'confirm_understanding'].includes(t.name)
    )
  };
}
