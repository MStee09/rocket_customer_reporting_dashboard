# Scheduled Reports Feature - Technical Documentation

## Overview

The Scheduled Reports feature allows users to automatically generate and deliver reports on a recurring schedule. Reports can be delivered via email (with PDF/CSV attachments) and/or in-app notifications.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT APP (Frontend)                     │
│                                                                 │
│   Components:                                                   │
│   - ScheduledReportsPage: List all scheduled reports            │
│   - ScheduleBuilderModal: Create/edit schedule configuration    │
│   - NotificationBell: Shows unread notification count           │
│   - NotificationDropdown: Lists recent notifications            │
│                                                                 │
│   User Actions:                                                 │
│   - Create scheduled report from any saved AI/Custom report     │
│   - Edit schedule timing, delivery options, recipients          │
│   - View execution history and status                           │
│   - Enable/disable schedules                                    │
│   - View and dismiss notifications                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                           │
│                                                                 │
│   DATABASE TABLES:                                              │
│   ├── scheduled_reports      (schedule configurations)         │
│   ├── scheduled_report_runs  (execution history)               │
│   └── notifications          (in-app notifications)            │
│                                                                 │
│   EDGE FUNCTIONS:                                               │
│   ├── run-scheduled-reports  (main executor, called by cron)   │
│   ├── generate-report-pdf    (creates PDF from report)         │
│   └── send-report-email      (sends via Resend)                │
│                                                                 │
│   CRON (pg_cron extension):                                     │
│   └── Runs every 15 minutes, triggers run-scheduled-reports    │
│                                                                 │
│   STORAGE:                                                      │
│   └── report-files bucket (stores generated PDFs/CSVs)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Call
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESEND (Email Service)                       │
│                                                                 │
│   - Sends emails with PDF/CSV attachments                       │
│   - Handles delivery, bounces, complaints                       │
│   - Free tier: 3,000 emails/month                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### scheduled_reports

Main configuration table for scheduled reports.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| customer_id | INTEGER | Links to customer |
| created_by | UUID | User who created the schedule |
| report_type | TEXT | 'ai_report' or 'custom_report' |
| report_id | TEXT | References the source report |
| report_name | TEXT | Cached name for display |
| name | TEXT | Schedule name |
| description | TEXT | Optional description |
| is_active | BOOLEAN | Whether schedule is active |
| frequency | TEXT | 'daily', 'weekly', 'monthly', 'quarterly' |
| timezone | TEXT | Timezone for scheduling (default: 'America/Chicago') |
| day_of_week | INTEGER | 0-6 for weekly schedules |
| day_of_month | INTEGER | 1-31 for monthly schedules |
| run_time | TIME | Time of day to run (default: '07:00') |
| date_range_type | TEXT | 'rolling', 'previous_week', 'previous_month', etc. |
| rolling_value | INTEGER | Number for rolling window |
| rolling_unit | TEXT | 'days', 'weeks', 'months' |
| delivery_email | BOOLEAN | Send via email |
| delivery_notification | BOOLEAN | Create in-app notification |
| email_recipients | TEXT[] | List of email addresses |
| email_subject | TEXT | Email subject template |
| email_body | TEXT | Email body template |
| format_pdf | BOOLEAN | Generate PDF |
| format_csv | BOOLEAN | Generate CSV |
| last_run_at | TIMESTAMPTZ | Last execution time |
| next_run_at | TIMESTAMPTZ | Next scheduled run |
| last_run_status | TEXT | 'success', 'failed', 'running' |
| last_run_error | TEXT | Error message if failed |
| run_count | INTEGER | Total number of runs |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### scheduled_report_runs

Execution history for each scheduled report run.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| scheduled_report_id | UUID | References scheduled_reports |
| started_at | TIMESTAMPTZ | When run started |
| completed_at | TIMESTAMPTZ | When run completed |
| status | TEXT | 'running', 'success', 'failed' |
| error_message | TEXT | Error details if failed |
| date_range_start | DATE | Start of data range |
| date_range_end | DATE | End of data range |
| record_count | INTEGER | Number of records in report |
| pdf_storage_path | TEXT | Path to generated PDF |
| csv_storage_path | TEXT | Path to generated CSV |
| emails_sent | INTEGER | Number of emails sent |
| email_recipients | TEXT[] | Who received emails |
| notifications_created | INTEGER | Notifications created |
| created_at | TIMESTAMPTZ | Creation timestamp |

