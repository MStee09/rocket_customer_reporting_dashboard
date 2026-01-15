import {
  BarChart3, Users, CheckCircle, Brain, AlertCircle, RefreshCw, Calendar, Clock
} from 'lucide-react';
import { Callout } from './HelpComponents';

export function AIAnalyticsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Analytics</h1>
      <p className="text-lg text-gray-600 mb-6">
        Monitor AI platform health, usage patterns, and identify issues before
        they become problems. This is your early warning system.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Key Metrics Explained</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Reports Generated</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Total AI reports created in the selected time period.
          </p>
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <strong>Healthy:</strong> Steady or growing. <strong>Unhealthy:</strong> Declining (customers not using AI).
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Conversations</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Unique chat sessions. Multiple messages in one session = one conversation.
          </p>
          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
            <strong>Healthy:</strong> More conversations than reports (users exploring).
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-gray-900">Success Rate</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Percentage of requests completed without errors.
          </p>
          <div className="mt-2 p-2 bg-emerald-50 rounded text-sm">
            <strong>Target: 95%+</strong>. Below 90% requires immediate investigation.
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Learnings Captured</h4>
          </div>
          <p className="text-gray-600 text-sm">
            New terms/preferences learned from conversations.
          </p>
          <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
            <strong>Healthy:</strong> Some learnings indicate engagement. <strong>Note:</strong> High learnings = many unknown terms (may need better profiles).
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-gray-900">Validation Errors</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Reports referencing database fields that don't exist.
          </p>
          <div className="mt-2 p-2 bg-white rounded text-sm">
            <strong>Target: 0</strong>. Any validation errors likely mean schema has changed - check Schema Alert.
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">Access Violations</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Blocked attempts to access restricted data (cost, margin).
          </p>
          <div className="mt-2 p-2 bg-white rounded text-sm">
            <strong>Some is normal</strong> (customers asking about costs). <strong>Investigate if:</strong> Sudden spike or same customer repeatedly.
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Troubleshooting Guide</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Signal</th>
              <th className="text-left p-3 border font-semibold">Likely Cause</th>
              <th className="text-left p-3 border font-semibold">Admin Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border">Success rate below 90%</td>
              <td className="p-3 border">AI making errors, bad knowledge</td>
              <td className="p-3 border">Check Learning Queue for corrections, review recent knowledge changes</td>
            </tr>
            <tr>
              <td className="p-3 border">Validation errors &gt; 0</td>
              <td className="p-3 border">Database schema changed</td>
              <td className="p-3 border">Check Schema Change Alert at top of page, click "Refresh Schema"</td>
            </tr>
            <tr>
              <td className="p-3 border">Learnings suddenly high</td>
              <td className="p-3 border">New customer or incomplete profiles</td>
              <td className="p-3 border">Check which customers are generating learnings, update their profiles</td>
            </tr>
            <tr>
              <td className="p-3 border">Customer usage dropped to zero</td>
              <td className="p-3 border">Frustration, forgot about feature, access issue</td>
              <td className="p-3 border">Check their recent conversations for errors, reach out to customer</td>
            </tr>
            <tr>
              <td className="p-3 border">Access violations spiking</td>
              <td className="p-3 border">Customers trying to access cost data</td>
              <td className="p-3 border">Usually normal - consider if you should expand customer data access</td>
            </tr>
            <tr>
              <td className="p-3 border">Reports generated declining</td>
              <td className="p-3 border">Adoption issue or AI quality problem</td>
              <td className="p-3 border">Check success rate first, then consider customer outreach</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Schema Change Detection</h2>
      <p className="text-gray-600 mb-4">
        When database columns are added, removed, or renamed, an alert banner appears at the top of the Analytics tab.
      </p>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-5 h-5 text-amber-600" />
          <strong className="text-amber-800">When You See This Alert:</strong>
        </div>
        <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
          <li>Click <strong>Refresh Schema</strong> button</li>
          <li>The AI will reload its knowledge of available database fields</li>
          <li>Test a few reports to ensure they still work</li>
          <li>If errors persist, check if field names changed and update any affected knowledge</li>
        </ol>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Usage Insights</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Most Active Customers</h4>
          <p className="text-gray-600 text-sm">
            Shows which customers use the AI most.
          </p>
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
            <strong>High usage:</strong> These customers are getting value. Ensure their profiles are complete.
            <br />
            <strong>Low/no usage:</strong> May need training, profile setup, or outreach.
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Daily Usage Trend</h4>
          <p className="text-gray-600 text-sm">
            Shows usage over time.
          </p>
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
            <strong>Expected:</strong> Dips on weekends, peaks mid-week.
            <br />
            <strong>Warning signs:</strong> Sustained decline over 2+ weeks.
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-semibold text-slate-800">Analytics Monitoring Schedule</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Weekly Check (Required - 5 min)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Check Success Rate</strong> - Should be 95%+. Below 90% is urgent.</li>
              <li><strong>Check Validation Errors</strong> - Should be 0. Any errors = schema issue.</li>
              <li><strong>Glance at usage trend</strong> - Is it stable or declining?</li>
              <li><strong>Look for Schema Alert banner</strong> - Refresh if present.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-gray-900">Monthly Review (Recommended - 15 min)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Review "Most Active Customers"</strong> - Are expected customers using it?</li>
              <li><strong>Identify inactive customers</strong> - Who should be using AI but isn't?</li>
              <li><strong>Compare to previous month</strong> - Is adoption growing?</li>
              <li><strong>Note any patterns</strong> - Certain days busier? Seasonal trends?</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-gray-900">Immediate Action Triggers</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Success rate drops below 90%:</strong> Stop and investigate immediately</li>
              <li><strong>Schema Alert appears:</strong> Refresh schema within 24 hours</li>
              <li><strong>Validation errors spike:</strong> Check for database changes</li>
              <li><strong>Major customer stops using:</strong> Reach out to understand why</li>
            </ul>
          </div>
        </div>
      </div>

      <Callout type="tip">
        Think of Analytics as your AI health dashboard. A quick weekly check catches problems before customers complain.
        Most issues show up here before they impact customer experience.
      </Callout>
    </div>
  );
}
