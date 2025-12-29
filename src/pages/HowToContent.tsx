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
      <div className="p-2 bg-rocket-100 rounded-lg h-fit">
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
    info: 'bg-rocket-50 border-rocket-200 text-rocket-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    example: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  const icons = {
    tip: <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-rocket-600 flex-shrink-0 mt-0.5" />,
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
      <div className="flex-shrink-0 w-8 h-8 bg-rocket-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
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
          icon={<LayoutDashboard className="w-5 h-5 text-rocket-600" />}
          title="View Real-Time Metrics"
          description="See shipment counts, spend, and performance at a glance"
        />
        <FeatureCard
          icon={<Truck className="w-5 h-5 text-rocket-600" />}
          title="Track Shipments"
          description="Search, filter, and view detailed shipment information"
        />
        <FeatureCard
          icon={<Sparkles className="w-5 h-5 text-rocket-600" />}
          title="Generate AI Reports"
          description="Ask questions in plain English and get instant insights"
        />
        <FeatureCard
          icon={<Calendar className="w-5 h-5 text-rocket-600" />}
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

export function NavigationContent({ isAdmin = false }: { isAdmin?: boolean }) {
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

      {isAdmin && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Admin Navigation</h2>
          <p className="text-gray-600 mb-4">As an admin, you also have access to:</p>
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
        </>
      )}

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Header Elements</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Customer Selector</strong> - Switch between customers (if you have access to multiple)</li>
        <li><strong>Notification Bell</strong> - View alerts and system notifications</li>
        <li><strong>User Menu</strong> - Access your profile and logout</li>
      </ul>
    </div>
  );
}

export function CustomerSwitchingContent({ isAdmin = false }: { isAdmin?: boolean }) {
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

      {isAdmin && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Admin: View As Customer</h2>
          <p className="text-gray-600 mb-4">
            As an administrator, you have a "View as" feature that lets you see the dashboard
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
        </>
      )}
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
        Find the <Sparkles className="w-4 h-4 inline text-rocket-600" /> sparkle icon on any widget or metric.
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
              <td className="p-3 border"><span className="px-2 py-1 bg-rocket-100 text-rocket-700 rounded text-sm">In Transit</span></td>
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
            <p className="text-sm text-gray-600">"Show as a bar chart" or "Give me a table"</p>
          </div>
        </div>
      </div>

      <Callout type="info">
        The AI has access to your full shipment database. It can answer specific
        questions about individual shipments, carriers, lanes, and trends.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Exporting AI Reports</h2>
      <p className="text-gray-600 mb-4">
        When the AI generates a table or data, you can export it using the Export
        button that appears above the results.
      </p>
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

export function CarrierPerformanceContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Carrier Performance</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Carriers page provides comprehensive metrics and comparisons for all
        carriers handling your freight.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Summary Metrics</h2>
      <p className="text-gray-600 mb-4">At the top of the page, you'll see:</p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Active Carriers</h4>
          <p className="text-gray-600 text-sm">Number of carriers with shipments in the period</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Total Spend</h4>
          <p className="text-gray-600 text-sm">Combined spend across all carriers</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">Average Cost per Shipment</h4>
          <p className="text-gray-600 text-sm">Overall average across all carriers</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-1">On-Time Percentage</h4>
          <p className="text-gray-600 text-sm">Aggregate on-time delivery rate</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Carrier Table</h2>
      <p className="text-gray-600 mb-4">The table shows each carrier with:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Carrier name</li>
        <li>Shipment count</li>
        <li>Total spend</li>
        <li>Average cost per shipment</li>
        <li>Total weight handled</li>
        <li>Market share percentage</li>
        <li>On-time delivery rate</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Sorting</h2>
      <p className="text-gray-600 mb-4">
        Click any column header to sort the table by that metric. This makes it easy
        to find your highest-volume carrier, most expensive carrier, or best performer.
      </p>
    </div>
  );
}

