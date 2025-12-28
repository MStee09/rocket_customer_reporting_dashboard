import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScheduledReport {
  id: string;
  customer_id: number;
  report_type: string;
  report_id: string;
  report_name: string;
  name: string;
  frequency: string;
  timezone: string;
  day_of_week: number | null;
  day_of_month: number | null;
  run_time: string;
  date_range_type: string;
  rolling_value: number | null;
  rolling_unit: string | null;
  delivery_email: boolean;
  delivery_notification: boolean;
  email_recipients: string[];
  email_subject: string | null;
  email_body: string | null;
  format_pdf: boolean;
  format_csv: boolean;
  next_run_at: string;
  run_count: number;
  created_by: string;
}

function calculateDateRange(config: ScheduledReport, runDate: Date): { start: Date; end: Date } {
  const { date_range_type, rolling_value = 7, rolling_unit = 'days' } = config;

  switch (date_range_type) {
    case 'rolling': {
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);

      if (rolling_unit === 'days') {
        start.setDate(start.getDate() - rolling_value + 1);
      } else if (rolling_unit === 'weeks') {
        start.setDate(start.getDate() - (rolling_value * 7) + 1);
      } else if (rolling_unit === 'months') {
        start.setMonth(start.getMonth() - rolling_value);
        start.setDate(start.getDate() + 1);
      }
      return { start, end };
    }

    case 'previous_week': {
      const end = new Date(runDate);
      const dayOfWeek = end.getDay();
      end.setDate(end.getDate() - dayOfWeek);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    case 'previous_month': {
      const firstOfThisMonth = new Date(runDate.getFullYear(), runDate.getMonth(), 1);
      const end = new Date(firstOfThisMonth);
      end.setDate(end.getDate() - 1);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    }

    case 'previous_quarter': {
      const currentQuarter = Math.floor(runDate.getMonth() / 3);
      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const year = currentQuarter === 0 ? runDate.getFullYear() - 1 : runDate.getFullYear();
      const start = new Date(year, prevQuarter * 3, 1);
      const end = new Date(year, prevQuarter * 3 + 3, 0);
      return { start, end };
    }

    case 'mtd': {
      const start = new Date(runDate.getFullYear(), runDate.getMonth(), 1);
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      return { start, end };
    }

    case 'ytd': {
      const start = new Date(runDate.getFullYear(), 0, 1);
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      return { start, end };
    }

    default: {
      const end = new Date(runDate);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
  }
}

function calculateNextRun(config: ScheduledReport, fromDate: Date): Date {
  const [hours, minutes] = (config.run_time || '07:00').split(':').map(Number);

  const next = new Date(fromDate);
  next.setHours(hours, minutes, 0, 0);
  next.setDate(next.getDate() + 1);

  switch (config.frequency) {
    case 'daily':
      break;

    case 'weekly': {
      const targetDay = config.day_of_week ?? 1;
      while (next.getDay() !== targetDay) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    case 'monthly': {
      const targetDate = config.day_of_month ?? 1;
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDate);
      break;
    }

    case 'quarterly': {
      const currentMonth = next.getMonth();
      const quarterMonths = [0, 3, 6, 9];
      const nextQuarterMonth = quarterMonths.find(m => m > currentMonth) ?? quarterMonths[0];
      if (nextQuarterMonth <= currentMonth) {
        next.setFullYear(next.getFullYear() + 1);
      }
      next.setMonth(nextQuarterMonth);
      next.setDate(config.day_of_month ?? 1);
      break;
    }
  }

  return next;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

async function sendEmail(
  to: string[],
  subject: string,
  htmlBody: string,
  attachments: { filename: string; content: string }[]
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({        from: 'Go Rocket Reports <reports@resend.gorocketshipping.com>',
        to,
        subject,
        html: htmlBody,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

function generateCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  if (!data || data.length === 0 || !columns || columns.length === 0) return '';

  const headers = columns.map(c => `"${c.label}"`).join(',');

  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Running scheduled reports check at ${now.toISOString()}`);

    const { data: dueSchedules, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch schedules: ${fetchError.message}`);
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      console.log('No schedules due');
      return new Response(
        JSON.stringify({ message: 'No schedules due', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueSchedules.length} schedule(s) to process`);

    const results = [];

    for (const schedule of dueSchedules as ScheduledReport[]) {
      console.log(`Processing schedule: ${schedule.name} (${schedule.id})`);

      const { data: run, error: runError } = await supabase
        .from('scheduled_report_runs')
        .insert({
          scheduled_report_id: schedule.id,
          status: 'running',
          started_at: now.toISOString(),
        })
        .select()
        .single();

      if (runError) {
        console.error(`Failed to create run record: ${runError.message}`);
        continue;
      }

      try {
        const dateRange = calculateDateRange(schedule, now);
        const dateRangeStr = `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;

        console.log(`Date range: ${dateRangeStr}`);
        console.log(`Report type: ${schedule.report_type}`);

        const storagePath = schedule.report_type === 'custom_report'
          ? `${schedule.customer_id}/custom-reports/${schedule.report_id}.json`
          : `${schedule.customer_id}/ai-reports/${schedule.report_id}.json`;

        console.log(`Loading report from: ${storagePath}`);

        const { data: reportFile, error: reportError } = await supabase.storage
          .from('customer-reports')
          .download(storagePath);

        if (reportError || !reportFile) {
          throw new Error(`Report not found: ${storagePath}`);
        }

        const reportText = await reportFile.text();
        const reportDef = JSON.parse(reportText);

        console.log(`Loaded ${schedule.report_type} definition`);

        let reportData: any;

        if (schedule.report_type === 'ai_report') {
          const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-report`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: `Execute the saved report with date range ${dateRangeStr}`,
              customerId: String(schedule.customer_id),
              isAdmin: false,
              currentReport: reportDef.definition,
            }),
          });

          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            throw new Error(`Failed to generate report: ${errorText}`);
          }

          reportData = await generateResponse.json();
        } else {
          console.log('Executing custom report with simpleReport config');
          const simpleReport = reportDef.simpleReport || reportDef;

          if (!simpleReport.columns || simpleReport.columns.length === 0) {
            throw new Error('Custom report has no columns defined');
          }

          const query = `
            SELECT ${simpleReport.columns.map((c: any) => `${c.id} as "${c.label}"`).join(', ')}
            FROM shipment_report_view
            WHERE customer_id = ${schedule.customer_id}
            AND pickup_date >= '${dateRange.start.toISOString().split('T')[0]}'
            AND pickup_date <= '${dateRange.end.toISOString().split('T')[0]}'
            LIMIT 1000
          `;

          console.log('Executing query:', query);

          const { data: queryData, error: queryError } = await supabase.rpc('execute_query', {
            query_text: query
          });

          if (queryError) {
            throw new Error(`Query execution failed: ${queryError.message}`);
          }

          reportData = {
            report: {
              title: reportDef.name || schedule.report_name,
              sections: [{
                type: 'table',
                title: 'Report Data',
                data: queryData || [],
                columns: simpleReport.columns.map((c: any) => ({
                  key: c.label,
                  label: c.label,
                  id: c.id
                })),
              }],
            },
          };
        }

        let recordCount = 0;
        if (reportData?.report?.sections) {
          for (const section of reportData.report.sections) {
            if (Array.isArray(section.data)) {
              recordCount = Math.max(recordCount, section.data.length);
            }
          }
        }

        const templateVars = {
          schedule_name: schedule.name,
          report_name: schedule.report_name,
          date_range: dateRangeStr,
          date_range_start: formatDate(dateRange.start),
          date_range_end: formatDate(dateRange.end),
          record_count: String(recordCount),
          run_date: now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
        };

        let shareUrl = '';

        const { data: shareToken } = await supabase
          .rpc('generate_share_token')
          .maybeSingle();

        if (shareToken) {
          let sharedReportDef = reportDef;

          if (schedule.report_type === 'custom_report' && reportData?.report?.sections) {
            const tableSection = reportData.report.sections.find((s: { type: string }) => s.type === 'table');
            if (tableSection?.data) {
              sharedReportDef = {
                ...reportDef,
                type: 'custom_report',
                queryResults: tableSection.data,
              };
            }
          }

          const { error: shareError } = await supabase
            .from('shared_reports')
            .insert({
              share_token: shareToken,
              scheduled_report_id: schedule.id,
              scheduled_run_id: run.id,
              report_id: schedule.report_id,
              customer_id: schedule.customer_id,
              report_name: schedule.report_name,
              report_definition: sharedReportDef,
              date_range_start: dateRange.start.toISOString().split('T')[0],
              date_range_end: dateRange.end.toISOString().split('T')[0],
              is_active: true,
            });

          if (!shareError) {
            const appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.gorocketshipping.com';
            shareUrl = `${appUrl}/shared/reports/${shareToken}`;
          }
        }

        let emailsSent = 0;
        let notificationsCreated = 0;

        if (schedule.delivery_email && schedule.email_recipients?.length > 0) {
          const subject = replaceVariables(
            schedule.email_subject || '{{schedule_name}} - {{date_range}}',
            templateVars
          );

          const customBody = schedule.email_body
            ? replaceVariables(schedule.email_body, templateVars)
            : '';

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">${schedule.name}</h2>
              <p style="color: #666;">Your scheduled report is ready.</p>

              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${schedule.report_name}</p>
                <p style="margin: 0 0 8px 0;"><strong>Date Range:</strong> ${dateRangeStr}</p>
                <p style="margin: 0;"><strong>Records:</strong> ${recordCount}</p>
              </div>

              ${customBody ? `<p style="color: #333;">${customBody}</p>` : ''}

              ${shareUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${shareUrl}"
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                            border-radius: 6px; text-decoration: none; font-weight: 500;">
                    📊 View Full Report
                  </a>
                </div>
              ` : ''}

              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This report was automatically generated on ${templateVars.run_date}.
              </p>
            </div>
          `;

          const attachments: { filename: string; content: string }[] = [];

          if (schedule.format_csv && reportData?.report?.sections) {
            const tableSection = reportData.report.sections.find((s: { type: string }) => s.type === 'table');
            if (tableSection?.data && tableSection.data.length > 0 && tableSection?.columns) {
              const normalizedColumns = tableSection.columns.map((c: any) => ({
                key: c.key || c.id || c.field,
                label: c.label || c.key || c.id
              }));

              const csv = generateCSV(tableSection.data, normalizedColumns);

              if (csv) {
                const csvBase64 = btoa(unescape(encodeURIComponent(csv)));
                attachments.push({
                  filename: `${schedule.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateRange.start.toISOString().split('T')[0]}.csv`,
                  content: csvBase64,
                });
                console.log('CSV attachment created:', attachments[0].filename);
              }
            }
          }

          const emailSent = await sendEmail(
            schedule.email_recipients,
            subject,
            htmlBody,
            attachments
          );

          if (emailSent) {
            emailsSent = schedule.email_recipients.length;
          }
        }

        if (schedule.delivery_notification && schedule.created_by) {
          const reportUrl = schedule.report_type === 'custom_report'
            ? `/custom-reports/${schedule.report_id}`
            : `/ai-reports/${schedule.report_id}`;

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: schedule.created_by,
              type: 'scheduled_report',
              title: `${schedule.name} is ready`,
              message: `Report for ${dateRangeStr} has been generated with ${recordCount} records.`,
              scheduled_report_id: schedule.id,
              scheduled_run_id: run.id,
              report_url: reportUrl,
            });

          if (!notifError) {
            notificationsCreated = 1;
          }
        }

        await supabase
          .from('scheduled_report_runs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            date_range_start: dateRange.start.toISOString().split('T')[0],
            date_range_end: dateRange.end.toISOString().split('T')[0],
            record_count: recordCount,
            emails_sent: emailsSent,
            email_recipients: schedule.email_recipients,
            notifications_created: notificationsCreated,
          })
          .eq('id', run.id);

        const nextRun = calculateNextRun(schedule, now);
        await supabase
          .from('scheduled_reports')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            last_run_status: 'success',
            last_run_error: null,
            run_count: schedule.run_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        results.push({
          scheduleId: schedule.id,
          name: schedule.name,
          status: 'success',
          emailsSent,
          notificationsCreated,
        });

        console.log(`Successfully processed: ${schedule.name}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to process schedule ${schedule.id}:`, error);

        await supabase
          .from('scheduled_report_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', run.id);

        await supabase
          .from('scheduled_reports')
          .update({
            last_run_at: now.toISOString(),
            last_run_status: 'failed',
            last_run_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        const nextRun = calculateNextRun(schedule, now);
        await supabase
          .from('scheduled_reports')
          .update({
            next_run_at: nextRun.toISOString(),
          })
          .eq('id', schedule.id);
        results.push({
          scheduleId: schedule.id,
          name: schedule.name,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} schedule(s)`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});