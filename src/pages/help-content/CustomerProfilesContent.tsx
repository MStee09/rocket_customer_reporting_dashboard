import {
  Target, Package, MapPin, BookOpen, BarChart3, FileText,
  Calendar, Clock, AlertCircle
} from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function CustomerProfilesContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Customer Intelligence Profiles</h1>
      <p className="text-lg text-gray-600 mb-6">
        Customer Intelligence Profiles store information about each customer that helps
        the AI provide more relevant and accurate responses. Better profiles = smarter AI.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Why Profiles Matter</h2>
      <p className="text-gray-600 mb-4">
        When a customer asks a question, the AI loads their profile to understand:
      </p>
      <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
        <li>What terminology they use (so "CG" becomes "Cargoglide")</li>
        <li>What products they ship (so filtering works correctly)</li>
        <li>What markets matter to them (so regional analysis is relevant)</li>
        <li>What they care about (so the right metrics are emphasized)</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Profile Sections</h2>

      <div className="space-y-4 mb-6">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h4 className="font-semibold text-gray-900">Business Priorities</h4>
          </div>
          <p className="text-gray-600 text-sm">
            What matters most to this customer? Cost savings? Transit time? Service quality?
            The AI will emphasize these metrics in reports and insights.
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            Example: "Cost reduction", "On-time delivery", "East Coast performance"
          </p>
          <div className="mt-3 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Admin Input Required:</strong>
            <span className="text-amber-700"> Add priorities based on customer conversations, QBRs, or account manager notes.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-rocket-500" />
            <h4 className="font-semibold text-gray-900">Products They Ship</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Product categories with keywords the AI uses to filter shipment descriptions.
            This enables "show me drawer system shipments" to work correctly.
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            Example: Name: "Drawer Systems", Keywords: "drawer, storage, slide"
          </p>
          <div className="mt-3 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Admin Input Required:</strong>
            <span className="text-amber-700"> Add each product category with keywords that appear in shipment descriptions. Test by searching actual shipment data.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-green-500" />
            <h4 className="font-semibold text-gray-900">Key Markets</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Geographic regions important to this customer. The AI will highlight
            performance in these areas and can filter by "my key markets."
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            Example: CA, TX, FL, NY (or "West Coast", "Southeast")
          </p>
          <div className="mt-3 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Admin Input Required:</strong>
            <span className="text-amber-700"> List state codes or region names. Look at their top 10 destination states in the data if unsure.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <h4 className="font-semibold text-gray-900">Terminology</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Customer-specific terms, abbreviations, or jargon. The AI translates
            these automatically when the customer uses them.
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            Example: Term: "CG", Meaning: "Cargoglide products", AI Instructions: "Filter description for 'Cargoglide'"
          </p>
          <div className="mt-3 p-2 bg-amber-50 rounded text-sm">
            <strong className="text-amber-800">Admin Input Required:</strong>
            <span className="text-amber-700"> Add terms as you discover them. Learning Queue will also surface unknown terms.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-teal-500" />
            <h4 className="font-semibold text-gray-900">Benchmark Period</h4>
          </div>
          <p className="text-gray-600 text-sm">
            Default comparison timeframe when the customer asks "how are we doing?"
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            Example: "Previous quarter", "Same month last year"
          </p>
          <div className="mt-3 p-2 bg-green-50 rounded text-sm">
            <strong className="text-green-800">Optional:</strong>
            <span className="text-green-700"> Defaults to "previous period" if not set.</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h4 className="font-semibold text-gray-900">Account Notes</h4>
          </div>
          <p className="text-gray-600 text-sm">
            General context - industry, seasonality, special considerations.
          </p>
          <div className="mt-3 p-2 bg-green-50 rounded text-sm">
            <strong className="text-green-800">Optional:</strong>
            <span className="text-green-700"> Free-form notes for context.</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Setting Up a New Profile</h2>

      <Step number={1} title="Navigate to Customer Profiles">
        Go to <strong>Admin Features - Customer Intelligence Profiles</strong> in the sidebar,
        or <strong>Knowledge Base - Customer Profiles</strong> tab.
      </Step>

      <Step number={2} title="Find or Create">
        Find the customer in the list. Click <strong>Edit</strong> if they have a profile,
        or <strong>Set Up Profile</strong> to create one.
      </Step>

      <Step number={3} title="Fill In Required Sections">
        <strong>At minimum, complete these:</strong>
        <ul className="list-disc list-inside mt-2 text-sm">
          <li><strong>Products</strong> - At least their main product categories</li>
          <li><strong>Terminology</strong> - Any abbreviations they use</li>
          <li><strong>Key Markets</strong> - Their top 5 destination states</li>
        </ul>
      </Step>

      <Step number={4} title="Test the Profile">
        Use <strong>View as Customer</strong> to switch to their view, then open <strong>AI Report Studio</strong>.
        Try asking "show me [product] shipments to [market]" and verify it works.
      </Step>

      <div className="mt-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-semibold text-slate-800">Profile Maintenance Checklist</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">When a New Customer is Added</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Create profile within first week of onboarding</li>
              <li>Add at least 3 product categories with keywords</li>
              <li>Add their top 5-10 destination states as key markets</li>
              <li>Ask account manager for any known abbreviations/terminology</li>
              <li>Set their business priorities based on sales conversations</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-gray-900">Monthly Review (5 min per customer)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Check Learning Queue for unresolved items from this customer</li>
              <li>Add any new terminology discovered in conversations</li>
              <li>Review if priorities have changed (new focus areas?)</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Quarterly Review (15 min per customer)</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Full audit: Are all sections still accurate?</li>
              <li>Check shipment data for new product types not yet in profile</li>
              <li>Review if key markets have shifted (new regions?)</li>
              <li>Update priorities based on recent QBR discussions</li>
              <li>Test profile by running sample queries in AI Studio</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-gray-900">When AI Makes Mistakes</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Check if the misunderstood term is in their profile</li>
              <li>Check if product keywords match actual shipment descriptions</li>
              <li>Add missing terminology immediately</li>
              <li>Check Learning Queue - item may already be captured there</li>
            </ul>
          </div>
        </div>
      </div>

      <Callout type="tip">
        A customer with a complete profile will get dramatically better AI results.
        Spending 15 minutes setting up a profile saves hours of confusion later.
      </Callout>
    </div>
  );
}
