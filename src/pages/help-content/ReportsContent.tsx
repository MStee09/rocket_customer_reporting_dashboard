import {
  LayoutDashboard, BarChart3, Sparkles, Download, Mail, Calendar,
  Clock, Eye, TrendingUp
} from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function AnalyticsHubContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Hub</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Analytics Hub is your central location for all reporting and analysis tools.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Available Tools</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 bg-gradient-to-r from-rocket-50 to-rocket-100 rounded-lg border border-rocket-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-rocket-600" />
            <h4 className="font-semibold text-gray-900">AI Report Studio</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Generate reports using natural language. Ask questions in plain English and
            receive formatted reports with data, charts, and insights.
          </p>
        </div>
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Custom Report Builder</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Create structured reports by selecting specific metrics, groupings, and filters.
            Save these reports for reuse.
          </p>
        </div>
        <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg border border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="w-5 h-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">Widget Library</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Browse available dashboard widgets and see sample visualizations before adding
            them to your dashboard.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Recent Reports</h2>
      <p className="text-gray-600 mb-4">
        The Analytics Hub shows your 5 most recently generated or viewed reports for
        quick access.
      </p>

      <Callout type="tip">
        Start with the AI Report Studio if you're not sure what data you need. You can always refine and save reports for later.
      </Callout>
    </div>
  );
}

export function AIStudioContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Report Studio</h1>
      <p className="text-lg text-gray-600 mb-6">
        The AI Report Studio lets you generate reports and get insights by asking
        questions in plain English.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Navigate to AI Report Studio">
        Go to <strong>Analytics</strong> and select <strong>AI Report Studio</strong>.
      </Step>

      <Step number={2} title="Type Your Question">
        Type your question in the chat input. For example: "Show me total spend by carrier for the last 90 days"
      </Step>

      <Step number={3} title="Review the Response">
        Review the AI's response with data, charts, or tables.
      </Step>

      <Step number={4} title="Refine and Follow Up">
        Ask follow-up questions to refine or expand the analysis.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Example Questions</h2>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Show me total spend by carrier for the last 90 days"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "What are my top 10 shipping lanes by volume?"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Compare this month's shipments to last month"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Which carriers have the best on-time delivery rate?"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Summarize my shipping activity for Q4"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Show me all shipments going to California"
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Teaching the AI Your Terms</h2>
      <p className="text-gray-600 mb-4">
        The AI remembers terminology you teach it. Just tell it what your abbreviations or terms mean:
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3 p-3 bg-rocket-50 rounded-lg border border-rocket-200">
          <Sparkles className="w-5 h-5 text-rocket-600 mt-0.5" />
          <div>
            <span className="font-medium text-rocket-900">"When I say CG, I mean cargoglide"</span>
            <p className="text-sm text-rocket-700">The AI will use this in future conversations</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-rocket-50 rounded-lg border border-rocket-200">
          <Sparkles className="w-5 h-5 text-rocket-600 mt-0.5" />
          <div>
            <span className="font-medium text-rocket-900">"We sell drawer systems and truck bed organizers"</span>
            <p className="text-sm text-rocket-700">The AI understands your product categories</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Tips for Better Results</h2>
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-rocket-500 mt-0.5" />
          <div>
            <span className="font-medium">Be Specific</span>
            <p className="text-sm text-gray-600">Include time frames and metrics in your questions</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-rocket-500 mt-0.5" />
          <div>
            <span className="font-medium">Name Carriers or Lanes</span>
            <p className="text-sm text-gray-600">"Old Dominion" instead of "that carrier"</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-rocket-500 mt-0.5" />
          <div>
            <span className="font-medium">Ask for Comparisons</span>
            <p className="text-sm text-gray-600">"Compare X to Y" for side-by-side analysis</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-rocket-500 mt-0.5" />
          <div>
            <span className="font-medium">Request Specific Formats</span>
            <p className="text-sm text-gray-600">"Show as a pie chart" or "Give me a table"</p>
          </div>
        </div>
      </div>

      <Callout type="info">
        The AI has access to your shipment data and can answer questions about your
        specific shipments, carriers, lanes, and trends.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Saving and Exporting Reports</h2>
      <p className="text-gray-600 mb-4">
        When the AI generates a report, you can:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Save</strong> - Store the report for quick access later</li>
        <li><strong>Export</strong> - Download as CSV, Excel, or PDF</li>
        <li><strong>Schedule</strong> - Set up recurring delivery via email</li>
        <li><strong>Share</strong> - Generate a shareable link</li>
      </ul>
    </div>
  );
}

