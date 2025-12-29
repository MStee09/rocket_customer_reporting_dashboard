import { useState } from 'react';
import {
  Book, Search, ChevronRight, ChevronDown,
  LayoutDashboard, Truck, BarChart3,
  Building2, Settings, Bell,
  BookOpen, Sparkles, Filter, Download,
  Mail, Calendar, Users, Brain, Eye,
  MousePointer, Clock, TrendingUp, Zap,
  CheckCircle, AlertCircle, Info, ArrowRight
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  subsections: {
    id: string;
    title: string;
    content: React.ReactNode;
  }[];
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg my-4">
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-800">{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg my-4">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800">{children}</div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-blue-600">{icon}</div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function OverviewContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Overview</h1>
      <p className="text-lg text-gray-600 mb-6">
        Welcome to the Freight Reporting Dashboard. This comprehensive platform provides real-time visibility
        into your shipping operations, advanced analytics, and AI-powered insights.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Key Features</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <FeatureCard
          icon={<LayoutDashboard className="w-5 h-5" />}
          title="Interactive Dashboard"
          description="Customizable widgets showing your most important metrics at a glance."
        />
        <FeatureCard
          icon={<Truck className="w-5 h-5" />}
          title="Shipment Tracking"
          description="Real-time status updates and detailed shipment information."
        />
        <FeatureCard
          icon={<Sparkles className="w-5 h-5" />}
          title="AI-Powered Reports"
          description="Generate custom reports using natural language prompts."
        />
        <FeatureCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="Advanced Analytics"
          description="Deep insights into costs, carriers, and shipping patterns."
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Getting Started Checklist</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700">Explore the main dashboard and understand your key metrics</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700">Use the Shipments page to search and filter your shipments</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700">Try the AI Report Studio to create your first custom report</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-gray-700">Set up scheduled reports for automatic delivery</span>
        </div>
      </div>
    </div>
  );
}

function NavigationContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Navigation Guide</h1>
      <p className="text-lg text-gray-600 mb-6">
        Learn how to navigate the dashboard efficiently using the sidebar and header controls.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Sidebar Navigation</h2>
      <p className="text-gray-600 mb-4">
        The left sidebar provides quick access to all major sections of the application:
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-medium">Dashboard</span>
            <span className="text-gray-500 ml-2">- Your main overview with customizable widgets</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Truck className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-medium">Shipments</span>
            <span className="text-gray-500 ml-2">- Search, filter, and view all shipments</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-medium">Analytics</span>
            <span className="text-gray-500 ml-2">- Reports hub, AI studio, and insights</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600" />
          <div>
            <span className="font-medium">Carriers</span>
            <span className="text-gray-500 ml-2">- Carrier performance and comparison</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Header Controls</h2>
      <p className="text-gray-600 mb-4">
        The header bar contains important controls and information:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>Notification Bell</strong> - View alerts and system notifications</li>
        <li><strong>Customer Switcher</strong> - Switch between customer accounts (admin only)</li>
        <li><strong>User Menu</strong> - Access settings and sign out</li>
      </ul>

      <Tip>
        Use keyboard shortcuts for faster navigation: Press <code className="px-2 py-1 bg-gray-100 rounded">?</code> anywhere to see available shortcuts.
      </Tip>
    </div>
  );
}

function CustomerSwitchingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Switching Customers</h1>
      <p className="text-lg text-gray-600 mb-6">
        Admin users can view the dashboard as any customer to provide better support and understand their perspective.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Switch Customers</h2>

      <Step number={1} title="Open the Customer Switcher">
        Click on the customer dropdown in the header bar. You'll see a list of all customers you have access to.
      </Step>

      <Step number={2} title="Search or Select a Customer">
        Type to search for a specific customer, or scroll through the list and click to select.
      </Step>

      <Step number={3} title="View as Customer">
        Once selected, the entire dashboard will update to show only that customer's data. A banner will indicate you're viewing as a customer.
      </Step>

      <Step number={4} title="Return to Admin View">
        Click "Exit Customer View" in the banner or select "All Customers" from the switcher to return to the admin view.
      </Step>

      <Warning>
        When viewing as a customer, you'll see exactly what they see - including any limitations based on their access level. Some admin features will be hidden.
      </Warning>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Use Cases</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Troubleshoot issues a customer is experiencing</li>
        <li>Verify data accuracy from the customer's perspective</li>
        <li>Create reports that match what the customer would see</li>
        <li>Test new features before rolling out to customers</li>
      </ul>
    </div>
  );
}

function DateRangesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Using Date Ranges</h1>
      <p className="text-lg text-gray-600 mb-6">
        Control the time period for your data using date range selectors throughout the application.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Preset Date Ranges</h2>
      <p className="text-gray-600 mb-4">
        Quick select options for common time periods:
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 7 Days</span>
          <span className="text-gray-500 block text-sm">Recent activity snapshot</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 30 Days</span>
          <span className="text-gray-500 block text-sm">Monthly performance view</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 90 Days</span>
          <span className="text-gray-500 block text-sm">Quarterly analysis</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Last 6 Months</span>
          <span className="text-gray-500 block text-sm">Half-year trends</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">This Month/Quarter/Year</span>
          <span className="text-gray-500 block text-sm">Current period to date</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Next 30/90 Days</span>
          <span className="text-gray-500 block text-sm">Upcoming scheduled shipments</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Period Comparison</h2>
      <p className="text-gray-600 mb-4">
        Compare your current metrics against previous periods:
      </p>

      <Step number={1} title="Enable Comparison Mode">
        Click the "Compare" button next to the date range selector.
      </Step>

      <Step number={2} title="Choose Comparison Period">
        Select from Previous Period, Same Period Last Year, or Custom Range.
      </Step>

      <Step number={3} title="View Comparison Metrics">
        Metrics will now show percentage changes with up/down indicators.
      </Step>

      <Tip>
        Period comparison is especially useful for identifying seasonal trends and year-over-year growth.
      </Tip>
    </div>
  );
}

function MetricsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Understanding Metrics</h1>
      <p className="text-lg text-gray-600 mb-6">
        Learn what each metric means and how to interpret the data on your dashboard.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Key Performance Indicators</h2>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold">Total Spend</h4>
          </div>
          <p className="text-gray-600 text-sm">
            The sum of all customer charges for shipments in the selected date range. This is your total transportation cost.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold">Shipment Count</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Total number of shipments created or with activity in the selected period. Includes all statuses.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold">Average Cost per Shipment</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Total spend divided by shipment count. Helps track efficiency and identify cost trends.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold">In Transit</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Number of shipments currently in transit. Updates in real-time as shipments move through the network.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reading Trend Indicators</h2>
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <ArrowRight className="w-4 h-4 text-green-600 -rotate-45" />
          <span className="text-sm text-green-700">Positive change (increase)</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <ArrowRight className="w-4 h-4 text-red-600 rotate-45" />
          <span className="text-sm text-red-700">Negative change (decrease)</span>
        </div>
      </div>
      <p className="text-gray-600">
        Note: For cost metrics, a decrease (red) might actually be positive for your business. Context matters!
      </p>
    </div>
  );
}

function WidgetsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Widgets</h1>
      <p className="text-lg text-gray-600 mb-6">
        Customize your dashboard with widgets that show the information most important to you.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Available Widget Types</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <FeatureCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="KPI Widgets"
          description="Single metric display with optional trend indicator and comparison."
        />
        <FeatureCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="Chart Widgets"
          description="Bar charts, line charts, and pie charts for visual data analysis."
        />
        <FeatureCard
          icon={<Truck className="w-5 h-5" />}
          title="Table Widgets"
          description="Ranked lists and detailed data tables."
        />
        <FeatureCard
          icon={<Building2 className="w-5 h-5" />}
          title="Map Widgets"
          description="Geographic visualizations of shipping data."
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Customizing Your Dashboard</h2>

      <Step number={1} title="Click 'Customize'">
        Find the Customize button in the top right of your dashboard.
      </Step>

      <Step number={2} title="Drag to Reorder">
        Drag widgets to change their position on the dashboard.
      </Step>

      <Step number={3} title="Resize Widgets">
        Click the size buttons to make widgets larger or smaller.
      </Step>

      <Step number={4} title="Add or Remove Widgets">
        Use the widget library to add new widgets or remove ones you don't need.
      </Step>

      <Step number={5} title="Save Your Layout">
        Click Save to preserve your customizations. They'll persist across sessions.
      </Step>

      <Tip>
        Your dashboard layout is saved per-customer, so you can have different layouts for different accounts.
      </Tip>
    </div>
  );
}

function AIInsightsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Insights Card</h1>
      <p className="text-lg text-gray-600 mb-6">
        The AI Insights card at the top of your dashboard provides automated analysis of your shipping data.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What AI Insights Provides</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900">Trend Analysis</h4>
            <p className="text-sm text-gray-600">Automatic detection of significant changes in your shipping patterns.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900">Cost Optimization Tips</h4>
            <p className="text-sm text-gray-600">Suggestions for reducing shipping costs based on your data.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900">Anomaly Alerts</h4>
            <p className="text-sm text-gray-600">Notifications when unusual patterns are detected.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Using AI Insights</h2>
      <p className="text-gray-600 mb-4">
        The AI analyzes your data automatically and updates insights based on:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>The currently selected date range</li>
        <li>Your customer's specific shipping patterns</li>
        <li>Historical data for trend comparison</li>
        <li>Industry benchmarks where available</li>
      </ul>

      <Tip>
        Click on any insight to dive deeper into the AI Report Studio where you can explore the data further.
      </Tip>
    </div>
  );
}

function AskAIContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Ask AI Buttons</h1>
      <p className="text-lg text-gray-600 mb-6">
        Throughout the application, you'll find "Ask AI" buttons that let you get instant analysis of specific data.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Where to Find Ask AI</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>On individual shipment cards - analyze a specific shipment</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>On dashboard widgets - dive deeper into that metric</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>In report views - ask questions about the data</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How It Works</h2>

      <Step number={1} title="Click 'Ask AI'">
        Click the Ask AI button on any supported element.
      </Step>

      <Step number={2} title="Context is Preserved">
        The AI automatically receives context about what you're looking at.
      </Step>

      <Step number={3} title="AI Report Studio Opens">
        You're taken to the AI studio with a pre-filled prompt based on your context.
      </Step>

      <Step number={4} title="Get Instant Analysis">
        The AI generates a detailed report about that specific data.
      </Step>

      <Tip>
        The AI understands your customer's terminology and preferences when analyzing data, thanks to the knowledge base.
      </Tip>
    </div>
  );
}

function ViewingShipmentsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Viewing Shipments</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Shipments page is your central hub for tracking and managing all shipments.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Shipment List View</h2>
      <p className="text-gray-600 mb-4">
        Each shipment card shows key information at a glance:
      </p>

      <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
        <li><strong>Load ID</strong> - Unique identifier for the shipment</li>
        <li><strong>Status</strong> - Current state (Pending, In Transit, Delivered, etc.)</li>
        <li><strong>Route</strong> - Origin and destination cities</li>
        <li><strong>Carrier</strong> - The carrier handling the shipment</li>
        <li><strong>Mode</strong> - LTL, FTL, Partial, etc.</li>
        <li><strong>Pickup Date</strong> - Scheduled or actual pickup date</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Status Tabs</h2>
      <p className="text-gray-600 mb-4">
        Use the status tabs to quickly filter shipments by their current state:
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">All</span>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">In Transit</span>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Pending Pickup</span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Delivered</span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Completed</span>
      </div>

      <Tip>
        Click on any shipment to open a quick-view drawer with more details, or click "View Details" to go to the full shipment page.
      </Tip>
    </div>
  );
}

function SearchingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Smart Search</h1>
      <p className="text-lg text-gray-600 mb-6">
        The search bar on the Shipments page supports intelligent, multi-field searching.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What You Can Search</h2>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Load ID</span>
          <span className="text-gray-500 block text-sm">e.g., "12345"</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">PRO Number</span>
          <span className="text-gray-500 block text-sm">Carrier's tracking number</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Reference Numbers</span>
          <span className="text-gray-500 block text-sm">PO#, BOL#, Reference#</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Cities</span>
          <span className="text-gray-500 block text-sm">Origin or destination city</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Carrier Name</span>
          <span className="text-gray-500 block text-sm">e.g., "XPO", "ABF"</span>
        </div>
        <div className="p-3 border rounded-lg">
          <span className="font-medium">Company Names</span>
          <span className="text-gray-500 block text-sm">Shipper or consignee</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Search Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Multiple Terms</span>
            <p className="text-sm text-gray-600">Separate terms with spaces to search for all of them: "Chicago XPO"</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Partial Matching</span>
            <p className="text-sm text-gray-600">Type just part of a word to find matches: "Chi" finds "Chicago"</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <MousePointer className="w-5 h-5 text-gray-500 mt-0.5" />
          <div>
            <span className="font-medium">Clear Search</span>
            <p className="text-sm text-gray-600">Click the X button or press Escape to clear your search</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilteringContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Quick Filters</h1>
      <p className="text-lg text-gray-600 mb-6">
        Use quick filters to narrow down shipments by specific criteria with a single click.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Available Quick Filters</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">In Transit</span>
          <span className="text-gray-600">Shipments currently moving</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Delivered</span>
          <span className="text-gray-600">Completed deliveries</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Pending</span>
          <span className="text-gray-600">Awaiting pickup or dispatch</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Exceptions</span>
          <span className="text-gray-600">Shipments with delays or issues</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">This Week</span>
          <span className="text-gray-600">Pickups scheduled this week</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">High Value</span>
          <span className="text-gray-600">Shipments over $500</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Combining Filters</h2>
      <p className="text-gray-600 mb-4">
        You can combine multiple filters and search terms:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Click multiple quick filter chips to apply them together</li>
        <li>Combine with status tabs for more specific results</li>
        <li>Add search terms to further narrow down</li>
        <li>Click "Clear filters" to reset everything</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Saving Views</h2>
      <p className="text-gray-600 mb-4">
        When you have filters active, you can save the current view for quick access later:
      </p>
      <Step number={1} title="Apply Your Filters">
        Set up the search, status, and quick filters you want to save.
      </Step>
      <Step number={2} title="Click 'Save View'">
        The Save View button appears when you have active filters.
      </Step>
      <Step number={3} title="Name Your View">
        Give it a descriptive name like "High Value This Week" or "Chicago Exceptions".
      </Step>
    </div>
  );
}

function ShipmentDetailsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipment Details</h1>
      <p className="text-lg text-gray-600 mb-6">
        Each shipment has a detailed view with comprehensive information organized into tabs.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Detail Tabs</h2>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Overview</h4>
          <p className="text-gray-600 text-sm">
            Summary of key shipment details including status, dates, route, and carrier information.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Addresses</h4>
          <p className="text-gray-600 text-sm">
            Full pickup and delivery addresses with contact information for each stop.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Items</h4>
          <p className="text-gray-600 text-sm">
            Detailed list of all items on the shipment including weight, dimensions, and freight class.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Carrier</h4>
          <p className="text-gray-600 text-sm">
            Carrier details, PRO number, driver information, and equipment specifications.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Financials</h4>
          <p className="text-gray-600 text-sm">
            Charges breakdown, accessorials, and declared value (admin view only).
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">History</h4>
          <p className="text-gray-600 text-sm">
            Timeline of all status updates and events for the shipment.
          </p>
        </div>
      </div>

      <Tip>
        Use the "Ask AI" button on any shipment to get AI-powered analysis and insights about that specific shipment.
      </Tip>
    </div>
  );
}

function ExportingContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Exporting Data</h1>
      <p className="text-lg text-gray-600 mb-6">
        Export your shipment data in multiple formats for reporting and analysis.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Export Formats</h2>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <FeatureCard
          icon={<Download className="w-5 h-5" />}
          title="CSV"
          description="Comma-separated values for spreadsheets and data tools."
        />
        <FeatureCard
          icon={<Download className="w-5 h-5" />}
          title="Excel"
          description="Native Excel format with formatting preserved."
        />
        <FeatureCard
          icon={<Download className="w-5 h-5" />}
          title="PDF"
          description="Formatted document for printing or sharing."
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Export</h2>

      <Step number={1} title="Filter Your Data">
        Use search and filters to select the shipments you want to export.
      </Step>
      <Step number={2} title="Click Export">
        Find the export dropdown button in the toolbar.
      </Step>
      <Step number={3} title="Choose Format">
        Select your preferred format (CSV, Excel, or PDF).
      </Step>
      <Step number={4} title="Download">
        Your file will download automatically with the current data.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Email Reports</h2>
      <p className="text-gray-600 mb-4">
        You can also email reports directly from the application:
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Click the Email button next to Export</li>
        <li>Enter recipient email addresses</li>
        <li>Add an optional message</li>
        <li>Choose the file format to attach</li>
        <li>Send immediately or schedule for later</li>
      </ul>
    </div>
  );
}

function AnalyticsHubContent() {
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
        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Scheduled Reports</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Set up automatic report generation and delivery on a schedule.
          </p>
        </div>
      </div>

      <Tip>
        Start with the AI Report Studio if you're not sure what data you need. You can always refine and save reports for later.
      </Tip>
    </div>
  );
}

