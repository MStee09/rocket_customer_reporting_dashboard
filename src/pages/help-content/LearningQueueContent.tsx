import { AlertCircle, Brain, Calendar, Clock } from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function LearningQueueContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Learning Queue</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Learning Queue captures items from AI conversations that need human review.
        <strong> This is the most important admin task for AI quality.</strong>
      </p>

      <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <strong className="text-red-800">Critical Admin Task</strong>
        </div>
        <p className="text-red-700 text-sm">
          The Learning Queue must be reviewed at least weekly. Unprocessed items mean the AI keeps making the same mistakes.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Gets Captured</h2>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Unknown Terms</h4>
            <p className="text-sm text-gray-600">
              When a customer uses a term the AI doesn't understand.
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Example: Customer says "show me CG shipments" but AI doesn't know CG = Cargoglide
            </p>
            <div className="mt-2 p-2 bg-white rounded text-sm">
              <strong>Admin Action:</strong> Add the term to customer's profile or global knowledge.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Corrections</h4>
            <p className="text-sm text-gray-600">
              When a customer indicates the AI was wrong.
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Example: "No, that's not right. CG means Cargoglide, not cargo."
            </p>
            <div className="mt-2 p-2 bg-white rounded text-sm">
              <strong>Admin Action:</strong> Fix the incorrect knowledge and add correct definition.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-rocket-50 rounded-lg border border-rocket-200">
          <div className="p-2 bg-rocket-100 rounded-lg">
            <Brain className="w-5 h-5 text-rocket-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Low-Confidence Inferences</h4>
            <p className="text-sm text-gray-600">
              Knowledge the AI inferred but isn't certain about.
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Example: AI thinks "hot shipment" means expedited based on context, but wants confirmation.
            </p>
            <div className="mt-2 p-2 bg-white rounded text-sm">
              <strong>Admin Action:</strong> Confirm if correct (approve) or fix if wrong (edit/reject).
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Processing the Queue Step by Step</h2>

      <Step number={1} title="Open Learning Queue">
        Go to <strong>Knowledge Base - Learning Queue</strong> tab.
        The badge on the tab shows pending items. <strong>Target: Keep under 10.</strong>
      </Step>

      <Step number={2} title="Review Each Card">
        Each card shows:
        <ul className="list-disc list-inside text-sm mt-2">
          <li><strong>The unknown term or correction</strong> - What the AI didn't understand</li>
          <li><strong>Customer name</strong> - Who triggered this</li>
          <li><strong>Original question</strong> - Full context of what they asked</li>
          <li><strong>What the AI understood</strong> - How it interpreted the request</li>
        </ul>
      </Step>

      <Step number={3} title="Choose an Action">
        <div className="space-y-2 mt-2">
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <strong className="text-green-700">Add to Profile</strong>
            <p className="text-sm text-gray-600">Creates a term in that customer's profile. Use when the term is customer-specific.</p>
          </div>
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <strong className="text-blue-700">Define Mapping</strong>
            <p className="text-sm text-gray-600">Opens customer profile editor for more complex setup (e.g., product with multiple keywords).</p>
          </div>
          <div className="p-2 bg-gray-50 rounded border border-gray-200">
            <strong className="text-gray-700">Dismiss</strong>
            <p className="text-sm text-gray-600">Not relevant - one-time misunderstanding, typo, or already handled elsewhere.</p>
          </div>
        </div>
      </Step>

      <Step number={4} title="Add Notes When Dismissing">
        If dismissing, add a brief note explaining why. This helps track patterns and justifies the decision later.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Queue Stats Explained</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-amber-600 mb-1">Pending Review</h4>
          <p className="text-sm text-gray-600">Items waiting for your action. <strong>Target: &lt;10</strong></p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-green-600 mb-1">Resolved</h4>
          <p className="text-sm text-gray-600">Items you've added to knowledge base.</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-600 mb-1">Dismissed</h4>
          <p className="text-sm text-gray-600">Items marked as not relevant.</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-semibold text-slate-800">Learning Queue Maintenance Schedule</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-gray-900">Twice Weekly (Required - 15 min each)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Process ALL pending items - don't let them accumulate</li>
              <li>For each item: Add to Profile, Define Mapping, or Dismiss</li>
              <li>If same term appears multiple times, prioritize it</li>
              <li>If unsure about a term, ask account manager or check shipment data</li>
            </ul>
            <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
              <strong>Why twice weekly?</strong> Unprocessed items = AI keeps making same mistakes. Quick processing = faster AI improvement.
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-gray-900">Monthly Pattern Review (30 min)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Expand "Resolved" section and review what was added</li>
              <li>Look for patterns: Are multiple customers using similar terms?</li>
              <li>Consider promoting common terms to global</li>
              <li>Review dismissed items - any patterns that suggest systemic issues?</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Warning Signs to Watch For</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Same term repeated:</strong> Customer keeps asking, you keep dismissing - something's wrong</li>
              <li><strong>Many items from one customer:</strong> Their profile may be incomplete</li>
              <li><strong>Corrections increasing:</strong> AI is getting worse, check recent knowledge changes</li>
              <li><strong>Queue growing faster than you process:</strong> Need to allocate more time or get help</li>
            </ul>
          </div>
        </div>
      </div>

      <Callout type="info">
        Each resolved item makes the AI smarter for that customer AND potentially others.
        A well-maintained queue is the fastest path to AI accuracy improvement.
      </Callout>
    </div>
  );
}
