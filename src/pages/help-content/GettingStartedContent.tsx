import {
  LayoutDashboard, Truck, Sparkles, Calendar, CheckCircle
} from 'lucide-react';
import { FeatureCard, Callout, Step } from './HelpComponents';

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
