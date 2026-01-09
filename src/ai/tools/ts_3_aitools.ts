// ============================================================================
// TYPESCRIPT FILE 3 OF 4: aiTools.ts
// Location: Add to supabase/functions/generate-report/index.ts
// Action: ADD THIS EXPORT (or replace existing AI_TOOLS)
// ============================================================================

export const AI_TOOLS = [
  // MCP DISCOVERY
  { name: "discover_tables", description: "List available database tables. Call first to see what data exists.",
    input_schema: { type: "object", properties: {
      category: { type: "string", enum: ["core", "reference", "analytics"], description: "Filter by category" },
      include_row_counts: { type: "boolean", description: "Include row counts (slower)" }
    }, required: [] }},

  { name: "discover_fields", description: "Get all fields for a table with types and AI instructions.",
    input_schema: { type: "object", properties: {
      table_name: { type: "string", description: "Table name (e.g., 'shipment', 'shipment_item')" },
      include_samples: { type: "boolean", description: "Include sample values" }
    }, required: ["table_name"] }},

  { name: "discover_joins", description: "Get relationships between tables.",
    input_schema: { type: "object", properties: {
      table_name: { type: "string", description: "Table to find joins for" }
    }, required: ["table_name"] }},

  // MCP QUERIES
  { name: "query_table", description: "Query any table with filters, grouping, aggregation. Customer filtering automatic.",
    input_schema: { type: "object", properties: {
      table_name: { type: "string", description: "Table to query" },
      select: { type: "array", items: { type: "string" }, description: "Fields to select" },
      filters: { type: "array", items: { type: "object", properties: {
        field: { type: "string" }, operator: { type: "string", enum: ["eq","neq","gt","gte","lt","lte","ilike","like","in","not_in","between","is_null","is_not_null"] }, value: {}
      }, required: ["field","operator","value"] }},
      group_by: { type: "array", items: { type: "string" } },
      aggregations: { type: "array", items: { type: "object", properties: {
        field: { type: "string" }, function: { type: "string", enum: ["sum","avg","min","max","count"] }, alias: { type: "string" }
      }, required: ["field","function"] }},
      order_by: { type: "string" }, order_dir: { type: "string", enum: ["asc","desc"] }, limit: { type: "number" }
    }, required: ["table_name"] }},

  { name: "search_text", description: "Search for text across multiple tables. Returns where matches are found.",
    input_schema: { type: "object", properties: {
      query: { type: "string", description: "Text to search for" },
      tables: { type: "array", items: { type: "string" }, description: "Limit to specific tables" },
      fields: { type: "array", items: { type: "string" }, description: "Limit to specific fields" },
      match_type: { type: "string", enum: ["contains","exact","starts_with","ends_with"] },
      limit: { type: "number" }
    }, required: ["query"] }},

  { name: "query_with_join", description: "Query across multiple tables with joins.",
    input_schema: { type: "object", properties: {
      base_table: { type: "string", description: "Primary table" },
      joins: { type: "array", items: { type: "object", properties: {
        table: { type: "string" }, type: { type: "string", enum: ["left","inner"] }, on: { type: "string", description: "Custom join condition" }
      }, required: ["table"] }},
      select: { type: "array", items: { type: "string" } },
      filters: { type: "array" },
      group_by: { type: "array", items: { type: "string" } },
      aggregations: { type: "array" },
      order_by: { type: "string" }, limit: { type: "number" }
    }, required: ["base_table","joins"] }},

  { name: "aggregate", description: "Simple group-by aggregation.",
    input_schema: { type: "object", properties: {
      table_name: { type: "string" }, group_by: { type: "string" }, metric: { type: "string" },
      aggregation: { type: "string", enum: ["sum","avg","min","max","count"] },
      filters: { type: "array" }, limit: { type: "number" }
    }, required: ["table_name","group_by","metric","aggregation"] }},

  // LEGACY
  { name: "explore_field", description: "[Legacy] Get distinct values for a field.",
    input_schema: { type: "object", properties: { field_name: { type: "string" }, sample_size: { type: "number" } }, required: ["field_name"] }},

  { name: "preview_aggregation", description: "[Legacy] Preview an aggregation.",
    input_schema: { type: "object", properties: { group_by: { type: "string" }, metric: { type: "string" }, aggregation: { type: "string" }, limit: { type: "number" } }, required: ["group_by","metric"] }},

  { name: "compare_periods", description: "Compare metrics between two time periods.",
    input_schema: { type: "object", properties: {
      metric: { type: "string" }, aggregation: { type: "string" },
      period1: { type: "string", enum: ["last7","last30","last90","last6months","lastYear"] },
      period2: { type: "string", enum: ["last7","last30","last90","last6months","lastYear"] },
      table_name: { type: "string" }
    }, required: ["metric","aggregation","period1","period2"] }},

  { name: "detect_anomalies", description: "Detect statistical anomalies in metrics.",
    input_schema: { type: "object", properties: { metric: { type: "string" }, group_by: { type: "string" }, table_name: { type: "string" } }, required: ["metric"] }},

  // REPORT BUILDING
  { name: "create_report_draft", description: "Start a new report draft.",
    input_schema: { type: "object", properties: {
      name: { type: "string" }, description: { type: "string" },
      theme: { type: "string", enum: ["blue","green","purple","orange"] },
      date_range: { type: "string", enum: ["last7","last30","last90","last6months","lastYear","custom"] }
    }, required: ["name"] }},

  { name: "add_section", description: "Add a section to the report.",
    input_schema: { type: "object", properties: {
      section_type: { type: "string", enum: ["hero","stat-row","chart","table","map","category-grid"] },
      title: { type: "string" },
      config: { type: "object", properties: { groupBy: { type: "string" }, metric: { type: "string" }, aggregation: { type: "string" }, chartType: { type: "string" } }},
      position: { type: "number" }
    }, required: ["section_type"] }},

  { name: "modify_section", description: "Modify an existing section.",
    input_schema: { type: "object", properties: { section_index: { type: "number" }, updates: { type: "object" } }, required: ["section_index","updates"] }},

  { name: "remove_section", description: "Remove a section.",
    input_schema: { type: "object", properties: { section_index: { type: "number" } }, required: ["section_index"] }},

  { name: "finalize_report", description: "Finalize the report draft.",
    input_schema: { type: "object", properties: { summary: { type: "string" } }, required: [] }},

  // LEARNING
  { name: "learn_terminology", description: "Learn customer terminology.",
    input_schema: { type: "object", properties: {
      term: { type: "string" }, meaning: { type: "string" }, maps_to_field: { type: "string" },
      maps_to_filter: { type: "object" }, confidence: { type: "string", enum: ["low","medium","high"] }
    }, required: ["term","meaning"] }},

  { name: "learn_preference", description: "Learn customer preferences.",
    input_schema: { type: "object", properties: {
      preference_type: { type: "string", enum: ["grouping","metric","chart_type","format"] },
      key: { type: "string" }, value: { type: "string" }, context: { type: "string" }
    }, required: ["preference_type","key","value"] }},

  { name: "ask_clarification", description: "Ask a clarifying question.",
    input_schema: { type: "object", properties: {
      question: { type: "string" }, options: { type: "array", items: { type: "string" } },
      context: { type: "string" }, default_if_no_response: { type: "string" }
    }, required: ["question"] }}
];
