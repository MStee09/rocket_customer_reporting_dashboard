import { useState, useEffect } from 'react';
import { Brain, Tag, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerKnowledge {
  customerId: number;
  customerName: string;
  terminology: { key: string; definition: string; source: string }[];
  products: { name: string; keywords: string[] }[];
  priorities: string[];
  learnedCount: number;
}

interface CustomerData {
  company_name?: string;
}

interface ProfileData {
  customer_id: number;
  terminology?: { term: string; means: string }[];
  products?: { name: string; keywords: string[] }[];
  priorities?: string[];
  customer?: CustomerData;
}

export function CustomerKnowledgeViewer({ customerId }: { customerId?: number }) {
  const [knowledge, setKnowledge] = useState<CustomerKnowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (customerId) loadKnowledge();
  }, [customerId]);

  async function loadKnowledge() {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('customer_intelligence_profiles')
        .select('*, customer:customer_id(company_name)')
        .eq('customer_id', customerId)
        .single();

      const { data: terms } = await supabase
        .from('ai_knowledge')
        .select('key, definition, source')
        .eq('customer_id', customerId?.toString())
        .eq('scope', 'customer')
        .eq('is_active', true);

      if (profile) {
        const profileData = profile as ProfileData;
        setKnowledge({
          customerId: profileData.customer_id,
          customerName: profileData.customer?.company_name || 'Unknown',
          terminology: [
            ...(profileData.terminology || []).map((t) => ({ key: t.term, definition: t.means, source: 'admin' })),
            ...(terms || []).map(t => ({ key: t.key, definition: t.definition || '', source: t.source })),
          ],
          products: profileData.products || [],
          priorities: profileData.priorities || [],
          learnedCount: terms?.length || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load knowledge:', e);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (!knowledge) return <div className="p-4 text-gray-500">No knowledge profile</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-gray-900">Customer Knowledge</span>
          <span className="text-sm text-gray-500">
            ({knowledge.terminology.length} terms, {knowledge.learnedCount} learned)
          </span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {knowledge.priorities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Priorities</h4>
              <div className="flex flex-wrap gap-2">
                {knowledge.priorities.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">{p}</span>
                ))}
              </div>
            </div>
          )}

          {knowledge.terminology.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Terminology</h4>
              <div className="space-y-2">
                {knowledge.terminology.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="font-medium text-gray-900">{t.key}</span>
                    <span className="text-gray-500">= {t.definition}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${t.source === 'learned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {knowledge.products.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Products</h4>
              <div className="space-y-2">
                {knowledge.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="text-gray-500">({p.keywords?.join(', ')})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomerKnowledgeViewer;
