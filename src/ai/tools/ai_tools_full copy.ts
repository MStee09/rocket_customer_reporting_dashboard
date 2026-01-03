// AI_TOOLS - Full Implementation
// Replace the existing AI_TOOLS array in generate-report/index.ts with this

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

export const AI_TOOLS: Anthropic.Tool[] = [
  // ==========================================
  // EXPLORATION TOOLS
  // ==========================================
  {
    name: "explore_field",
    description: `Explore a data field to understand its values, distribution, and quality.
ALWAYS use this before referencing a field in reports.
Returns: unique values, coverage %, top values with counts, data quality assessment.`,
    input_schema: {
      type: "object" as const,
      properties: {
        field_name: { 
          type: "string", 
          description: "Field to explore (e.g., 'carrier_name', 'destination_state')" 
        },
        sample_size: { 
          type: "number", 
          description: "Number of top values to return (default: 15)" 
        },
        include_nulls: { 
          type: "boolean", 
          description: "Include null/empty analysis (default: true)" 
        }
      },
      required: ["field_name"]
    }
  },
  {
    name: "preview_aggregation",
    description: `Preview what an aggregation looks like with REAL DATA.
Use this to validate groupings and see actual numbers before adding to report.
Returns: actual aggregated values, group counts, visualization suggestions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        group_by: { 
          type: "string", 
          description: "Field to group by" 
        },
        metric: { 
          type: "string", 
          description: "Field to aggregate" 
        },
        aggregation: { 
          type: "string", 
          enum: ["sum", "avg", "count", "countDistinct", "min", "max"],
          description: "Aggregation type" 
        },
        secondary_group_by: { 
          type: "string", 
          description: "Optional second grouping field" 
        },
        limit: { 
          type: "number", 
          description: "Max groups to return (default: 15)" 
        },
        sort: { 
          type: "string", 
          enum: ["desc", "asc"],
          description: "Sort direction" 
        }
      },
      required: ["group_by", "metric", "aggregation"]
    }
  },
  {
    name: "compare_periods",
    description: `Compare a metric across two time periods.
Use for trend analysis, period-over-period comparisons.
Returns: values for both periods, change %, significance assessment.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { 
          type: "string", 
          description: "Metric to compare" 
        },
        aggregation: { 
          type: "string", 
          enum: ["sum", "avg", "count", "countDistinct"],
          description: "How to aggregate" 
        },
        period1: { 
          type: "string", 
          description: "First period (e.g., 'last30', 'last90')" 
        },
        period2: { 
          type: "string", 
          description: "Second period to compare against" 
        },
        group_by: { 
          type: "string", 
          description: "Optional grouping for breakdown" 
        }
      },
      required: ["metric", "aggregation", "period1", "period2"]
    }
  },
  {
    name: "detect_anomalies",
    description: `Automatically detect anomalies in the data.
Finds spikes, drops, outliers, and unusual patterns using statistical analysis.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { 
          type: "string", 
          description: "Metric to analyze for anomalies" 
        },
        group_by: { 
          type: "string", 
          description: "Optional grouping (e.g., find anomalies per carrier)" 
        },
        sensitivity: { 
          type: "string", 
          enum: ["high", "medium", "low"],
          description: "Detection sensitivity (high = more anomalies detected)" 
        },
        baseline: { 
          type: "string", 
          enum: ["historical_avg", "previous_period", "peer_group"],
          description: "What to compare against" 
        }
      },
      required: ["metric"]
    }
  },
  {
    name: "investigate_cause",
    description: `Perform root cause analysis for an observed issue.
Drills down into data across multiple dimensions to find contributing factors.`,
    input_schema: {
      type: "object" as const,
      properties: {
        question: { 
          type: "string", 
          description: "The question to investigate (e.g., 'Why did costs increase?')" 
        },
        metric: { 
          type: "string", 
          description: "Primary metric involved" 
        },
        context: { 
          type: "object", 
          description: "Additional context (filters, time range, etc.)" 
        },
        max_depth: { 
          type: "number", 
          description: "How many dimensions to analyze (default: 3)" 
        }
      },
      required: ["question", "metric"]
    }
  },

  // ==========================================
  // REPORT BUILDING TOOLS
  // ==========================================
  {
    name: "create_report_draft",
    description: `Start a new report draft with metadata.
Call this first before adding sections. Sets up the report structure.`,
    input_schema: {
      type: "object" as const,
      properties: {
        name: { 
          type: "string", 
          description: "Report title" 
        },
        description: { 
          type: "string", 
          description: "Report description" 
        },
        theme: { 
          type: "string", 
          enum: ["blue", "green", "orange", "purple", "red", "teal", "slate"],
          description: "Color theme" 
        },
        date_range: { 
          type: "string", 
          enum: ["last7", "last30", "last90", "last6months", "ytd", "lastYear", "all"],
          description: "Date range preset" 
        }
      },
      required: ["name"]
    }
  },
  {
    name: "add_section",
    description: `Add a section to the report WITH IMMEDIATE DATA PREVIEW.
The section is executed against real data and results are returned.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_type: { 
          type: "string", 
          enum: ["hero", "stat-row", "chart", "table", "map", "header", "category-grid"],
          description: "Type of section" 
        },
        title: { 
          type: "string", 
          description: "Section title" 
        },
        config: { 
          type: "object", 
          description: "Section configuration (groupBy, metric, chartType, etc.)" 
        },
        position: { 
          type: "number", 
          description: "Position in report (omit to append)" 
        },
        generate_insight: { 
          type: "boolean", 
          description: "Generate AI insight for this section (default: true)" 
        }
      },
      required: ["section_type", "config"]
    }
  },
  {
    name: "modify_section",
    description: `Modify an existing section and re-preview the results.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_index: { 
          type: "number", 
          description: "Index of section to modify (0-based)" 
        },
        updates: { 
          type: "object", 
          description: "Properties to update" 
        },
        regenerate_insight: { 
          type: "boolean", 
          description: "Regenerate insight after modification" 
        }
      },
      required: ["section_index", "updates"]
    }
  },
  {
    name: "remove_section",
    description: `Remove a section from the report.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_index: { 
          type: "number", 
          description: "Index of section to remove (0-based)" 
        }
      },
      required: ["section_index"]
    }
  },
  {
    name: "reorder_sections",
    description: `Reorder sections in the report.`,
    input_schema: {
      type: "object" as const,
      properties: {
        new_order: { 
          type: "array", 
          items: { type: "number" },
          description: "Array of section indices in new order" 
        }
      },
      required: ["new_order"]
    }
  },
  {
    name: "preview_report",
    description: `Execute and preview the entire report with real data.
Useful for validating the report before finalizing.`,
    input_schema: {
      type: "object" as const,
      properties: {
        include_insights: { 
          type: "boolean", 
          description: "Generate insights for each section" 
        },
        include_narrative: { 
          type: "boolean", 
          description: "Generate executive narrative" 
        }
      },
      required: []
    }
  },
  {
    name: "finalize_report",
    description: `Finalize the report and mark as ready to save.
Call this when the report is complete and ready for the user.`,
    input_schema: {
      type: "object" as const,
      properties: {
        report: { 
          type: "object", 
          description: "The complete report definition (optional if using draft)" 
        },
        summary: { 
          type: "string", 
          description: "Brief conversational summary for user" 
        },
        generate_narrative: { 
          type: "boolean", 
          description: "Include AI-generated narrative (default: true)" 
        }
      },
      required: ["summary"]
    }
  },

  // ==========================================
  // LEARNING TOOLS
  // ==========================================
  {
    name: "learn_terminology",
    description: `Record customer-specific terminology for future conversations.
Use when the customer uses terms, abbreviations, or names that have specific meanings.`,
    input_schema: {
      type: "object" as const,
      properties: {
        term: { 
          type: "string", 
          description: "The term/abbreviation used by customer" 
        },
        meaning: { 
          type: "string", 
          description: "What it means" 
        },
        maps_to_field: { 
          type: "string", 
          description: "Database field this relates to" 
        },
        maps_to_filter: { 
          type: "object", 
          description: "Filter to apply when this term is used" 
        },
        confidence: { 
          type: "string", 
          enum: ["high", "medium", "low"],
          description: "How confident are you in this interpretation?" 
        }
      },
      required: ["term", "meaning", "confidence"]
    }
  },
  {
    name: "learn_preference",
    description: `Record a user preference for future use.
Remember how the user likes things done.`,
    input_schema: {
      type: "object" as const,
      properties: {
        preference_type: { 
          type: "string", 
          enum: ["chart_type", "sort_order", "grouping", "theme", "detail_level", "metric"],
          description: "Type of preference" 
        },
        key: { 
          type: "string", 
          description: "What the preference is about" 
        },
        value: { 
          type: "string", 
          description: "The preferred value" 
        },
        context: { 
          type: "string", 
          description: "When this preference applies" 
        }
      },
      required: ["preference_type", "key", "value"]
    }
  },
  {
    name: "record_correction",
    description: `Record when user corrects the AI to improve future responses.`,
    input_schema: {
      type: "object" as const,
      properties: {
        original: { 
          type: "string", 
          description: "What AI said/did" 
        },
        corrected: { 
          type: "string", 
          description: "What user wanted" 
        },
        context: { 
          type: "string", 
          description: "Full context of the correction" 
        },
        apply_immediately: { 
          type: "boolean", 
          description: "Apply to current report? (default: true)" 
        }
      },
      required: ["original", "corrected", "context"]
    }
  },
  {
    name: "get_customer_memory",
    description: `Retrieve what we've learned about this customer.
Use at conversation start to personalize responses.`,
    input_schema: {
      type: "object" as const,
      properties: {
        include_terminology: { 
          type: "boolean", 
          description: "Include learned terminology" 
        },
        include_preferences: { 
          type: "boolean", 
          description: "Include preferences" 
        },
        include_history: { 
          type: "boolean", 
          description: "Include recent corrections" 
        }
      },
      required: []
    }
  },

  // ==========================================
  // INSIGHT TOOLS
  // ==========================================
  {
    name: "generate_insight",
    description: `Generate an insight about specific data.
Creates a human-readable insight tailored to the audience.`,
    input_schema: {
      type: "object" as const,
      properties: {
        data: { 
          type: "object", 
          description: "The data to analyze" 
        },
        context: { 
          type: "string", 
          description: "What question this answers" 
        },
        comparison_type: { 
          type: "string", 
          enum: ["period", "peer", "target", "trend", "benchmark"],
          description: "Type of comparison" 
        },
        audience: { 
          type: "string", 
          enum: ["executive", "analyst", "operations"],
          description: "Who is this for?" 
        }
      },
      required: ["data", "context"]
    }
  },
  {
    name: "generate_recommendation",
    description: `Generate actionable recommendation from data findings.
Suggests specific actions based on analysis.`,
    input_schema: {
      type: "object" as const,
      properties: {
        finding: { 
          type: "string", 
          description: "The finding that prompts the recommendation" 
        },
        data_support: { 
          type: "object", 
          description: "Data supporting the recommendation" 
        },
        action_type: { 
          type: "string", 
          enum: ["negotiate", "investigate", "monitor", "change", "escalate"],
          description: "Type of action" 
        },
        urgency: { 
          type: "string", 
          enum: ["immediate", "this_week", "this_month", "next_quarter"],
          description: "How urgent" 
        }
      },
      required: ["finding", "data_support", "action_type"]
    }
  },

  // ==========================================
  // CLARIFICATION TOOLS
  // ==========================================
  {
    name: "ask_clarification",
    description: `Ask user for clarification when request is ambiguous.
Don't guess - ask!`,
    input_schema: {
      type: "object" as const,
      properties: {
        question: { 
          type: "string", 
          description: "The clarifying question" 
        },
        options: { 
          type: "array", 
          items: { type: "string" },
          description: "Suggested options (if applicable)" 
        },
        context: { 
          type: "string", 
          description: "Why you need this clarification" 
        },
        default_if_no_response: { 
          type: "string", 
          description: "What you'll assume if no response" 
        }
      },
      required: ["question"]
    }
  },
  {
    name: "confirm_understanding",
    description: `Confirm your interpretation before proceeding with complex requests.
Use for multi-step or ambiguous requests.`,
    input_schema: {
      type: "object" as const,
      properties: {
        interpretation: { 
          type: "string", 
          description: "Your interpretation of the request" 
        },
        planned_actions: { 
          type: "array", 
          items: { type: "string" },
          description: "What you plan to do" 
        },
        assumptions: { 
          type: "array", 
          items: { type: "string" },
          description: "Assumptions you're making" 
        }
      },
      required: ["interpretation"]
    }
  }
];

