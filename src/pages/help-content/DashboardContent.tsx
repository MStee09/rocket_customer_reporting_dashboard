import { TrendingUp, Sparkles } from 'lucide-react';
import { Callout } from './HelpComponents';

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
