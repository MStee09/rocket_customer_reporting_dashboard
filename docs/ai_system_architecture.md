# AI System Architecture & Anomaly Detection

## Overview

This document describes the AI-powered analytics system for Go Rocket Shipping's customer reporting dashboard. The system consists of several interconnected components that work together to provide intelligent insights, error tracking, and proactive anomaly detection.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [AI Investigator (MCP System)](#ai-investigator-mcp-system)
3. [Error Queue System](#error-queue-system)
4. [Field Discovery System](#field-discovery-system)
5. [Anomaly Detection System](#anomaly-detection-system)
6. [Configuration Guide](#configuration-guide)
7. [Deployment Guide](#deployment-guide)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                                                                              │
│  CUSTOMER VIEW                          │    ADMIN VIEW                      │
│  ┌────────────────────────────┐         │    ┌────────────────────────────┐ │
│  │ Pulse Dashboard            │         │    │ Admin Dashboard            │ │
│  │ ├─ UnifiedInsightsCard     │         │    │ ├─ AdminAnomalyInsights    │ │
│  │ ├─ AnomalyAlerts           │         │    │ ├─ AnomalyDetectionPanel   │ │
│  │ └─ AI Studio (Chat)        │         │    │ └─ CustomerHealthMatrix    │ │
│  └────────────────────────────┘         │    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EDGE FUNCTIONS                                  │
│  ┌─────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │ investigate     │  │ run-anomaly-        │  │ generate-report         │ │
│  │ (AI Chat)       │  │ detection           │  │ send-report-email       │ │
│  └────────┬────────┘  └──────────┬──────────┘  └─────────────────────────┘ │
└───────────┼──────────────────────┼──────────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PostgreSQL)                               │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ MCP Functions       │  │ Anomaly Tables      │  │ Supporting Tables   │ │
│  │ • mcp_query_table   │  │ • detected_anomalies│  │ • ai_error_log      │ │
│  │ • mcp_query_with_   │  │ • anomaly_detection │  │ • ai_knowledge      │ │
│  │   join              │  │   _config           │  │ • mcp_field_        │ │
│  │ • mcp_aggregate     │  │                     │  │   metadata          │ │
│  │ • mcp_find_field    │  │                     │  │                     │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Investigator (MCP System)

### Purpose
The AI Investigator allows users to ask natural language questions about their shipping data. It uses Claude AI with a Model Context Protocol (MCP) to query the database intelligently.

### Key Components

#### Edge Function: `investigate/index.ts`
- **Location**: `supabase/functions/investigate/index.ts`
- **Purpose**: Handles AI chat requests, executes database queries via MCP tools

#### MCP Tools Available

| Tool | Purpose |
|------|---------|
| `discover_tables` | List available database tables |
| `discover_fields` | Get fields for a specific table |
| `discover_joins` | Get join relationships between tables |
| `find_field` | Locate which table contains a specific field |
| `search_text` | Search for text across searchable fields |
| `query_table` | Query a single table with filters/aggregations |
| `query_with_join` | Query across multiple tables with joins |
| `aggregate` | Simple group-by aggregations |
| `get_lanes` | Get top shipping lanes |

### How It Works

```
User asks: "What's our spend by carrier?"
                    │
                    ▼
┌─────────────────────────────────────┐
│ 1. Context Compiler builds context  │
│    with relevant knowledge items    │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 2. Claude AI processes question     │
│    and selects appropriate tools    │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 3. MCP tools execute queries        │
│    against the database             │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 4. Results returned to user with    │
│    charts/tables as appropriate     │
└─────────────────────────────────────┘
```

---

## Error Queue System

### Purpose
Captures and displays AI query errors for admin review and knowledge base improvement.

### Components

#### Database Table: `ai_error_log`
```sql
- id (uuid)
- customer_id (integer)
- error_type (text): 'tool_error', 'query_error', 'validation_error'
- error_message (text)
- tool_name (text)
- tool_input (jsonb)
- question (text)
- created_at (timestamptz)
- status (text): 'new', 'reviewed', 'resolved'
```

#### UI Component: `ErrorQueueTab.tsx`
- **Location**: `src/components/knowledge-base/ErrorQueueTab.tsx`
- **Purpose**: Displays errors in Knowledge Base page for admin review

---

## Field Discovery System

### Purpose
Helps the AI locate which table contains a specific field when it encounters unfamiliar column names.

### Components

#### Database Table: `mcp_field_metadata`
```sql
- field_name (text)
- table_name (text)
- join_path (text): How to join to this table
- description (text)
```

#### Function: `mcp_find_field()`
Returns the table and join path for a given field name.

---

## Anomaly Detection System

### Purpose
Proactively scans customer data for statistical anomalies and surfaces them on dashboards.

### Anomaly Types

| Type | Description | Severity |
|------|-------------|----------|
| `spend_spike` | Daily spend significantly above baseline | warning/critical |
| `spend_drop` | Daily spend significantly below baseline | warning/critical |
| `volume_spike` | Shipment count spike | warning/critical |
| `volume_drop` | Shipment count drop | warning/critical |
| `concentration_risk` | >60% spend with single carrier | warning/critical |
| `new_lane` | First shipment to new origin/destination | info |

### Database Tables

#### `detected_anomalies`
```sql
- id (uuid)
- customer_id (integer)
- anomaly_type (text)
- severity (text): 'info', 'warning', 'critical'
- title (text)
- description (text)
- metric (text)
- current_value (numeric)
- baseline_value (numeric)
- change_percent (numeric)
- status (text): 'new', 'acknowledged', 'resolved', 'dismissed'
- detection_date (timestamptz)
- suggested_actions (jsonb)
```

#### `anomaly_detection_config`
```sql
- customer_id (integer, nullable for defaults)
- detect_spend_anomalies (boolean)
- detect_volume_anomalies (boolean)
- detect_concentration_risk (boolean)
- detect_lane_anomalies (boolean)
- spend_warning_threshold (numeric, default 2.0)
- spend_critical_threshold (numeric, default 3.0)
- volume_warning_threshold (numeric, default 2.0)
- volume_critical_threshold (numeric, default 3.0)
- concentration_risk_threshold (numeric, default 60)
- baseline_period_days (integer, default 30)
- comparison_period_days (integer, default 7)
- scan_frequency_hours (integer, default 24)
```

### SQL Functions

| Function | Purpose |
|----------|---------|
| `run_anomaly_scan_for_customer(customer_id, force)` | Scan single customer |
| `run_anomaly_scan_all_customers(force)` | Batch scan all customers |
| `get_anomaly_dashboard_summary(customer_id)` | Customer dashboard data |
| `get_admin_anomaly_summary()` | Admin cross-customer view |
| `cleanup_old_anomalies(retention_days)` | Remove old resolved anomalies |

### Frontend Components

#### Customer View
- **AnomalyAlerts** (`src/components/ai/AnomalyAlerts.tsx`)
  - Shows on Pulse Dashboard
  - Displays customer's own anomalies
  - Acknowledge/Dismiss/Investigate actions

#### Admin View
- **AdminAnomalyInsights** (`src/components/admin/AdminAnomalyInsights.tsx`)
  - Dark-themed card matching UnifiedInsightsCard style
  - Shows anomalies across ALL customers
  - "Run Scan" button to trigger detection
  - Click-through to customer view

- **AnomalyDetectionPanel** (`src/components/admin/AnomalyDetectionPanel.tsx`)
  - Expandable panel with summary stats
  - Lists customers with anomalies
  - Recent critical alerts

### Edge Function
- **run-anomaly-detection** (`supabase/functions/run-anomaly-detection/index.ts`)
  - Triggers scans via API
  - Can scan single customer or all customers
  - Designed for cron scheduling

---

## Configuration Guide

### Adjusting Detection Sensitivity

```sql
-- Make detection more sensitive (lower thresholds)
UPDATE anomaly_detection_config
SET 
  spend_warning_threshold = 1.5,    -- Default: 2.0
  spend_critical_threshold = 2.5,   -- Default: 3.0
  volume_warning_threshold = 1.5,   -- Default: 2.0
  volume_critical_threshold = 2.5,  -- Default: 3.0
  concentration_risk_threshold = 50 -- Default: 60
WHERE customer_id IS NULL;  -- Updates system defaults
```

### Customer-Specific Thresholds

```sql
INSERT INTO anomaly_detection_config (
  customer_id,
  spend_warning_threshold,
  concentration_risk_threshold
) VALUES (
  4533445,  -- Specific customer
  1.0,      -- More sensitive for this customer
  40        -- Lower concentration threshold
)
ON CONFLICT (customer_id) DO UPDATE SET
  spend_warning_threshold = EXCLUDED.spend_warning_threshold,
  concentration_risk_threshold = EXCLUDED.concentration_risk_threshold;
```

---

## Deployment Guide

### 1. Run Migrations

```bash
# Apply anomaly detection migration
psql $DATABASE_URL -f supabase/migrations/20260118190000_proactive_anomaly_detection_system.sql

# Apply fix for customer_id (if needed)
psql $DATABASE_URL -f supabase/migrations/20260118200100_fix_anomaly_destination_state.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy run-anomaly-detection
```

### 3. Schedule Automated Scans (Optional)

Use Supabase cron or external scheduler to call:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/run-anomaly-detection \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

---

## Testing Guide

### Test Single Customer Scan

```sql
-- Run scan for a specific customer
SELECT run_anomaly_scan_for_customer(4533445, true);

-- Check results
SELECT * FROM detected_anomalies 
WHERE customer_id = 4533445 
ORDER BY detection_date DESC;
```

### Test Batch Scan

```sql
-- Scan all customers
SELECT run_anomaly_scan_all_customers(true);

-- Check admin summary
SELECT get_admin_anomaly_summary();
```

### Test UI

1. **Admin Dashboard**: Login as admin → See AdminAnomalyInsights card
2. **Customer Pulse**: Impersonate customer → See AnomalyAlerts if anomalies exist
3. **Run Scan Button**: Click to trigger scan from UI

---

## Troubleshooting

### No Anomalies Detected

**Cause**: Data within normal statistical bounds

**Solutions**:
1. Check if customer has 30+ days of baseline data
2. Lower detection thresholds temporarily
3. Verify data exists in scan period:

```sql
SELECT COUNT(*), SUM(retail) 
FROM shipment 
WHERE customer_id = YOUR_CUSTOMER_ID
  AND pickup_date >= CURRENT_DATE - 37;
```

### "Customer not found" Error

**Cause**: Invalid customer_id passed to scan function

**Solution**: Verify customer exists:
```sql
SELECT customer_id, company_name FROM customer WHERE customer_id = YOUR_ID;
```

### Edge Function Errors

**Check logs**:
```bash
supabase functions logs run-anomaly-detection
```

### RPC Function Not Found

**Cause**: Migration not applied

**Solution**: Run the migration SQL in Supabase SQL Editor

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-18 | Initial anomaly detection system |
| 1.1 | 2026-01-18 | Fixed customer_id lookup, destination_state column |
