import { CheckCircle } from 'lucide-react';
import { Callout, Step } from './HelpComponents';

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

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Can I teach the AI my company's terminology?</h3>
          <p className="text-gray-600">
            Yes! Just say things like "When I say CG, I mean cargoglide" and the AI
            will remember this for your future conversations.
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Why can't I see cost or margin data?</h3>
          <p className="text-gray-600">
            Cost and margin information is only available to Go Rocket Shipping staff.
            You can see your retail charges and shipment volumes.
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
