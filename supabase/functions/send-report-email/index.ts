import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  message?: string;
  reportName: string;
  reportData: Record<string, unknown>[];
  reportType: 'ai' | 'custom' | 'shipments';
  format: 'csv' | 'excel';
}

function generateCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';

  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  const columns = Array.from(allKeys);

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = columns.map(col => escapeCell(col)).join(',');
  const rows = data.map(row =>
    columns.map(col => escapeCell(row[col])).join(',')
  );

  return [headers, ...rows].join('\n');
}

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: { filename: string; content: string }[]
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    throw new Error('Email service not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Go Rocket Reports <reports@resend.gorocketshipping.com>',
      to: [to],
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
    throw new Error('Failed to send email');
  }

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, message, reportName, reportData, format } = body;

    if (!to || !reportData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recordCount = reportData.length;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">${reportName}</h2>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${reportName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Records:</strong> ${recordCount}</p>
          <p style="margin: 0;"><strong>Format:</strong> ${format.toUpperCase()}</p>
        </div>

        ${message ? `<p style="color: #333; white-space: pre-wrap;">${message}</p>` : ''}

        <p style="color: #666; margin-top: 20px;">
          Please find the report attached to this email.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This report was sent on ${dateStr}.
        </p>
      </div>
    `;

    const attachments: { filename: string; content: string }[] = [];
    const safeFileName = reportName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateFileName = now.toISOString().split('T')[0];

    if (format === 'csv') {
      const csv = generateCSV(reportData);
      if (csv) {
        const csvBase64 = btoa(unescape(encodeURIComponent(csv)));
        attachments.push({
          filename: `${safeFileName}_${dateFileName}.csv`,
          content: csvBase64,
        });
      }
    } else if (format === 'excel') {
      const csv = generateCSV(reportData);
      if (csv) {
        const csvBase64 = btoa(unescape(encodeURIComponent(csv)));
        attachments.push({
          filename: `${safeFileName}_${dateFileName}.csv`,
          content: csvBase64,
        });
      }
    }

    if (attachments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data to attach' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await sendEmail(to, subject, htmlBody, attachments);

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${to}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});