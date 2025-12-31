// COMPREHENSIVE ADMIN CONTENT SECTIONS FOR HowToContent.tsx
// Replace the existing CustomerProfilesContent, KnowledgeBaseContent, LearningQueueContent, and AIAnalyticsContent functions

// Add these imports at the top of HowToContent.tsx if not already present:
// import { Brain, AlertCircle, CheckCircle, Sparkles, Users, Globe, BookOpen, Package, Calculator, Database, BarChart3, Lightbulb, Target, MapPin, FileText, Clock, Calendar, RefreshCw } from 'lucide-react';

// ============================================
// CUSTOMER INTELLIGENCE PROFILES
// ============================================

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
        Go to <strong>Admin Features → Customer Intelligence Profiles</strong> in the sidebar,
        or <strong>Knowledge Base → Customer Profiles</strong> tab.
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

      {/* MAINTENANCE CHECKLIST */}
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


// ============================================
// KNOWLEDGE BASE (Main Intelligence Tab)
// ============================================

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
              <td className="p-3 border">If weight > 500, suggest FTL</td>
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
        Navigate to <strong>Knowledge Base → Intelligence</strong> tab.
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
        <span className="text-amber-700"> Review each item and click Approve (✓), Edit (pencil), or Reject (✗).</span>
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

      {/* MAINTENANCE CHECKLIST */}
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


// ============================================
// LEARNING QUEUE
// ============================================

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
        Go to <strong>Knowledge Base → Learning Queue</strong> tab.
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

      {/* MAINTENANCE CHECKLIST */}
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


// ============================================
// AI ANALYTICS
// ============================================

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
              <td className="p-3 border">Validation errors > 0</td>
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

      {/* MAINTENANCE CHECKLIST */}
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


// ============================================
// HELPER COMPONENTS (if not already in file)
// ============================================

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 bg-rocket-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <div className="text-gray-600 text-sm mt-1">{children}</div>
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: 'tip' | 'info' | 'warning'; children: React.ReactNode }) {
  const styles = {
    tip: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  const icons = {
    tip: <Lightbulb className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]} mt-6`}>
      {icons[type]}
      <div className="text-sm">{children}</div>
    </div>
  );
}
