# PHASE 4: Admin Analytics Dashboard

Add an analytics dashboard for admins to monitor AI performance and customer learning.

## Create: src/components/admin/AIAnalyticsDashboard.tsx

```tsx
import { useState, useEffect } from 'react';
import { BarChart3, Users, CheckCircle, AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIStats {
  total_reports: number;
  total_conversations: number;
  success_rate: number;
  validation_errors: number;
  access_violations: number;
  learnings_captured: number;
  top_customers: { customer_name: string; report_count: number }[];
  daily_usage: { date: string; count: number }[];
}

export function AIAnalyticsDashboard() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  async function loadStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ai_admin_stats', { p_days: timeRange });
      if (!error && data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (e) {
      console.error('Failed to load AI stats:', e);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center p-12 text-gray-500">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">AI Platform Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<BarChart3 className="w-5 h-5 text-blue-600" />} label="Reports" value={stats.total_reports.toLocaleString()} />
        <MetricCard icon={<Users className="w-5 h-5 text-green-600" />} label="Conversations" value={stats.total_conversations.toLocaleString()} />
        <MetricCard icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} label="Success Rate" value={`${stats.success_rate || 0}%`} />
        <MetricCard icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} label="Validation Errors" value={stats.validation_errors.toString()} alert={stats.validation_errors > 0} />
        <MetricCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} label="Access Violations" value={stats.access_violations.toString()} alert={stats.access_violations > 0} />
        <MetricCard icon={<Brain className="w-5 h-5 text-purple-600" />} label="Learnings" value={stats.learnings_captured.toString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Most Active Customers</h3>
          {stats.top_customers?.length > 0 ? (
            <div className="space-y-3">
              {stats.top_customers.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700">{c.customer_name}</span>
                  <span className="text-gray-500 text-sm">{c.report_count} reports</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Daily Usage</h3>
          {stats.daily_usage?.length > 0 ? (
            <div className="space-y-2">
              {stats.daily_usage.slice(0, 7).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-20">
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-rocket-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (d.count / Math.max(...stats.daily_usage.map(x => x.count))) * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-700 text-sm w-8">{d.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default AIAnalyticsDashboard;
```

## Create: src/components/admin/CustomerKnowledgeViewer.tsx

```tsx
import { useState, useEffect } from 'react';
import { Brain, Tag, Package, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerKnowledge {
  customerId: number;
  customerName: string;
  terminology: { key: string; definition: string; source: string }[];
  products: { name: string; keywords: string[] }[];
  priorities: string[];
  learnedCount: number;
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
      // Get profile
      const { data: profile } = await supabase
        .from('customer_intelligence_profiles')
        .select('*, customer:customer_id(company_name)')
        .eq('customer_id', customerId)
        .single();

      // Get learned terms
      const { data: terms } = await supabase
        .from('ai_knowledge')
        .select('key, definition, source')
        .eq('customer_id', customerId?.toString())
        .eq('scope', 'customer')
        .eq('is_active', true);

      if (profile) {
        setKnowledge({
          customerId: profile.customer_id,
          customerName: (profile.customer as any)?.company_name || 'Unknown',
          terminology: [
            ...(profile.terminology || []).map((t: any) => ({ key: t.term, definition: t.means, source: 'admin' })),
            ...(terms || []).map(t => ({ key: t.key, definition: t.definition, source: t.source })),
          ],
          products: profile.products || [],
          priorities: profile.priorities || [],
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
                    <span className="text-gray-500">→ {t.definition}</span>
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
```

## Create: src/components/admin/SchemaChangeAlert.tsx

```tsx
import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SchemaChange {
  change_type: string;
  column_name: string;
  details: string;
}

export function SchemaChangeAlert() {
  const [changes, setChanges] = useState<SchemaChange[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkChanges();
  }, []);

  async function checkChanges() {
    try {
      const { data } = await supabase.rpc('detect_schema_changes');
      if (data && data.length > 0) {
        setChanges(data);
      }
    } catch (e) {
      console.error('Failed to check schema changes:', e);
    }
  }

  async function acknowledgeChanges() {
    // Refresh schema metadata
    await supabase.rpc('refresh_schema_metadata');
    setDismissed(true);
  }

  if (dismissed || changes.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">Schema Changes Detected</h4>
          <p className="text-sm text-amber-700 mt-1">
            The database schema has changed. The AI will automatically use new fields after you refresh.
          </p>
          <ul className="mt-2 space-y-1">
            {changes.map((c, i) => (
              <li key={i} className="text-sm text-amber-600 flex items-center gap-2">
                {c.change_type === 'new_column' ? (
                  <span className="text-green-600">+ {c.column_name}</span>
                ) : (
                  <span className="text-red-600">- {c.column_name}</span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={acknowledgeChanges}
            className="mt-3 px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
          >
            Refresh Schema
          </button>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SchemaChangeAlert;
```

## Add to Knowledge Base Page

In `src/pages/KnowledgeBasePage.tsx`, add a new tab for AI Analytics:

### Add import at top:

```tsx
import AIAnalyticsDashboard from '../components/admin/AIAnalyticsDashboard';
import SchemaChangeAlert from '../components/admin/SchemaChangeAlert';
```

### Add to the tabs array (around line 500):

```tsx
{ key: 'analytics', label: 'AI Analytics', icon: BarChart3 },
```

### Add the tab content (where other tabs are rendered):

```tsx
{activeTab === 'analytics' && (
  <>
    <SchemaChangeAlert />
    <AIAnalyticsDashboard />
  </>
)}
```

---

# END OF PHASE 4

After this phase:
- Admins can see AI performance metrics
- Schema changes are automatically detected
- Customer knowledge profiles are viewable
- All monitoring is admin-only (RLS protected)

The complete AI platform upgrade is now finished:
- ✅ Phase 1: AI service layer with validation
- ✅ Phase 2: Connected to existing features  
- ✅ Phase 3: Learning system database
- ✅ Phase 4: Admin analytics dashboard
