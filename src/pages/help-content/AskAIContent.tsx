import { Sparkles } from 'lucide-react';
import { Callout, Step } from './HelpComponents';

export function AskAIContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Ask AI Buttons</h1>
      <p className="text-lg text-gray-600 mb-6">
        Throughout the dashboard, you'll see sparkle (<Sparkles className="w-4 h-4 inline" />) icons next to widgets and data points.
        These "Ask AI" buttons let you get instant insights about specific data.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How to Use</h2>

      <Step number={1} title="Find the Sparkle Icon">
        Find the <Sparkles className="w-4 h-4 inline text-rocket-600" /> sparkle icon on any widget or metric.
      </Step>

      <Step number={2} title="Click It">
        Click it to open the AI Studio with context pre-loaded.
      </Step>

      <Step number={3} title="Context is Preserved">
        The AI will have information about what you were looking at.
      </Step>

      <Step number={4} title="Ask Follow-ups">
        Ask follow-up questions or request specific analysis.
      </Step>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Example Questions</h2>
      <p className="text-gray-600 mb-4">When you click Ask AI on different widgets:</p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li><strong>On Spend by Mode:</strong> "Why did LTL spend increase this month?"</li>
        <li><strong>On Top Carriers:</strong> "How does Old Dominion compare to ABF for my lanes?"</li>
        <li><strong>On a Shipment:</strong> "What's the status and expected delivery for this load?"</li>
      </ul>

      <Callout type="tip">
        The AI has access to your shipment data, so you can ask very specific questions
        like "How many shipments went to California last month?" and get accurate answers.
      </Callout>
    </div>
  );
}
