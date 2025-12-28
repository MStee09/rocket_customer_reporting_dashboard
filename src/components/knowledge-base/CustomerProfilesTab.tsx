import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Building2,
  Plus,
  Edit2,
  History,
  Target,
  Package,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getAllProfiles,
  createProfile,
} from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile } from '../../types/customerIntelligence';

interface CustomerWithProfile {
  customerId: number;
  customerName: string;
  profile: (CustomerIntelligenceProfile & { customerName: string }) | null;
}

export function CustomerProfilesTab() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState<number | null>(null);
  const [customers, setCustomers] = useState<CustomerWithProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [customersResult, profiles] = await Promise.all([
        supabase
          .from('customer')
          .select('customer_id, company_name')
          .eq('is_active', true)
          .order('company_name'),
        getAllProfiles(),
      ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      const profileMap = new Map<number, CustomerIntelligenceProfile & { customerName: string }>();
      profiles.forEach((p) => {
        profileMap.set(p.customerId, p);
      });

      const combined: CustomerWithProfile[] = (customersResult.data || []).map((c) => ({
        customerId: c.customer_id,
        customerName: c.company_name,
        profile: profileMap.get(c.customer_id) || null,
      }));

      setCustomers(combined);
    } catch (err) {
      console.error('Error loading customer profiles:', err);
      setError('Failed to load customer profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (customerId: number) => {
    if (!user) return;

    setIsCreating(customerId);
    try {
      await createProfile(customerId, user.id, user.email || 'unknown');
      navigate(`/admin/customer-profiles/${customerId}/edit`);
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile');
      setIsCreating(null);
    }
  };

  const handleEdit = (customerId: number) => {
    navigate(`/admin/customer-profiles/${customerId}/edit`);
  };

  const handleHistory = (customerId: number) => {
    navigate(`/admin/customer-profiles/${customerId}/history`);
  };

  const filteredCustomers = customers.filter((c) =>
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customersWithProfiles = filteredCustomers.filter((c) => c.profile !== null);
  const customersWithoutProfiles = filteredCustomers.filter((c) => c.profile === null);

  if (!isAdmin()) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">Only administrators can manage customer profiles.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading customer profiles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers by name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="text-sm text-gray-500">
          {customersWithProfiles.length} of {filteredCustomers.length} with profiles
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'No active customers in the system'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {customersWithProfiles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Customers with Profiles ({customersWithProfiles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customersWithProfiles.map((customer) => (
                  <CustomerCard
                    key={customer.customerId}
                    customer={customer}
                    onEdit={handleEdit}
                    onHistory={handleHistory}
                    onSetup={handleSetup}
                    isCreating={isCreating === customer.customerId}
                  />
                ))}
              </div>
            </div>
          )}

          {customersWithoutProfiles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Customers without Profiles ({customersWithoutProfiles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customersWithoutProfiles.map((customer) => (
                  <CustomerCard
                    key={customer.customerId}
                    customer={customer}
                    onEdit={handleEdit}
                    onHistory={handleHistory}
                    onSetup={handleSetup}
                    isCreating={isCreating === customer.customerId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CustomerCardProps {
  customer: CustomerWithProfile;
  onEdit: (customerId: number) => void;
  onHistory: (customerId: number) => void;
  onSetup: (customerId: number) => void;
  isCreating: boolean;
}

function CustomerCard({ customer, onEdit, onHistory, onSetup, isCreating }: CustomerCardProps) {
  const { profile } = customer;

  const prioritySummary = profile?.priorities?.slice(0, 3).map((p) => p.name).join(', ') || '';

  const stats = profile
    ? [
        profile.products?.length > 0 ? `${profile.products.length} product${profile.products.length > 1 ? 's' : ''}` : null,
        profile.keyMarkets?.length > 0 ? `${profile.keyMarkets.length} market${profile.keyMarkets.length > 1 ? 's' : ''}` : null,
      ].filter(Boolean).join(' · ')
    : '';

  const updatedAgo = profile?.updatedAt
    ? formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })
    : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{customer.customerName}</h4>
            {profile ? (
              <span className="text-xs text-green-600 font-medium">Profile configured</span>
            ) : (
              <span className="text-xs text-gray-400">No profile yet</span>
            )}
          </div>
        </div>
      </div>

      {profile ? (
        <>
          {prioritySummary && (
            <div className="flex items-start gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 line-clamp-1">
                <span className="font-medium">Priorities:</span> {prioritySummary}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            {profile.products?.length > 0 && (
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {profile.products.length}
              </span>
            )}
            {profile.keyMarkets?.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.keyMarkets.length}
              </span>
            )}
            {updatedAgo && (
              <span className="ml-auto">Updated {updatedAgo}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(customer.customerId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onHistory(customer.customerId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </>
      ) : (
        <div className="pt-2">
          <p className="text-sm text-gray-500 mb-4">
            Set up a profile to teach the AI about this customer's priorities, products, and markets.
          </p>
          <button
            onClick={() => onSetup(customer.customerId)}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Setup Profile
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerProfilesTab;
