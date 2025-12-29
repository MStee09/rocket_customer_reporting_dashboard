import {
  LayoutDashboard, Truck, BarChart3, Building2, Bell,
  BookOpen, Sparkles, Filter, Download, Mail, Calendar,
  Users, Brain, Eye, MousePointer, Clock, TrendingUp, Zap,
  CheckCircle, AlertCircle, Info
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex gap-3 p-4 bg-gray-50 rounded-lg border">
      <div className="p-2 bg-blue-100 rounded-lg h-fit">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-gray-900 m-0">{title}</h4>
        <p className="text-sm text-gray-600 m-0 mt-1">{description}</p>
      </div>
    </div>
  );
}

interface CalloutProps {
  type: 'tip' | 'info' | 'warning' | 'example';
  children: React.ReactNode;
}

export function Callout({ type, children }: CalloutProps) {
  const styles = {
    tip: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    example: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  const icons = {
    tip: <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
    example: <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />,
  };

  const labels = {
    tip: 'Tip',
    info: 'Info',
    warning: 'Note',
    example: 'Example',
  };

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]} my-4`}>
      {icons[type]}
      <div>
        <div className="font-medium mb-1">{labels[type]}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  );
}

export function OverviewContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Overview</h1>
      <p className="text-lg text-gray-600 mb-6">
        Welcome to the Go Rocket Shipping Freight Reporting Dashboard. This platform provides
        comprehensive visibility into your shipping operations, analytics, and reporting capabilities.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What You Can Do</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <FeatureCard
          icon={<LayoutDashboard className="w-5 h-5 text-blue-600" />}
          title="View Real-Time Metrics"
          description="See shipment counts, spend, and performance at a glance"
        />
        <FeatureCard
          icon={<Truck className="w-5 h-5 text-blue-600" />}
          title="Track Shipments"
          description="Search, filter, and view detailed shipment information"
        />
        <FeatureCard
          icon={<Sparkles className="w-5 h-5 text-blue-600" />}
          title="Generate AI Reports"
          description="Ask questions in plain English and get instant insights"
        />
        <FeatureCard
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          title="Schedule Reports"
          description="Automate recurring reports delivered to your inbox"
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Quick Start Checklist</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700"><strong>Select your customer</strong> from the dropdown in the header (if you have multiple)</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700"><strong>Set your date range</strong> to view the relevant time period</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700"><strong>Explore the dashboard</strong> to see your key metrics</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700"><strong>Try the AI Studio</strong> to ask a question about your data</span>
        </div>
      </div>

      <Callout type="tip">
        Look for the <Sparkles className="w-4 h-4 inline" /> sparkle icons throughout the dashboard.
        These "Ask AI" buttons let you get instant insights about any widget or data point.
      </Callout>
    </div>
  );
}

export function NavigationContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Navigation Guide</h1>
      <p className="text-lg text-gray-600 mb-6">
        The dashboard is organized into logical sections accessible from the left sidebar.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Main Navigation</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Menu Item</th>
              <th className="text-left p-3 border font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>Dashboard</strong></td>
              <td className="p-3 border">Your home view with key metrics, charts, and AI insights</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Shipments</strong></td>
              <td className="p-3 border">Browse, search, and filter all your shipments</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Analytics</strong></td>
              <td className="p-3 border">Access AI Studio, Custom Reports, and analytics tools</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Reports</strong></td>
              <td className="p-3 border">View saved reports and manage scheduled reports</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Carriers</strong></td>
              <td className="p-3 border">Carrier performance metrics and comparisons</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Admin Navigation</h2>
      <p className="text-gray-600 mb-4">Admin users see additional menu items:</p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Menu Item</th>
              <th className="text-left p-3 border font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>Customers</strong></td>
              <td className="p-3 border">Manage customer intelligence profiles</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Knowledge Base</strong></td>
              <td className="p-3 border">Upload documents and manage the AI's knowledge</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>User Management</strong></td>
              <td className="p-3 border">Add and manage user accounts</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Settings</strong></td>
              <td className="p-3 border">System configuration and this How To guide</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Header Elements</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Customer Selector</strong> - Switch between customers (if you have access to multiple)</li>
        <li><strong>Notification Bell</strong> - View alerts and system notifications</li>
        <li><strong>User Menu</strong> - Access your profile and logout</li>
      </ul>
    </div>
  );
}

export function CustomerSwitchingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Switching Customers</h1>
      <p className="text-lg text-gray-600 mb-6">
        If you have access to multiple customer accounts, you can switch between them using
        the customer selector in the header.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Switch Customers</h2>

      <Step number={1} title="Open the Customer Switcher">
        Click on the <strong>"View as"</strong> dropdown in the top-right header area.
      </Step>

      <Step number={2} title="Search or Select a Customer">
        Select the customer you want to view from the list.
      </Step>

      <Step number={3} title="View Customer Data">
        The entire dashboard will refresh to show that customer's data.
      </Step>

      <Callout type="info">
        All data throughout the dashboard-shipments, metrics, reports-will be filtered
        to the selected customer. This persists until you switch to another customer or log out.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Admin: View As Customer</h2>
      <p className="text-gray-600 mb-4">
        Administrators have an additional "View as" feature that lets them see the dashboard
        exactly as a specific customer would see it.
      </p>

      <Step number={1} title="Click View As">
        Click <strong>"View as: [Customer Name]"</strong> in the header.
      </Step>

      <Step number={2} title="See the Indicator">
        An orange banner will appear indicating you're in "View As" mode.
      </Step>

      <Step number={3} title="Navigate Freely">
        Navigate the dashboard to see exactly what the customer sees.
      </Step>

      <Step number={4} title="Exit View As Mode">
        Click <strong>"Exit"</strong> in the banner to return to admin view.
      </Step>

      <Callout type="warning">
        While in "View As" mode, you'll have the same permissions as that customer.
        Some admin features may be hidden.
      </Callout>
    </div>
  );
}

export function DateRangesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Using Date Ranges</h1>
      <p className="text-lg text-gray-600 mb-6">
        Most views in the dashboard can be filtered by date range. This controls which
        shipments and data are included in your view.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Quick Date Presets</h2>
      <p className="text-gray-600 mb-4">Click any of these buttons for instant filtering:</p>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 30 Days</span>
          <span className="text-gray-500 block text-sm">Most recent month of activity</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 90 Days</span>
          <span className="text-gray-500 block text-sm">Last quarter</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 6 Months</span>
          <span className="text-gray-500 block text-sm">Half-year view</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last Year</span>
          <span className="text-gray-500 block text-sm">Full year of data</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Custom</span>
          <span className="text-gray-500 block text-sm">Pick your own start and end dates</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Custom Date Range</h2>

      <Step number={1} title="Click Custom">
        Click <strong>"Custom"</strong> in the date selector.
      </Step>

      <Step number={2} title="Select Start Date">
        Click the start date field and select a date from the calendar.
      </Step>

      <Step number={3} title="Select End Date">
        Click the end date field and select a date.
      </Step>

      <Step number={4} title="Apply">
        Click <strong>"Apply"</strong> to update the view.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Comparison Mode</h2>
      <p className="text-gray-600 mb-4">
        Some views support comparing two time periods side by side:
      </p>

      <Step number={1} title="Enable Compare">
        Enable <strong>"Compare to"</strong> below the date selector.
      </Step>

      <Step number={2} title="Choose Period">
        Choose a comparison period: <strong>Previous Period</strong>, <strong>Same Period Last Year</strong>, or <strong>Custom Range</strong>.
      </Step>

      <Step number={3} title="View Comparisons">
        Metrics will now show current vs. comparison values with percentage changes.
      </Step>
    </div>
  );
}

export function MetricsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Understanding Metrics</h1>
      <p className="text-lg text-gray-600 mb-6">
        The dashboard displays key performance indicators (KPIs) that give you instant
        visibility into your shipping operations.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Summary Metrics</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Metric</th>
              <th className="text-left p-3 border font-semibold">What It Shows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>Total Shipments</strong></td>
              <td className="p-3 border">Count of all shipments in the selected date range</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Total Spend</strong></td>
              <td className="p-3 border">Sum of all shipping costs (customer charges)</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Average Cost</strong></td>
              <td className="p-3 border">Total spend divided by shipment count</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>On-Time Rate</strong></td>
              <td className="p-3 border">Percentage of shipments delivered by expected date</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reading Trend Indicators</h2>
      <p className="text-gray-600 mb-4">Each metric may show a trend arrow:</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Green arrow - Positive trend (good)</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
          <span className="text-sm text-red-700">Red arrow - Negative trend (needs attention)</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
          <span className="text-gray-500">-</span>
          <span className="text-sm text-gray-700">Gray - No significant change</span>
        </div>
      </div>

      <Callout type="tip">
        Hover over any metric to see additional details like the exact percentage change
        and the comparison period used.
      </Callout>
    </div>
  );
}

export function WidgetsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Widgets</h1>
      <p className="text-lg text-gray-600 mb-6">
        The dashboard contains various widgets that visualize your shipping data in
        different ways.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Available Widgets</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Spend by Mode</h3>
          <p className="text-gray-600 text-sm">
            A pie or bar chart showing how your shipping spend breaks down by transportation
            mode (LTL, FTL, Parcel, etc.).
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Spend Over Time</h3>
          <p className="text-gray-600 text-sm">
            A line chart showing your daily, weekly, or monthly shipping spend trends over
            the selected date range.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Top Carriers</h3>
          <p className="text-gray-600 text-sm">
            A ranked list of your most-used carriers by shipment count or spend.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Top Lanes</h3>
          <p className="text-gray-600 text-sm">
            Your most frequently used shipping lanes (origin to destination pairs).
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Shipments by Status</h3>
          <p className="text-gray-600 text-sm">
            Breakdown of shipments by their current status (Delivered, In Transit, Pending, etc.).
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Interacting with Widgets</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Hover</strong> over chart elements to see detailed tooltips</li>
        <li><strong>Click</strong> chart segments to filter (where supported)</li>
        <li><strong>Use the <Sparkles className="w-4 h-4 inline" /> button</strong> to ask AI about the widget's data</li>
      </ul>
    </div>
  );
}

export function AIInsightsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Insights Card</h1>
      <p className="text-lg text-gray-600 mb-6">
        The AI Insights card at the top of your dashboard provides an automatic,
        AI-generated summary of your shipping activity.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What It Shows</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Natural language summary</strong> of your recent shipping activity</li>
        <li><strong>Key observations</strong> about trends, anomalies, or notable patterns</li>
        <li><strong>Comparison to previous period</strong> when applicable</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How It Works</h2>
      <p className="text-gray-600 mb-4">
        The AI analyzes your shipment data for the selected date range and customer,
        looking at metrics like volume, spend, carrier usage, and geographic patterns.
        It then generates a brief summary highlighting the most important insights.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Refreshing Insights</h2>
      <p className="text-gray-600 mb-4">
        Click the <strong>Refresh</strong> button to regenerate insights with the latest data.
        Insights are cached for 30 minutes to improve performance.
      </p>

      <Callout type="info">
        The AI Insights card uses your Customer Intelligence Profile (if configured) to
        provide more relevant and contextual observations.
      </Callout>
    </div>
  );
}

export function AskAIContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Ask AI Buttons</h1>
      <p className="text-lg text-gray-600 mb-6">
        Throughout the dashboard, you'll see sparkle (<Sparkles className="w-4 h-4 inline" />) icons next to widgets and data points.
        These "Ask AI" buttons let you get instant insights about specific data.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Find the Sparkle Icon">
        Find the <Sparkles className="w-4 h-4 inline text-blue-600" /> sparkle icon on any widget or metric.
      </Step>

      <Step number={2} title="Click It">
        Click it to open the AI Studio with context pre-loaded.
      </Step>

      <Step number={3} title="Context is Preserved">
        The AI will have information about what you were looking at.
      </Step>

      <Step number={4} title="Ask Follow-ups">
        Ask follow-up questions or request specific analysis.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Example Questions</h2>
      <p className="text-gray-600 mb-4">When you click Ask AI on different widgets:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>On Spend by Mode:</strong> "Why did LTL spend increase this month?"</li>
        <li><strong>On Top Carriers:</strong> "How does Old Dominion compare to ABF for my lanes?"</li>
        <li><strong>On a Shipment:</strong> "What's the status and expected delivery for this load?"</li>
      </ul>

      <Callout type="tip">
        The AI has access to your shipment data, so you can ask very specific questions
        like "How many shipments went to California last month?" and get accurate answers.
      </Callout>
    </div>
  );
}

export function ViewingShipmentsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Viewing Shipments</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Shipments page provides a comprehensive view of all your freight shipments
        with powerful search, filter, and export capabilities.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Shipments Table</h2>
      <p className="text-gray-600 mb-4">The table displays key information for each shipment:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Load ID</strong> - Unique identifier for the shipment</li>
        <li><strong>Pickup Date</strong> - When the freight was picked up</li>
        <li><strong>Origin/Destination</strong> - City and state for each</li>
        <li><strong>Carrier</strong> - The carrier handling the shipment</li>
        <li><strong>Status</strong> - Current shipment status</li>
        <li><strong>Cost</strong> - Customer charge amount</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Sorting</h2>
      <p className="text-gray-600 mb-4">
        Click any column header to sort by that column. Click again to reverse the sort order.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Pagination</h2>
      <p className="text-gray-600 mb-4">
        Use the pagination controls at the bottom of the table to navigate through
        large result sets.
      </p>
    </div>
  );
}

export function SearchingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Smart Search</h1>
      <p className="text-lg text-gray-600 mb-6">
        The smart search bar searches across multiple fields simultaneously, making it
        easy to find any shipment.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Searchable Fields</h2>
      <p className="text-gray-600 mb-4">Your search query will match against:</p>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Load ID</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">PRO Number</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Reference Number</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">BOL Number</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">PO Reference</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Origin City and State</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Destination City and State</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Carrier Name</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Company Names (shipper/consignee)</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Search Tips</h2>
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Case Insensitive</span>
            <p className="text-sm text-gray-600">Search is case-insensitive ("Chicago" = "chicago")</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Partial Matches</span>
            <p className="text-sm text-gray-600">Partial matches work ("Old Dom" finds "Old Dominion")</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Live Results</span>
            <p className="text-sm text-gray-600">Results update as you type</p>
          </div>
        </div>
      </div>

      <Callout type="example">
        Try searching for: a city name, a carrier name, a reference number, or even
        just a state code like "CA" to find all California shipments.
      </Callout>
    </div>
  );
}

export function FilteringContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Quick Filters</h1>
      <p className="text-lg text-gray-600 mb-6">
        Quick filter chips provide one-click filtering for common shipment categories.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Available Filters</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Filter</th>
              <th className="text-left p-3 border font-semibold">What It Shows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">In Transit</span></td>
              <td className="p-3 border">Shipments currently being transported</td>
            </tr>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Delivered</span></td>
              <td className="p-3 border">Completed shipments</td>
            </tr>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">Pending Pickup</span></td>
              <td className="p-3 border">Shipments awaiting carrier pickup</td>
            </tr>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">Exceptions</span></td>
              <td className="p-3 border">Shipments with delivery issues or delays</td>
            </tr>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-sky-100 text-sky-700 rounded text-sm">This Week</span></td>
              <td className="p-3 border">Shipments with pickup dates this week</td>
            </tr>
            <tr>
              <td className="p-3 border"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">High Value</span></td>
              <td className="p-3 border">Shipments over $500</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Using Filters</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Click a chip</strong> to activate that filter</li>
        <li><strong>Click multiple chips</strong> to combine filters (OR logic)</li>
        <li><strong>Click "Clear all"</strong> to remove all filters</li>
        <li>Each chip shows the count of matching shipments</li>
      </ul>

      <Callout type="tip">
        Filters work in combination with search. You can search for "California"
        and then filter to just "In Transit" shipments.
      </Callout>
    </div>
  );
}

export function ShipmentDetailsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipment Details</h1>
      <p className="text-lg text-gray-600 mb-6">
        Click any shipment row to open a detailed view in a slide-out panel.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Information Available</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Header</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>Load ID with copy button</li>
            <li>Current status badge</li>
          </ul>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Key Info</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>PRO Number</li>
            <li>Reference Number</li>
            <li>Customer Charge</li>
          </ul>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Route Details</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>Origin company, address, contact info</li>
            <li>Destination company, address, contact info</li>
            <li>Total miles</li>
          </ul>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Dates</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>Pickup Date</li>
            <li>Delivery Date</li>
            <li>Expected Delivery</li>
            <li>Created Date</li>
          </ul>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Carrier & Equipment</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>Carrier name</li>
            <li>Mode (LTL, FTL, etc.)</li>
            <li>Equipment type</li>
            <li>Driver information</li>
            <li>Truck and trailer numbers</li>
          </ul>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Freight Details</h3>
          <ul className="list-disc list-inside text-gray-600 text-sm">
            <li>Total weight</li>
            <li>Piece count</li>
            <li>Pallet count</li>
            <li>Freight class</li>
            <li>Commodity description</li>
            <li>Hazmat indicator</li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Actions</h2>
      <p className="text-gray-600 mb-4">From the detail panel, you can:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Copy the Load ID</strong> - Click the copy icon</li>
        <li><strong>Ask AI</strong> - Get AI analysis of this specific shipment</li>
      </ul>
    </div>
  );
}

export function ExportingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Exporting Data</h1>
      <p className="text-lg text-gray-600 mb-6">
        Export your shipment data in multiple formats for further analysis or sharing.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Export Formats</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Format</th>
              <th className="text-left p-3 border font-semibold">Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>CSV</strong></td>
              <td className="p-3 border">Opening in Excel, importing to other systems</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Excel (.xlsx)</strong></td>
              <td className="p-3 border">Formatted spreadsheets with proper column widths</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>PDF</strong></td>
              <td className="p-3 border">Sharing, printing, or archiving</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Export</h2>

      <Step number={1} title="Filter Your Data">
        Apply any filters or search to narrow down the data.
      </Step>

      <Step number={2} title="Click Export">
        Click the <strong>Export</strong> dropdown button.
      </Step>

      <Step number={3} title="Select Format">
        Select your desired format (CSV, Excel, or PDF).
      </Step>

      <Step number={4} title="Download">
        The file will download automatically.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Gets Exported</h2>
      <p className="text-gray-600 mb-4">
        The export includes <strong>all visible/filtered shipments</strong> with comprehensive
        details including:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>All identification numbers (Load ID, PRO, Reference, BOL, PO)</li>
        <li>Complete origin and destination addresses with contacts</li>
        <li>Carrier and driver information</li>
        <li>All freight details (weight, pieces, class, commodity)</li>
        <li>Financial data (customer charge, declared value)</li>
        <li>All dates (pickup, delivery, expected, created)</li>
      </ul>

      <Callout type="tip">
        Apply filters first to export just the data you need. For example, filter to
        "Delivered" shipments before exporting for a delivery report.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Email Export</h2>
      <p className="text-gray-600 mb-4">You can also email exports directly:</p>

      <Step number={1} title="Click Email">
        Click the <strong>Email</strong> button next to Export.
      </Step>

      <Step number={2} title="Enter Recipients">
        Enter the recipient email address.
      </Step>

      <Step number={3} title="Add Details">
        Add an optional subject and message.
      </Step>

      <Step number={4} title="Choose Format">
        Choose the attachment format.
      </Step>

      <Step number={5} title="Send">
        Click <strong>Send</strong>.
      </Step>
    </div>
  );
}

export function AnalyticsHubContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Hub</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Reports Hub is your central location for accessing all types of reports and analytics.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Report Categories</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">AI Report Studio</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Create custom reports using natural language. Just describe what you want to see.
          </p>
        </div>
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Custom Reports</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Build detailed reports with filters, grouping, and calculations.
          </p>
        </div>
        <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg border border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">Scheduled Reports</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Set up automatic report generation and delivery on a schedule.
          </p>
        </div>
      </div>

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
        Create powerful, custom reports using natural language. Just describe what you want to see.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Getting Started</h2>

      <Step number={1} title="Describe Your Report">
        Type what you want to see in plain English. For example: "Show me total spend by carrier for the last 6 months"
      </Step>

      <Step number={2} title="AI Generates the Report">
        The AI analyzes your request and creates a report with appropriate charts, tables, and metrics.
      </Step>

      <Step number={3} title="Refine if Needed">
        Ask follow-up questions to adjust the report: "Break this down by month" or "Add a comparison to last year"
      </Step>

      <Step number={4} title="Save or Export">
        Save the report to your library, add it to your dashboard, or export it.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Example Prompts</h2>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Show me total spend by transportation mode"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Create an executive summary of shipping activity"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Analyze my top shipping lanes by volume"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Compare costs across different carriers"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "What's my average cost per mile by mode?"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Show monthly trends for the past year"
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Report Library</h2>
      <p className="text-gray-600 mb-4">
        Your saved reports are stored in the "My Reports" tab. From there you can:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>View and run saved reports</li>
        <li>Edit reports to update the analysis</li>
        <li>Add reports to your dashboard</li>
        <li>Schedule automatic report delivery</li>
        <li>Export or delete reports</li>
      </ul>
    </div>
  );
}

export function CustomReportsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Custom Reports</h1>
      <p className="text-lg text-gray-600 mb-6">
        Build detailed, structured reports with precise control over data, filters, and presentation.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Report Builder Features</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold">Filters</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Filter data by date range, carriers, modes, lanes, status, and more. Combine multiple filters for precise results.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold">Grouping & Aggregation</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Group data by any field and calculate sums, averages, counts, and more.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h4 className="font-semibold">Visualizations</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Choose from bar charts, line charts, pie charts, and tables to display your data.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Building a Report</h2>

      <Step number={1} title="Select Data Source">
        Choose the primary data to analyze (shipments, carriers, lanes, etc.).
      </Step>

      <Step number={2} title="Add Filters">
        Define which data to include based on your criteria.
      </Step>

      <Step number={3} title="Configure Columns">
        Select which fields to display and how to calculate them.
      </Step>

      <Step number={4} title="Choose Visualization">
        Pick the best chart type to represent your data.
      </Step>

      <Step number={5} title="Preview & Save">
        Review the results and save to your report library.
      </Step>
    </div>
  );
}

export function ScheduledReportsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Scheduled Reports</h1>
      <p className="text-lg text-gray-600 mb-6">
        Automate report generation and delivery on a schedule that works for you.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Schedule Options</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Daily</h4>
          <p className="text-gray-600 text-sm">Run every day at a specified time.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Weekly</h4>
          <p className="text-gray-600 text-sm">Run on specific days of the week.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Monthly</h4>
          <p className="text-gray-600 text-sm">Run on a specific day each month.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Quarterly</h4>
          <p className="text-gray-600 text-sm">Run at the end of each quarter.</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Delivery Options</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-medium">Email Delivery</span>
            <p className="text-sm text-gray-500">Send reports as email attachments to specified recipients.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Bell className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">In-App Notification</span>
            <p className="text-sm text-gray-500">Receive a notification when the report is ready.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Schedules</h2>
      <p className="text-gray-600 mb-4">
        From the Scheduled Reports page, you can:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>View all active and paused schedules</li>
        <li>Pause or resume schedules</li>
        <li>Edit schedule settings and recipients</li>
        <li>Run a schedule immediately</li>
        <li>View run history and success/failure status</li>
      </ul>
    </div>
  );
}

export function CarrierPerformanceContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Carrier Performance</h1>
      <p className="text-lg text-gray-600 mb-6">
        Analyze how your carriers are performing across key metrics.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Performance Metrics</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Shipment Volume</h4>
          <p className="text-gray-600 text-sm">Number of shipments handled by each carrier.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Total Spend</h4>
          <p className="text-gray-600 text-sm">Your investment with each carrier.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Average Cost</h4>
          <p className="text-gray-600 text-sm">Cost per shipment or per mile by carrier.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">On-Time Rate</h4>
          <p className="text-gray-600 text-sm">Percentage of shipments delivered on time.</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Using the Carriers Page</h2>
      <p className="text-gray-600 mb-4">
        The Carriers page provides a comprehensive view of all carriers you work with:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Sort carriers by any metric</li>
        <li>Filter by mode or date range</li>
        <li>Click on a carrier for detailed breakdown</li>
        <li>Compare multiple carriers side by side</li>
      </ul>
    </div>
  );
}

export function CarrierComparisonContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Comparing Carriers</h1>
      <p className="text-lg text-gray-600 mb-6">
        Make data-driven decisions about carrier selection by comparing performance.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Compare</h2>

      <Step number={1} title="Select Carriers">
        Choose two or more carriers you want to compare.
      </Step>

      <Step number={2} title="Choose Metrics">
        Select which metrics matter most for your comparison.
      </Step>

      <Step number={3} title="Set Time Period">
        Use the date range selector to compare over a consistent period.
      </Step>

      <Step number={4} title="Analyze Results">
        Review charts and tables showing side-by-side performance.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Comparison Tips</h2>

      <Callout type="tip">
        When comparing carriers, consider factors beyond just price. On-time performance, claims rate,
        and service quality all impact your total cost of shipping.
      </Callout>

      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Compare carriers within the same mode (LTL vs LTL, not LTL vs FTL)</li>
        <li>Use consistent date ranges for fair comparison</li>
        <li>Look at trends over time, not just point-in-time snapshots</li>
        <li>Consider lane-specific performance for regional decisions</li>
      </ul>
    </div>
  );
}

export function CustomerProfilesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Customer Intelligence Profiles</h1>
      <p className="text-lg text-gray-600 mb-6">
        Create detailed profiles for each customer to help the AI provide more relevant analysis.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Profile Components</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Industry & Terminology</h4>
          <p className="text-gray-600 text-sm">
            Define the customer's industry and any special terms they use. This helps AI reports use familiar language.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Key Markets</h4>
          <p className="text-gray-600 text-sm">
            Specify important shipping regions and lanes so analysis focuses on what matters.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Benchmarks</h4>
          <p className="text-gray-600 text-sm">
            Set target metrics like cost per shipment or on-time rates to measure against.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Account Notes</h4>
          <p className="text-gray-600 text-sm">
            Store important context like contract terms, special requirements, or seasonal patterns.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Profiles</h2>

      <Step number={1} title="Access Knowledge Base">
        Navigate to Admin, then Knowledge Base.
      </Step>

      <Step number={2} title="Select Customer">
        Choose the customer whose profile you want to edit.
      </Step>

      <Step number={3} title="Update Profile Sections">
        Fill in relevant information in each section.
      </Step>

      <Step number={4} title="View History">
        Track changes to the profile over time.
      </Step>

      <Callout type="tip">
        The more complete a customer's profile, the better AI-generated reports will match their expectations and use their preferred terminology.
      </Callout>
    </div>
  );
}

export function KnowledgeBaseContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Knowledge Base stores information that helps the AI understand your business and provide better analysis.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What's in the Knowledge Base</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-teal-600" />
          <span>Customer Intelligence Profiles</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-teal-600" />
          <span>Business Glossary & Terminology</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-teal-600" />
          <span>Field Mappings & Definitions</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-teal-600" />
          <span>Calculation Rules & Formulas</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How AI Uses This Information</h2>
      <p className="text-gray-600 mb-4">
        When generating reports, the AI references the knowledge base to:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Use customer-specific terminology in reports</li>
        <li>Focus on metrics the customer cares about</li>
        <li>Compare against their defined benchmarks</li>
        <li>Provide context-aware insights</li>
      </ul>
    </div>
  );
}

export function LearningQueueContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Learning Queue</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Learning Queue shows AI-identified knowledge gaps that need human review.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How It Works</h2>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">AI Detects Unknown Terms</h4>
            <p className="text-sm text-gray-600">When the AI encounters terminology or patterns it doesn't recognize, it adds an item to the queue.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Human Review</h4>
            <p className="text-sm text-gray-600">Admin users review the queue and provide definitions or mappings.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-lg">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Brain className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">AI Learns</h4>
            <p className="text-sm text-gray-600">Approved definitions are added to the knowledge base for future use.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Processing Queue Items</h2>

      <Step number={1} title="Review the Item">
        Read the context where the unknown term was found.
      </Step>

      <Step number={2} title="Provide Definition">
        Add a clear definition or map to an existing concept.
      </Step>

      <Step number={3} title="Approve or Reject">
        Approve to add to knowledge base, or reject if not useful.
      </Step>
    </div>
  );
}

export function UserManagementContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">User Management</h1>
      <p className="text-lg text-gray-600 mb-6">
        Manage user accounts, roles, and access permissions.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Roles</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold">Admin</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Full access to all features, all customers, and administrative settings.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold">Customer User</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Access to their own customer's data, reports, and standard features.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Users</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>View all users in the system</li>
        <li>Assign or change user roles</li>
        <li>Associate users with customer accounts</li>
        <li>Deactivate user access when needed</li>
      </ul>

      <Callout type="warning">
        User role changes take effect immediately. Be careful when modifying admin access.
      </Callout>
    </div>
  );
}

export function ImpersonationContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">View As Customer</h1>
      <p className="text-lg text-gray-600 mb-6">
        The "View As Customer" feature lets admins see exactly what a customer sees in the application.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">When to Use</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Troubleshooting customer-reported issues</li>
        <li>Verifying data accuracy from their perspective</li>
        <li>Testing new features before customer rollout</li>
        <li>Creating reports that match customer expectations</li>
        <li>Training or demos for specific customer accounts</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Open Customer Switcher">
        Click the customer dropdown in the header.
      </Step>

      <Step number={2} title="Select a Customer">
        Search for and select the customer you want to view as.
      </Step>

      <Step number={3} title="Notice the Indicator">
        A banner appears showing you're in customer view mode.
      </Step>

      <Step number={4} title="Exit When Done">
        Click "Exit Customer View" to return to admin mode.
      </Step>

      <Callout type="warning">
        While viewing as a customer, you see only their data and have their permission level. Some admin features will be hidden.
      </Callout>
    </div>
  );
}

export function NotificationCenterContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Notification Center</h1>
      <p className="text-lg text-gray-600 mb-6">
        Stay informed about important events and updates through the notification system.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Accessing Notifications</h2>
      <p className="text-gray-600 mb-4">
        Click the bell icon in the header to open the notification panel. A badge shows unread notification count.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Notification Features</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>Mark individual notifications as read</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>Mark all notifications as read at once</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>Click notifications to navigate to relevant content</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>Delete old notifications to keep the list clean</span>
        </div>
      </div>
    </div>
  );
}

export function AlertTypesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Alert Types</h1>
      <p className="text-lg text-gray-600 mb-6">
        Different types of notifications keep you informed about various system events.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Notification Categories</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Report Notifications</h4>
          <p className="text-gray-600 text-sm">
            Scheduled reports completed, new reports shared with you, report generation failures.
          </p>
        </div>
        <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
          <h4 className="font-semibold text-gray-900 mb-1">System Updates</h4>
          <p className="text-gray-600 text-sm">
            New features available, maintenance windows, important announcements.
          </p>
        </div>
        <div className="p-4 border-l-4 border-amber-500 bg-amber-50 rounded-r-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Shipment Alerts</h4>
          <p className="text-gray-600 text-sm">
            Delivery exceptions, status changes, deadline warnings.
          </p>
        </div>
        <div className="p-4 border-l-4 border-teal-500 bg-teal-50 rounded-r-lg">
          <h4 className="font-semibold text-gray-900 mb-1">AI Learning</h4>
          <p className="text-gray-600 text-sm">
            New items in the learning queue, knowledge base updates requiring review.
          </p>
        </div>
      </div>

      <Callout type="tip">
        You can customize which types of notifications you receive in your user settings.
      </Callout>
    </div>
  );
}