export function CarrierComparisonContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Comparing Carriers</h1>
      <p className="text-lg text-gray-600 mb-6">
        Use the Carriers page to compare carrier performance and make data-driven
        decisions about carrier selection.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Spend Distribution Chart</h2>
      <p className="text-gray-600 mb-4">
        The pie chart shows how your spend is distributed across carriers. Hover over
        any segment to see the exact amount and percentage.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Monthly Trend Chart</h2>
      <p className="text-gray-600 mb-4">
        The line chart shows spend trends over time for your top carriers. This helps
        identify:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Seasonal patterns in carrier usage</li>
        <li>Shifts in carrier preference over time</li>
        <li>Sudden changes that may need investigation</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Ask AI for Analysis</h2>
      <p className="text-gray-600 mb-4">
        Click the "Ask AI" button to get intelligent analysis of your carrier data.
        Example questions:
      </p>
      <div className="grid md:grid-cols-1 gap-3 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Why did we use more ABF this month?"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Which carrier is best for California shipments?"
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
          "Compare Old Dominion and Estes for my volume"
        </div>
      </div>

      <Callout type="tip">
        When comparing carriers, consider factors beyond just price. On-time performance, claims rate,
        and service quality all impact your total cost of shipping.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Exporting Carrier Data</h2>
      <p className="text-gray-600 mb-4">
        Use the Export button to download the carrier comparison table in CSV, Excel,
        or PDF format.
      </p>
    </div>
  );
}

export function CustomerProfilesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Customer Intelligence Profiles</h1>
      <p className="text-lg text-gray-600 mb-6">
        Customer Intelligence Profiles store information about each customer that helps
        the AI provide more relevant and accurate responses.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Profile Sections</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Business Priorities</h4>
          <p className="text-gray-600 text-sm">
            What matters most to this customer? Cost savings? Transit time? Service quality?
            This helps the AI emphasize the right metrics.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Products & Services</h4>
          <p className="text-gray-600 text-sm">
            What does this customer ship? Understanding their products helps the AI provide
            relevant context and suggestions.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Target Markets</h4>
          <p className="text-gray-600 text-sm">
            Where does this customer primarily ship? Geographic focus areas and key lanes.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Terminology</h4>
          <p className="text-gray-600 text-sm">
            Customer-specific terms, abbreviations, or jargon. For example, if a customer
            calls something "SKU" that others call "Item Number."
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Benchmarks</h4>
          <p className="text-gray-600 text-sm">
            Target metrics for this customer like maximum cost per shipment or minimum
            on-time percentage.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Creating/Editing Profiles</h2>

      <Step number={1} title="Navigate to Customer Profiles">
        Navigate to <strong>Admin</strong> then <strong>Customer Profiles</strong>.
      </Step>

      <Step number={2} title="Select or Create">
        Click on a customer or <strong>Create New</strong>.
      </Step>

      <Step number={3} title="Fill In Sections">
        Fill in each section with relevant information.
      </Step>

      <Step number={4} title="Save">
        Click <strong>Save</strong>.
      </Step>

      <Callout type="tip">
        Well-maintained customer profiles significantly improve AI response quality.
        Take time to fill these out completely.
      </Callout>
    </div>
  );
}