// Tool behavior prompt to add to system prompt
export const TOOL_BEHAVIOR_PROMPT = `## TOOL USAGE BEHAVIOR

You have powerful tools to help analyze data and build reports. Use them wisely:

### Exploration Tools
- **explore_field**: ALWAYS use before referencing any field. Verifies data exists and shows distribution.
- **preview_aggregation**: Validate groupings with real data before adding to reports.
- **compare_periods**: For trend analysis and period-over-period comparisons.
- **detect_anomalies**: Find unusual patterns, spikes, or outliers automatically.
- **investigate_cause**: Drill down to find root causes of issues.

### Report Building Tools
- **create_report_draft**: Start a new report (call once at beginning).
- **add_section**: Add sections with IMMEDIATE preview of real data.
- **modify_section** / **remove_section** / **reorder_sections**: Edit the report.
- **preview_report**: See the full report with all data populated.
- **finalize_report**: Mark report as complete and ready to save.

### Learning Tools
- **learn_terminology**: When user uses specific terms, save them for future.
- **learn_preference**: Remember how user likes things (chart types, sorting, etc.).
- **record_correction**: When corrected, save it to improve.
- **get_customer_memory**: Check what we know about this customer.

### Insight Tools
- **generate_insight**: Create human-readable insights from data.
- **generate_recommendation**: Suggest specific actions based on findings.

### Clarification Tools
- **ask_clarification**: When request is ambiguous, ASK don't guess.
- **confirm_understanding**: For complex requests, confirm before proceeding.

### Best Practices
1. ALWAYS explore data before building reports
2. Use preview_aggregation to validate numbers look right
3. Learn terminology when users use specific terms
4. For complex requests, confirm understanding first
5. Generate insights to add value beyond raw numbers`;