### notifications

In-app notifications for users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Target user |
| type | TEXT | 'scheduled_report', 'system', 'alert' |
| title | TEXT | Notification title |
| message | TEXT | Notification message |
| scheduled_report_id | UUID | Related schedule (optional) |
| scheduled_run_id | UUID | Related run (optional) |
| report_url | TEXT | Link to view report |
| is_read | BOOLEAN | Read status |
| read_at | TIMESTAMPTZ | When read |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Frontend Components

### ScheduledReportsPage (`/scheduled-reports`)

Main page for viewing and managing scheduled reports.

**Features:**
- Lists all scheduled reports for the user/customer
- Shows schedule status (active/paused), frequency, delivery methods
- Displays last run status and next run time
- Expandable rows to show recent execution history
- Actions: Edit, Pause/Resume, Delete

### ScheduleBuilderModal

4-step wizard for creating/editing schedules.

**Steps:**
1. **Schedule** - Name, description, frequency, day/time selection
2. **Date Range** - Rolling window or preset ranges (previous week, MTD, etc.)
3. **Delivery** - Email recipients, file formats, notification preferences
4. **Review** - Summary of all settings before saving

### NotificationBell (Future)

Header component showing unread notification count.

### NotificationDropdown (Future)

Dropdown listing recent notifications with links to reports.

---

## Date Range Options

| Type | Description | Example |
|------|-------------|---------|
| rolling | Last N days/weeks/months | Last 7 days |
| previous_week | Mon-Sun of previous week | Dec 9-15 |
| previous_month | Full previous calendar month | November 2024 |
| previous_quarter | Full previous quarter | Q3 2024 |
| mtd | Month to date (1st to yesterday) | Dec 1-22 |
| ytd | Year to date (Jan 1 to yesterday) | Jan 1 - Dec 22 |

---

## Frequency Options

| Frequency | Description | Additional Config |
|-----------|-------------|-------------------|
| daily | Every day | Time only |
| weekly | Once per week | Day of week + time |
| monthly | Once per month | Day of month + time |
| quarterly | Once per quarter | Day of month + time |

---

## Email Template Variables

Available variables for email subject/body:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{schedule_name}}` | Name of the schedule | "Weekly Lane Performance" |
| `{{report_name}}` | Name of the source report | "Lane Performance Report" |
| `{{date_range}}` | Formatted date range | "Dec 9 - Dec 15, 2024" |
| `{{customer_name}}` | Customer company name | "Acme Corp" |

---

## Security

### Row Level Security (RLS)

**scheduled_reports:**
- Users can view schedules they created
- Users can view schedules for customers they have access to
- Admins can view all schedules
- Only creators (or admins) can update/delete

**scheduled_report_runs:**
- Users can view runs for schedules they have access to
- System can insert/update runs (for edge functions)

**notifications:**
- Users can only view their own notifications
- Users can only update/delete their own notifications
- System can create notifications for any user

---

## Edge Functions (Phase 2)

### run-scheduled-reports

Main executor called by cron job.

**Flow:**
1. Query schedules where `next_run_at <= NOW()` and `is_active = true`
2. For each schedule:
   - Create run record with status 'running'
   - Calculate date range for this run
   - Execute report query
   - Generate PDF/CSV if configured
   - Send emails if configured
   - Create notifications if configured
   - Update run record with results
   - Calculate and update next_run_at

### generate-report-pdf

Creates PDF from report data.

**Input:** Report definition, executed data, date range
**Output:** PDF buffer

### send-report-email

Sends email via Resend.

**Input:** Recipients, subject, body, attachments
**Output:** Send status

---

## Future Enhancements

1. **Notification Center** - Full notification management UI
2. **Delivery Status** - Track email delivery/opens
3. **Report History Viewer** - View past generated reports
4. **Schedule Templates** - Pre-configured schedule patterns
5. **Bulk Operations** - Pause/resume multiple schedules
6. **Webhooks** - Trigger external systems on report completion