export function KnowledgeBaseContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Knowledge Base stores documents and information that the AI can reference
        when answering questions.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Uploading Documents</h2>

      <Step number={1} title="Navigate to Knowledge Base">
        Navigate to <strong>Admin</strong> then <strong>Knowledge Base</strong>.
      </Step>

      <Step number={2} title="Click Upload Document">
        Click <strong>Upload Document</strong>.
      </Step>

      <Step number={3} title="Select a File">
        Select a file (PDF, Word, or text).
      </Step>

      <Step number={4} title="Choose Customers">
        Choose which customer(s) this applies to.
      </Step>

      <Step number={5} title="Add Tags and Upload">
        Add tags for organization and click <strong>Upload</strong>.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Supported Document Types</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 border rounded-lg">
          <span className="font-medium">PDF files</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Word documents (.doc, .docx)</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Text files (.txt)</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">CSV files</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Use Cases</h2>
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <BookOpen className="w-5 h-5 text-rocket-600" />
          <div>
            <span className="font-medium">Rate sheets</span>
            <p className="text-sm text-gray-500">Help AI understand pricing</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <BookOpen className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Service guides</span>
            <p className="text-sm text-gray-500">Carrier capabilities and restrictions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <BookOpen className="w-5 h-5 text-teal-600" />
          <div>
            <span className="font-medium">Customer contracts</span>
            <p className="text-sm text-gray-500">Specific terms and conditions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <div>
            <span className="font-medium">Procedure documents</span>
            <p className="text-sm text-gray-500">How to handle special situations</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Documents</h2>
      <p className="text-gray-600 mb-4">From the Knowledge Base, you can:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>View document contents</li>
        <li>Edit metadata and tags</li>
        <li>Change customer assignments</li>
        <li>Delete outdated documents</li>
      </ul>
    </div>
  );
}

export function LearningQueueContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Learning Queue</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Learning Queue captures questions and terms that the AI couldn't fully
        understand, flagging them for human review.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How It Works</h2>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-rocket-50 rounded-lg">
          <div className="p-2 bg-rocket-100 rounded-lg">
            <Zap className="w-5 h-5 text-rocket-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">1. User asks a question</h4>
            <p className="text-sm text-gray-600">User asks a question in AI Studio.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">2. AI encounters unknown term</h4>
            <p className="text-sm text-gray-600">AI encounters an unknown term or concept.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">3. Item added to queue</h4>
            <p className="text-sm text-gray-600">Item is added to the Learning Queue for admin review.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-lg">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Brain className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">4. Admin reviews and AI learns</h4>
            <p className="text-sm text-gray-600">Admin provides clarification. AI learns from the feedback.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reviewing Queue Items</h2>

      <Step number={1} title="Navigate to Knowledge Base">
        Navigate to <strong>Admin</strong> then <strong>Knowledge Base</strong>.
      </Step>

      <Step number={2} title="Click Learning Queue Tab">
        Click the <strong>Learning Queue</strong> tab.
      </Step>

      <Step number={3} title="Review Each Item">
        Review each item showing the original question, the unknown term, and which customer it came from.
      </Step>

      <Step number={4} title="Provide Clarification">
        Provide clarification or add to Knowledge Base.
      </Step>

      <Step number={5} title="Mark as Resolved">
        Mark as resolved.
      </Step>

      <Callout type="info">
        Regularly reviewing the Learning Queue helps the AI get smarter and more
        accurate for your specific business needs.
      </Callout>
    </div>
  );
}

