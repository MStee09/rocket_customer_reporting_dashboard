import { Callout } from './HelpComponents';

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
