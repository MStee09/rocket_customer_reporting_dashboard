import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, History, Plus, Minus, Pencil, FilePlus, CheckCircle, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getProfileHistory } from '../services/customerIntelligenceService';
import type { ProfileHistoryEntry } from '../types/customerIntelligence';

interface CustomerInfo {
  id: number;
  customer_name: string;
}

type GroupedHistory = Record<string, ProfileHistoryEntry[]>;

function getChangeIcon(changeType: ProfileHistoryEntry['changeType']) {
  switch (changeType) {
    case 'add':
      return <Plus className="w-4 h-4" />;
    case 'remove':
      return <Minus className="w-4 h-4" />;
    case 'modify':
      return <Pencil className="w-4 h-4" />;
    case 'create':
      return <FilePlus className="w-4 h-4" />;
    default:
      return <History className="w-4 h-4" />;
  }
}

function getChangeColor(changeType: ProfileHistoryEntry['changeType']) {
  switch (changeType) {
    case 'add':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'remove':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'modify':
      return 'bg-rocket-100 text-rocket-700 border-rocket-200';
    case 'create':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    priorities: 'Priority',
    products: 'Product',
    keyMarkets: 'Market',
    terminology: 'Terminology',
    benchmarkPeriod: 'Benchmark Period',
    accountNotes: 'Account Notes',
    profile: 'Profile',
  };
  return names[field] || field;
}

function getValueDisplay(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.name) return value.name;
  if (value.term) return value.term;
  if (value.region) return value.region;
  if (value.created) return 'New profile';
  return JSON.stringify(value);
}

function HistoryEntryCard({ entry }: { entry: ProfileHistoryEntry }) {
  const timestamp = parseISO(entry.timestamp);

  const renderChangeDescription = () => {
    const fieldName = formatFieldName(entry.fieldChanged);
    const newValueDisplay = getValueDisplay(entry.newValue);
    const prevValueDisplay = getValueDisplay(entry.previousValue);

    switch (entry.changeType) {
      case 'add':
        return (
          <span>
            Added {fieldName}: <span className="font-medium">"{newValueDisplay}"</span>
          </span>
        );
      case 'remove':
        return (
          <span>
            Removed {fieldName}: <span className="font-medium">"{prevValueDisplay}"</span>
          </span>
        );
      case 'modify':
        return (
          <span>
            Modified {fieldName}
            {prevValueDisplay && newValueDisplay && (
              <>
                : <span className="text-gray-500">"{prevValueDisplay}"</span>
                <span className="mx-1 text-gray-400">-&gt;</span>
                <span className="font-medium">"{newValueDisplay}"</span>
              </>
            )}
          </span>
        );
      case 'create':
        return <span>Created profile</span>;
      default:
        return <span>Changed {fieldName}</span>;
    }
  };

  return (
    <div className="relative pl-8">
      <div
        className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${getChangeColor(
          entry.changeType
        )}`}
      >
        {getChangeIcon(entry.changeType)}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="text-sm text-gray-900">{renderChangeDescription()}</div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {format(timestamp, 'MMM d, yyyy')} &bull; {format(timestamp, 'h:mm a')}
          </span>
        </div>

        <div className="text-xs text-gray-500">{entry.userEmail}</div>

        {entry.userInput && (
          <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-100">
            <span className="text-xs font-medium text-gray-600">Note: </span>
            <span className="text-xs text-gray-700">{entry.userInput}</span>
          </div>
        )}

        {entry.correlationData && entry.fieldChanged === 'products' && (
          <div className="mt-3 space-y-2">
            {entry.correlationData.validated && entry.correlationData.matchCount !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700">
                  Validated: {entry.correlationData.matchCount.toLocaleString()} shipments
                </span>
              </div>
            )}
            {entry.correlationData.searchField && entry.correlationData.keywords && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Search className="w-3.5 h-3.5" />
                <span>
                  Searches <span className="font-medium">{entry.correlationData.searchField}</span>{' '}
                  for: {entry.correlationData.keywords.join(', ')}
                </span>
              </div>
            )}
            {entry.correlationData.savedAsSoft && (
              <div className="text-xs text-amber-600">Saved as soft knowledge (not validated)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerProfileHistoryPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [history, setHistory] = useState<ProfileHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!customerId) return;

      setIsLoading(true);
      try {
        const customerIdNum = parseInt(customerId, 10);

        const { data: customerData } = await supabase
          .from('customers')
          .select('id, customer_name')
          .eq('id', customerIdNum)
          .maybeSingle();

        if (customerData) {
          setCustomer(customerData);
        }

        const historyData = await getProfileHistory(customerIdNum, 500);
        setHistory(historyData);
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [customerId]);

  const groupedHistory = useMemo(() => {
    const groups: GroupedHistory = {};

    for (const entry of history) {
      const date = parseISO(entry.timestamp);
      const monthKey = format(date, 'MMMM yyyy');

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(entry);
    }

    return groups;
  }, [history]);

  const sortedMonths = useMemo(() => {
    return Object.keys(groupedHistory).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedHistory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-rocket-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 -m-6 lg:-m-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(`/admin/customer-profiles/${customerId}/edit`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {customer?.customer_name || 'Customer'} - Change History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {history.length} change{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No changes recorded yet</h3>
            <p className="text-sm text-gray-500">
              Changes to this customer's profile will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedMonths.map((month) => (
              <div key={month}>
                <h2 className="text-sm font-semibold text-gray-700 mb-4 sticky top-0 bg-gray-50 py-2">
                  {month}
                </h2>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {groupedHistory[month].map((entry) => (
                      <HistoryEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerProfileHistoryPage;
