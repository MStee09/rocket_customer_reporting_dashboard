import { ToolDefinition } from './types';

export const AI_TOOLS: ToolDefinition[] = [
  {
    name: 'explore_field',
    description: 'Explore a data field to understand its values, distribution, and data quality. Use this before building reports to ensure fields have data.',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'The name of the field to explore (e.g., "carrier_name", "destination_state")'
        },
        sampleSize: {
          type: 'number',
          description: 'Number of sample values to retrieve (default: 10)'
        }
      },
      required: ['fieldName']
    }
  },
  {
    name: 'preview_grouping',
    description: 'Preview what a grouping would look like with actual data. Use this to validate that a groupBy field makes sense before adding it to a report.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          description: 'The field to group by'
        },
        metric: {
          type: 'string',
          description: 'The field to aggregate'
        },
        aggregation: {
          type: 'string',
          description: 'How to aggregate: sum, avg, count, countDistinct, min, max',
          enum: ['sum', 'avg', 'count', 'countDistinct', 'min', 'max']
        },
        limit: {
          type: 'number',
          description: 'Number of groups to preview (default: 10)'
        }
      },
      required: ['groupBy', 'metric', 'aggregation']
    }
  },
  {
    name: 'get_schema_info',
    description: 'Get information about available fields including their data types, whether they can be grouped or aggregated, and business context.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by field category',
          enum: ['dimension', 'measure', 'date', 'identifier', 'all']
        },
        searchTerm: {
          type: 'string',
          description: 'Search for fields by name or description'
        }
      },
      required: []
    }
  },
  {
    name: 'get_field_relationships',
    description: 'Get relationships between fields to understand how they can be used together (e.g., origin_state + destination_state form a lane).',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'Get relationships for a specific field, or omit for all relationships'
        }
      },
      required: []
    }
  },
  {
    name: 'get_customer_context',
    description: 'Load customer-specific context including their terminology, product categories, priorities, and preferences.',
    parameters: {
      type: 'object',
      properties: {
        includePreferences: {
          type: 'boolean',
          description: 'Include learned preferences (chart types, sort orders, etc.)'
        },
        includeTerminology: {
          type: 'boolean',
          description: 'Include customer-specific terminology mappings'
        },
        includeProducts: {
          type: 'boolean',
          description: 'Include product category definitions'
        }
      },
      required: []
    }
  },
  {
    name: 'search_knowledge',
    description: 'Search the knowledge base for relevant information. Use this when you need business context, definitions, or reference information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - what information are you looking for?'
        },
        category: {
          type: 'string',
          description: 'Limit search to a specific category',
          enum: ['customer_info', 'product_catalog', 'business_rules', 'data_dictionary', 'industry_reference', 'sop', 'all']
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 3)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'suggest_visualization',
    description: 'Get AI-powered suggestions for the best visualization type based on the data characteristics.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          description: 'The field being grouped by'
        },
        metric: {
          type: 'string',
          description: 'The metric being displayed'
        },
        aggregation: {
          type: 'string',
          description: 'The aggregation type'
        },
        uniqueValueCount: {
          type: 'number',
          description: 'Approximate number of unique values in groupBy field'
        },
        isTimeSeries: {
          type: 'boolean',
          description: 'Whether the groupBy field is a date/time'
        }
      },
      required: ['groupBy', 'metric']
    }
  },
  {
    name: 'add_report_section',
    description: 'Add a new section to the report being built. The report is built incrementally - add sections one at a time.',
    parameters: {
      type: 'object',
      properties: {
        sectionType: {
          type: 'string',
          description: 'Type of section to add',
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
          description: 'Position in report (0-indexed). Omit to add at end.'
        }
      },
      required: ['sectionType', 'config']
    }
  },
  {
    name: 'modify_report_section',
    description: 'Modify an existing section in the report.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndex: {
          type: 'number',
          description: 'Index of the section to modify (0-indexed)'
        },
        updates: {
          type: 'object',
          description: 'Properties to update'
        }
      },
      required: ['sectionIndex', 'updates']
    }
  },
  {
    name: 'remove_report_section',
    description: 'Remove a section from the report.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndex: {
          type: 'number',
          description: 'Index of the section to remove (0-indexed)'
        }
      },
      required: ['sectionIndex']
    }
  },
  {
    name: 'set_report_metadata',
    description: 'Set report-level metadata like name, description, theme, and date range.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Report name'
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
        dateRangeType: {
          type: 'string',
          description: 'Date range preset',
          enum: ['last7', 'last30', 'last90', 'last6months', 'ytd', 'lastYear', 'all']
        }
      },
      required: []
    }
  },
  {
    name: 'validate_report',
    description: 'Validate the current report configuration to ensure it will execute correctly.',
    parameters: {
      type: 'object',
      properties: {
        autoFix: {
          type: 'boolean',
          description: 'Attempt to automatically fix minor issues'
        }
      },
      required: []
    }
  },
  {
    name: 'execute_preview',
    description: 'Execute the current report and preview the results. Use this to show the user what the report looks like with real data.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndices: {
          type: 'array',
          items: { type: 'number' },
          description: 'Specific sections to preview. Omit to preview all.'
        }
      },
      required: []
    }
  },
  {
    name: 'build_widget_config',
    description: 'Build a widget configuration for the Visual Builder. Call this when you have determined the best visualization configuration based on the user request and available data.',
    parameters: {
      type: 'object',
      properties: {
        visualizationType: {
          type: 'string',
          description: 'Chart type',
          enum: ['bar', 'line', 'pie', 'area', 'kpi', 'table', 'choropleth', 'flow', 'histogram', 'scatter', 'treemap', 'funnel']
        },
        xField: {
          type: 'string',
          description: 'X-axis / grouping field - must be a valid field from get_schema_info'
        },
        yField: {
          type: 'string',
          description: 'Y-axis / value field for aggregation (omit for count)'
        },
        aggregation: {
          type: 'string',
          description: 'How to aggregate values',
          enum: ['sum', 'avg', 'count', 'min', 'max']
        },
        groupBy: {
          type: 'string',
          description: 'Optional secondary grouping for series'
        },
        filters: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of filter conditions'
        },
        title: {
          type: 'string',
          description: 'Suggested title for the widget'
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of why this configuration was chosen'
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any warnings or limitations'
        },
        alternatives: {
          type: 'array',
          items: { type: 'object' },
          description: 'Alternative configuration suggestions'
        },
        previewData: {
          type: 'array',
          items: { type: 'object' },
          description: 'Sample data preview if available from preview_grouping'
        }
      },
      required: ['visualizationType', 'xField', 'aggregation', 'reasoning']
    }
  }
];

export function getToolDefinitionsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: object;
}> {
  return AI_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}
