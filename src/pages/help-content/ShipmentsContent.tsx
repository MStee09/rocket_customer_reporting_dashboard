import { MousePointer } from 'lucide-react';
import { Callout, Step } from './HelpComponents';

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