export function UserManagementContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">User Management</h1>
      <p className="text-lg text-gray-600 mb-6">
        Administrators can add, edit, and manage user accounts from the User Management page.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Roles</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Role</th>
              <th className="text-left p-3 border font-semibold">Permissions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rocket-600" />
                  <strong>Admin</strong>
                </div>
              </td>
              <td className="p-3 border">Full access to all features, all customers, and admin settings</td>
            </tr>
            <tr>
              <td className="p-3 border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <strong>Customer</strong>
                </div>
              </td>
              <td className="p-3 border">Access only to assigned customer(s) data, no admin features</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Adding a New User</h2>

      <Step number={1} title="Navigate to User Management">
        Navigate to <strong>Admin</strong> then <strong>User Management</strong>.
      </Step>

      <Step number={2} title="Click Add User">
        Click <strong>Add User</strong>.
      </Step>

      <Step number={3} title="Enter Email">
        Enter email address.
      </Step>

      <Step number={4} title="Select Role">
        Select role (Admin or Customer).
      </Step>

      <Step number={5} title="Assign to Customers">
        If Customer role, assign to specific customer(s).
      </Step>

      <Step number={6} title="Send Invitation">
        Click <strong>Send Invitation</strong>.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Existing Users</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Edit</strong> - Change role or customer assignments</li>
        <li><strong>Disable</strong> - Temporarily block access</li>
        <li><strong>Delete</strong> - Permanently remove the user</li>
        <li><strong>Resend Invitation</strong> - For users who haven't activated</li>
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
        The "View As" feature lets administrators see the dashboard exactly as a
        specific customer user would see it.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">When to Use</h2>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Troubleshooting customer-reported issues</li>
        <li>Verifying that customer sees correct data</li>
        <li>Testing customer-specific configurations</li>
        <li>Demonstrating features to customers</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Click View As Dropdown">
        Click the <strong>"View as"</strong> dropdown in the header.
      </Step>

      <Step number={2} title="Select Customer">
        Select the customer you want to impersonate.
      </Step>

      <Step number={3} title="Notice the Banner">
        An <strong>orange banner</strong> appears confirming "Viewing as [Customer]".
      </Step>

      <Step number={4} title="Navigate Freely">
        Navigate the dashboard - you'll see exactly what the customer sees.
      </Step>

      <Step number={5} title="Exit When Done">
        Click <strong>"Exit"</strong> in the banner to return to admin view.
      </Step>

      <Callout type="warning">
        While in "View As" mode, you have the same permissions as that customer.
        Admin-only features and other customers' data will be hidden.
      </Callout>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Changes</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Data is filtered to only that customer's shipments</li>
        <li>Admin menu items are hidden</li>
        <li>Reports show only that customer's reports</li>
        <li>Customer Intelligence Profile is applied to AI responses</li>
      </ul>
    </div>
  );
}

export function NotificationCenterContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Notification Center</h1>
      <p className="text-lg text-gray-600 mb-6">
        The notification bell in the header keeps you informed about important events
        and updates.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Accessing Notifications</h2>

      <Step number={1} title="Click the Bell Icon">
        Click the <strong>bell icon</strong> in the top-right header.
      </Step>

      <Step number={2} title="View Notifications">
        A dropdown shows your recent notifications. Unread notifications are highlighted.
      </Step>

      <Step number={3} title="Click to Navigate">
        Click any notification to navigate to the related page.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Notification Badge</h2>
      <p className="text-gray-600 mb-4">
        The red badge on the bell shows the count of unread notifications. This
        updates in real-time as new notifications arrive.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Managing Notifications</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Mark as read</span>
            <p className="text-sm text-gray-500">Click a notification to mark it read</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Mark all as read</span>
            <p className="text-sm text-gray-500">Click the link at the top of the dropdown</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <span className="font-medium">Delete</span>
            <p className="text-sm text-gray-500">Click the trash icon on individual notifications</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertTypesContent({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Alert Types</h1>
      <p className="text-lg text-gray-600 mb-6">
        The system generates different types of notifications based on events.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Notification Types</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Type</th>
              <th className="text-left p-3 border font-semibold">When It's Sent</th>
              <th className="text-left p-3 border font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>Shipment Delivered</strong></td>
              <td className="p-3 border">When a shipment is marked as delivered</td>
              <td className="p-3 border"><span className="text-gray-500">Low</span></td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Shipment Exception</strong></td>
              <td className="p-3 border">When a delivery issue or exception occurs</td>
              <td className="p-3 border"><span className="text-red-600 font-medium">High</span></td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Shipment Delayed</strong></td>
              <td className="p-3 border">When expected delivery date changes</td>
              <td className="p-3 border"><span className="text-amber-600 font-medium">Medium</span></td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Report Ready</strong></td>
              <td className="p-3 border">When a scheduled report has been generated</td>
              <td className="p-3 border"><span className="text-amber-600 font-medium">Medium</span></td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Schedule Complete</strong></td>
              <td className="p-3 border">When a scheduled report has been sent</td>
              <td className="p-3 border"><span className="text-gray-500">Low</span></td>
            </tr>
            {isAdmin && (
              <tr>
                <td className="p-3 border"><strong>Learning Queue</strong></td>
                <td className="p-3 border">When AI encounters unknown terms (admin only)</td>
                <td className="p-3 border"><span className="text-gray-500">Low</span></td>
              </tr>
            )}
            <tr>
              <td className="p-3 border"><strong>System</strong></td>
              <td className="p-3 border">General system announcements</td>
              <td className="p-3 border"><span className="text-gray-500">Varies</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Priority Indicators</h2>
      <p className="text-gray-600 mb-4">Notifications are color-coded by priority:</p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
          <span className="text-red-700">Red border - Urgent, requires immediate attention</span>
        </div>
        <div className="flex items-center gap-3 p-3 border-l-4 border-amber-500 bg-amber-50 rounded-r-lg">
          <span className="text-amber-700">Orange border - High priority</span>
        </div>
        <div className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
          <span className="text-blue-700">Blue border - Medium priority</span>
        </div>
        <div className="flex items-center gap-3 p-3 border-l-4 border-gray-400 bg-gray-50 rounded-r-lg">
          <span className="text-gray-700">Gray border - Low priority, informational</span>
        </div>
      </div>

      <Callout type="tip">
        You can customize which types of notifications you receive in your user settings.
      </Callout>
    </div>
  );
}