function AIStudioContent() {
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

      <div className="grid md:grid-cols-2 gap-3">
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

function CustomReportsContent() {
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
            <TrendingUp className="w-5 h-5 text-purple-600" />
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

function ScheduledReportsContent() {
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

function CarrierPerformanceContent() {
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

function CarrierComparisonContent() {
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

      <Tip>
        When comparing carriers, consider factors beyond just price. On-time performance, claims rate,
        and service quality all impact your total cost of shipping.
      </Tip>

      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Compare carriers within the same mode (LTL vs LTL, not LTL vs FTL)</li>
        <li>Use consistent date ranges for fair comparison</li>
        <li>Look at trends over time, not just point-in-time snapshots</li>
        <li>Consider lane-specific performance for regional decisions</li>
      </ul>
    </div>
  );
}

function CustomerProfilesContent() {
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
        Navigate to Settings, then Knowledge Base.
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

      <Tip>
        The more complete a customer's profile, the better AI-generated reports will match their expectations and use their preferred terminology.
      </Tip>
    </div>
  );
}

function KnowledgeBaseContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Knowledge Base stores information that helps the AI understand your business and provide better analysis.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What's in the Knowledge Base</h2>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
          <span>Customer Intelligence Profiles</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
          <span>Business Glossary & Terminology</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
          <span>Field Mappings & Definitions</span>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
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

function LearningQueueContent() {
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
        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
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

function UserManagementContent() {
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

      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>View all users in the system</li>
        <li>Assign or change user roles</li>
        <li>Associate users with customer accounts</li>
        <li>Deactivate user access when needed</li>
      </ul>

      <Warning>
        User role changes take effect immediately. Be careful when modifying admin access.
      </Warning>
    </div>
  );
}

function ImpersonationContent() {
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

      <Warning>
        While viewing as a customer, you see only their data and have their permission level. Some admin features will be hidden.
      </Warning>
    </div>
  );
}

function NotificationCenterContent() {
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

function AlertTypesContent() {
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
        <div className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded-r-lg">
          <h4 className="font-semibold text-gray-900 mb-1">AI Learning</h4>
          <p className="text-gray-600 text-sm">
            New items in the learning queue, knowledge base updates requiring review.
          </p>
        </div>
      </div>

      <Tip>
        You can customize which types of notifications you receive in your user settings.
      </Tip>
    </div>
  );
}

function PrevNextButton({
  sections,
  currentSection,
  currentSubsection,
  direction,
  onNavigate
}: {
  sections: DocSection[];
  currentSection: string;
  currentSubsection: string;
  direction: 'prev' | 'next';
  onNavigate: (sectionId: string, subsectionId: string) => void;
}) {
  const allItems: { sectionId: string; subsectionId: string; title: string }[] = [];
  sections.forEach(section => {
    section.subsections.forEach(sub => {
      allItems.push({
        sectionId: section.id,
        subsectionId: sub.id,
        title: sub.title,
      });
    });
  });

  const currentIndex = allItems.findIndex(
    item => item.sectionId === currentSection && item.subsectionId === currentSubsection
  );

  const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
  const target = allItems[targetIndex];

  if (!target) return <div />;

  return (
    <button
      onClick={() => onNavigate(target.sectionId, target.subsectionId)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors
        ${direction === 'prev' ? 'flex-row' : 'flex-row-reverse'}
      `}
    >
      <ChevronRight className={`w-4 h-4 text-gray-400 ${direction === 'prev' ? 'rotate-180' : ''}`} />
      <div className={direction === 'prev' ? 'text-left' : 'text-right'}>
        <div className="text-xs text-gray-500">{direction === 'prev' ? 'Previous' : 'Next'}</div>
        <div className="font-medium text-gray-900">{target.title}</div>
      </div>
    </button>
  );
}

export function HowToPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeSubsection, setActiveSubsection] = useState('overview');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateTo = (sectionId: string, subsectionId: string) => {
    setActiveSection(sectionId);
    setActiveSubsection(subsectionId);
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }
  };

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      subsections: [
        { id: 'overview', title: 'Dashboard Overview', content: <OverviewContent /> },
        { id: 'navigation', title: 'Navigation Guide', content: <NavigationContent /> },
        { id: 'customer-switching', title: 'Switching Customers', content: <CustomerSwitchingContent /> },
        { id: 'date-ranges', title: 'Using Date Ranges', content: <DateRangesContent /> },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      subsections: [
        { id: 'metrics', title: 'Understanding Metrics', content: <MetricsContent /> },
        { id: 'widgets', title: 'Dashboard Widgets', content: <WidgetsContent /> },
        { id: 'ai-insights', title: 'AI Insights Card', content: <AIInsightsContent /> },
        { id: 'ask-ai', title: 'Ask AI Buttons', content: <AskAIContent /> },
      ]
    },
    {
      id: 'shipments',
      title: 'Shipments',
      icon: <Truck className="w-5 h-5" />,
      subsections: [
        { id: 'viewing', title: 'Viewing Shipments', content: <ViewingShipmentsContent /> },
        { id: 'searching', title: 'Smart Search', content: <SearchingContent /> },
        { id: 'filtering', title: 'Quick Filters', content: <FilteringContent /> },
        { id: 'details', title: 'Shipment Details', content: <ShipmentDetailsContent /> },
        { id: 'exporting', title: 'Exporting Data', content: <ExportingContent /> },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      subsections: [
        { id: 'analytics-hub', title: 'Analytics Hub', content: <AnalyticsHubContent /> },
        { id: 'ai-studio', title: 'AI Report Studio', content: <AIStudioContent /> },
        { id: 'custom-reports', title: 'Custom Reports', content: <CustomReportsContent /> },
        { id: 'scheduled-reports', title: 'Scheduled Reports', content: <ScheduledReportsContent /> },
      ]
    },
    {
      id: 'carriers',
      title: 'Carriers',
      icon: <Building2 className="w-5 h-5" />,
      subsections: [
        { id: 'carrier-performance', title: 'Carrier Performance', content: <CarrierPerformanceContent /> },
        { id: 'carrier-comparison', title: 'Comparing Carriers', content: <CarrierComparisonContent /> },
      ]
    },
    {
      id: 'admin',
      title: 'Admin Features',
      icon: <Settings className="w-5 h-5" />,
      subsections: [
        { id: 'customer-profiles', title: 'Customer Intelligence Profiles', content: <CustomerProfilesContent /> },
        { id: 'knowledge-base', title: 'Knowledge Base', content: <KnowledgeBaseContent /> },
        { id: 'learning-queue', title: 'Learning Queue', content: <LearningQueueContent /> },
        { id: 'user-management', title: 'User Management', content: <UserManagementContent /> },
        { id: 'impersonation', title: 'View As Customer', content: <ImpersonationContent /> },
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      subsections: [
        { id: 'notification-center', title: 'Notification Center', content: <NotificationCenterContent /> },
        { id: 'alert-types', title: 'Alert Types', content: <AlertTypesContent /> },
      ]
    },
  ];

  const filteredSections = searchQuery
    ? docSections.map(section => ({
        ...section,
        subsections: section.subsections.filter(sub =>
          sub.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.subsections.length > 0)
    : docSections;

  const currentSection = docSections.find(s => s.id === activeSection);
  const currentSubsection = currentSection?.subsections.find(s => s.id === activeSubsection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">How To Guide</h1>
                <p className="text-sm text-gray-500">Complete documentation for the Freight Reporting Dashboard</p>
              </div>
            </div>

            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <nav className="w-72 shrink-0">
            <div className="bg-white rounded-xl border shadow-sm sticky top-24">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Contents</h2>
              </div>
              <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredSections.map(section => (
                  <div key={section.id} className="mb-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                        ${activeSection === section.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
                      `}
                    >
                      {section.icon}
                      <span className="flex-1 font-medium">{section.title}</span>
                      {expandedSections.includes(section.id)
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </button>

                    {expandedSections.includes(section.id) && (
                      <div className="ml-7 mt-1 space-y-1">
                        {section.subsections.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => navigateTo(section.id, sub.id)}
                            className={`
                              w-full text-left px-3 py-1.5 rounded text-sm transition-colors
                              ${activeSection === section.id && activeSubsection === sub.id
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border shadow-sm p-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>{currentSection?.title}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">{currentSubsection?.title}</span>
              </div>

              <div className="prose prose-blue max-w-none">
                {currentSubsection?.content}
              </div>

              <div className="flex justify-between mt-12 pt-6 border-t">
                <PrevNextButton
                  sections={docSections}
                  currentSection={activeSection}
                  currentSubsection={activeSubsection}
                  direction="prev"
                  onNavigate={navigateTo}
                />
                <PrevNextButton
                  sections={docSections}
                  currentSection={activeSection}
                  currentSubsection={activeSubsection}
                  direction="next"
                  onNavigate={navigateTo}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