export function CustomReportsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Custom Reports</h1>
      <p className="text-lg text-gray-600 mb-6">
        Custom Reports let you build structured, reusable reports with specific
        metrics and groupings.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Creating a Custom Report</h2>

      <Step number={1} title="Navigate to Reports">
        Navigate to <strong>Reports</strong>.
      </Step>

      <Step number={2} title="Click Create New Report">
        Click <strong>Create New Report</strong>.
      </Step>

      <Step number={3} title="Enter Report Details">
        Enter a name and description.
      </Step>

      <Step number={4} title="Select Metrics">
        Select the metrics you want to include.
      </Step>

      <Step number={5} title="Choose Grouping Options">
        Choose grouping options (by carrier, by lane, by time period, etc.).
      </Step>

      <Step number={6} title="Apply Filters">
        Apply any filters to narrow down data.
      </Step>

      <Step number={7} title="Preview and Save">
        Preview the report and click <strong>Save</strong>.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Running Saved Reports</h2>
      <p className="text-gray-600 mb-4">
        Your saved reports appear in the Reports library. Click any report to run
        it with the current date range.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Report Actions</h2>
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Download className="w-5 h-5 text-rocket-600" />
          <div>
            <span className="font-medium">Export</span>
            <p className="text-sm text-gray-500">Download as CSV, Excel, or PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Mail className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Email</span>
            <p className="text-sm text-gray-500">Send to any email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Calendar className="w-5 h-5 text-teal-600" />
          <div>
            <span className="font-medium">Schedule</span>
            <p className="text-sm text-gray-500">Set up recurring delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduledReportsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Scheduled Reports</h1>
      <p className="text-lg text-gray-600 mb-6">
        Automate your reporting by scheduling reports to run and deliver automatically.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Creating a Schedule</h2>

      <Step number={1} title="Navigate to Scheduled Reports">
        Navigate to <strong>Reports</strong> then <strong>Scheduled Reports</strong>.
      </Step>

      <Step number={2} title="Click New Schedule">
        Click <strong>New Schedule</strong>.
      </Step>

      <Step number={3} title="Select the Report">
        Select the report to schedule.
      </Step>

      <Step number={4} title="Choose Frequency">
        Choose the frequency: <strong>Daily</strong>, <strong>Weekly</strong>, or <strong>Monthly</strong>.
      </Step>

      <Step number={5} title="Set the Time">
        Set the time to run.
      </Step>

      <Step number={6} title="Add Recipients">
        Add recipient email addresses.
      </Step>

      <Step number={7} title="Choose Format and Save">
        Choose the export format (CSV, Excel, PDF) and click <strong>Save Schedule</strong>.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Schedules</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Clock className="w-5 h-5 text-rocket-600" />
          <div>
            <span className="font-medium">Pause/Resume</span>
            <p className="text-sm text-gray-500">Temporarily stop a schedule without deleting it</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Eye className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Run Now</span>
            <p className="text-sm text-gray-500">Manually trigger an immediate run</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <div>
            <span className="font-medium">View History</span>
            <p className="text-sm text-gray-500">See past runs and delivery status</p>
          </div>
        </div>
      </div>

      <Callout type="tip">
        After viewing any report, you'll see a prompt asking "Want this report regularly?"
        Click "Schedule Report" for a quick way to set up recurring delivery.
      </Callout>
    </div>
  );
}