export function ContactSupportContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Support</h1>
      <p className="text-lg text-gray-600 mb-6">
        Need help with something not covered in this guide? We're here to help!
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Options</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-gray-600">
            Send an email to <strong>support@gorocketshipping.com</strong> and we'll
            respond within 24 hours.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
          <p className="text-gray-600">
            Call us at <strong>1-800-XXX-XXXX</strong> during business hours
            (Monday-Friday, 8am-6pm EST).
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">When Contacting Support</h2>
      <p className="text-gray-600 mb-4">To help us resolve your issue quickly, please include:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li>Your company name</li>
        <li>A description of the issue</li>
        <li>Steps to reproduce the problem (if applicable)</li>
        <li>Screenshots if helpful</li>
        <li>The Load ID or PRO number if it's about a specific shipment</li>
      </ul>

      <Callout type="tip">
        For urgent shipment issues, always include the Load ID so we can quickly
        locate your shipment in the system.
      </Callout>
    </div>
  );
}

export function FAQContent({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">General</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How do I change my password?</h3>
          <p className="text-gray-600">
            Click your email in the top-right corner, then select "Profile" or "Settings".
            From there you can update your password.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Why can't I see some shipments?</h3>
          <p className="text-gray-600">
            You can only see shipments for the customer accounts you're assigned to.
            If you need access to additional accounts, contact your administrator.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How far back does the data go?</h3>
          <p className="text-gray-600">
            The dashboard contains your complete shipment history. Use the date range
            selector to view any time period.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reports</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How do I get a report emailed to me automatically?</h3>
          <p className="text-gray-600">
            Create or view a report, then click "Schedule" to set up recurring delivery.
            You can choose daily, weekly, or monthly delivery.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Can I share reports with people outside my company?</h3>
          <p className="text-gray-600">
            Yes! Use the "Email" button to send any report to any email address. You can
            also export to PDF and share manually.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">AI Features</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How does the AI know about my shipments?</h3>
          <p className="text-gray-600">
            The AI has access to your shipment data within the system. It can answer
            questions about your specific shipments, carriers, lanes, and trends.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Is my data used to train the AI?</h3>
          <p className="text-gray-600">
            No. Your shipment data is only used to answer your questions. It is not
            used to train or improve the AI model.
          </p>
        </div>
      </div>

      {isAdmin && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Admin FAQ</h2>

          <div className="space-y-4 mb-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">How do I add a new user?</h3>
              <p className="text-gray-600">
                Go to Admin then User Management then Add User. Enter their email and assign
                them to the appropriate customer accounts.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">How do I improve AI responses for a customer?</h3>
              <p className="text-gray-600">
                Update their Customer Intelligence Profile with accurate business priorities,
                terminology, and products. Also upload relevant documents to the Knowledge Base.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">What should I do with Learning Queue items?</h3>
              <p className="text-gray-600">
                Review each item, add clarification or context, and either add to the
                Knowledge Base or mark as resolved. This helps the AI learn.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
