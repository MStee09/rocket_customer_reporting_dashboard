import {
  Brain, FileText, Users, Lightbulb, BarChart3, Globe, Calendar, Clock
} from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function KnowledgeBaseContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
      <p className="text-lg text-gray-600 mb-6">
        The Knowledge Base is where all AI knowledge lives - terminology, documents,
        customer profiles, and learned information. This is the AI's "brain."
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">The Five Tabs</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg border-l-4 border-l-rocket-500">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-rocket-600" />
            <h4 className="font-semibold text-gray-900">Intelligence</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Terms, definitions, calculations, and business rules the AI knows.
            This is where you add terminology and see what the AI has learned.
          </p>
          <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Requires Admin Input:</strong>
            <span className="text-amber-700"> Add global terms, review "Needs Review" items, manage promote-to-global suggestions.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Documents</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Uploaded files like rate sheets, carrier guides, and contracts.
            The AI references these when answering questions.
          </p>
          <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Requires Admin Input:</strong>
            <span className="text-amber-700"> Upload relevant documents, set scope (global vs customer), categorize properly.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Customer Profiles</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Per-customer context: products, terminology, priorities, and markets.
            See who has profiles and who needs setup.
          </p>
          <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Requires Admin Input:</strong>
            <span className="text-amber-700"> Create and maintain profiles for each active customer.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-gray-900">Learning Queue</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Items captured from conversations that need human review.
            Unknown terms, corrections, and low-confidence inferences.
          </p>
          <div className="mt-2 p-2 bg-red-50 rounded text-sm">
            <strong className="text-red-800">Requires Weekly Review:</strong>
            <span className="text-red-700"> Process pending items to improve AI accuracy.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Analytics</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Platform performance metrics: reports generated, success rates,
            errors, and usage trends.
          </p>
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <strong className="text-blue-800">Monitor Weekly:</strong>
            <span className="text-blue-700"> Check for issues, respond to schema change alerts.</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Knowledge Types (Intelligence Tab)</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border font-semibold">Type</th>
              <th className="text-left p-3 border font-semibold">What It Is</th>
              <th className="text-left p-3 border font-semibold">Example</th>
              <th className="text-left p-3 border font-semibold">Who Adds It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border"><strong>Business Term</strong></td>
              <td className="p-3 border">Abbreviations, jargon, industry terms</td>
              <td className="p-3 border">LTL = Less Than Truckload</td>
              <td className="p-3 border">Admin (or auto-learned)</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Calculation</strong></td>
              <td className="p-3 border">Formulas and derived metrics</td>
              <td className="p-3 border">CPM = Cost / Miles</td>
              <td className="p-3 border">Admin only</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Product Category</strong></td>
              <td className="p-3 border">Product groupings with search keywords</td>
              <td className="p-3 border">Drawer Systems (keywords: drawer, storage)</td>
              <td className="p-3 border">Admin (via customer profile)</td>
            </tr>
            <tr>
              <td className="p-3 border"><strong>Business Rule</strong></td>
              <td className="p-3 border">Logic and conditional instructions</td>
              <td className="p-3 border">If weight &gt; 500, suggest FTL</td>
              <td className="p-3 border">Admin only</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Scope: Global vs Customer</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg bg-rocket-50 border-rocket-200">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-rocket-600" />
            <h4 className="font-semibold text-gray-900">Global</h4>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            Applies to ALL customers. Use for industry-standard terms.
          </p>
          <p className="text-sm text-gray-500 italic">
            Examples: LTL, FTL, BOL, SCAC, CPM, accessorial
          </p>
          <div className="mt-3 p-2 bg-white rounded text-sm">
            <strong>When to use:</strong> Term is industry-standard and means the same thing for everyone.
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-teal-50 border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">Customer-Specific</h4>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            Applies to ONE customer. Use for their unique terms/products.
          </p>
          <p className="text-sm text-gray-500 italic">
            Examples: "CG" (Acme's term), "West Region" (Beta's definition)
          </p>
          <div className="mt-3 p-2 bg-white rounded text-sm">
            <strong>When to use:</strong> Term is unique to this customer or means something different than global.
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Adding Knowledge Step by Step</h2>

      <Step number={1} title="Go to Intelligence Tab">
        Navigate to <strong>Knowledge Base - Intelligence</strong> tab.
      </Step>

      <Step number={2} title="Click Add Knowledge">
        Click the <strong>+ Add Knowledge</strong> button in the top right.
      </Step>

      <Step number={3} title="Fill In Details">
        <ul className="list-disc list-inside text-sm mt-2">
          <li><strong>Type:</strong> Business Term, Calculation, Product, or Rule</li>
          <li><strong>Scope:</strong> Global (all customers) or Customer-Specific</li>
          <li><strong>Key:</strong> The term/abbreviation exactly as users type it (e.g., "LTL")</li>
          <li><strong>Label:</strong> Display name (e.g., "Less Than Truckload")</li>
          <li><strong>Definition:</strong> What it means in plain English</li>
          <li><strong>AI Instructions:</strong> (Optional) Special handling instructions</li>
        </ul>
      </Step>

      <Step number={4} title="Save and Test">
        Click <strong>Save</strong>. Test by asking the AI about this term.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">The "Needs Review" Section</h2>
      <p className="text-gray-600 mb-4">
        At the top of the Intelligence tab, you'll see items marked "Needs Review". These are:
      </p>
      <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
        <li>Auto-learned terms that need verification</li>
        <li>Items that have been corrected by users</li>
        <li>Low-confidence inferences</li>
      </ul>
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
        <strong className="text-amber-800">Action Required:</strong>
        <span className="text-amber-700"> Review each item and click Approve, Edit (pencil), or Reject.</span>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">"Promote to Global" Suggestions</h2>
      <p className="text-gray-600 mb-4">
        At the bottom of the Intelligence tab, you may see suggestions to promote terms to global.
        This appears when multiple customers have defined the same term similarly.
      </p>
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
        <strong className="text-blue-800">What It Does:</strong>
        <span className="text-blue-700"> Creates one global definition and removes duplicate customer-specific ones. All customers then benefit from the term.</span>
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-semibold text-slate-800">Intelligence Tab Maintenance Checklist</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-gray-900">Weekly (Required - 10 min)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Check "Needs Review" count</strong> - Should be under 10. Process any pending items.</li>
              <li><strong>Review stats cards</strong> - Accuracy should be 90%+. If dropping, investigate.</li>
              <li><strong>Check Global Promotion suggestions</strong> - Promote terms if appropriate.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-gray-900">Monthly (Recommended - 20 min)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Review all auto-learned items</strong> - Filter by source = "auto-learned", verify accuracy.</li>
              <li><strong>Check for duplicates</strong> - Search for common terms, merge if duplicated.</li>
              <li><strong>Add missing global terms</strong> - Think of industry terms customers might use.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Quarterly (Full Audit - 1 hour)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>Export and review all knowledge</strong> - Look for outdated or incorrect items.</li>
              <li><strong>Check "times_used" and "times_corrected"</strong> - Items with high corrections may need fixing.</li>
              <li><strong>Verify calculations are still valid</strong> - Business rules may have changed.</li>
              <li><strong>Remove inactive/unused items</strong> - Clean up clutter.</li>
            </ul>
          </div>
        </div>
      </div>

      <Callout type="tip">
        The cleaner your knowledge base, the smarter your AI becomes.
        Think of it like training an employee - consistent, accurate information leads to better performance.
      </Callout>
    </div>
  );
}
