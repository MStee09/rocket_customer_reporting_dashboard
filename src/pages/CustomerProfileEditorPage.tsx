import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Target,
  Package,
  MapPin,
  BookOpen,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getProfile,
  createProfile,
} from '../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile } from '../types/customerIntelligence';
import {
  PrioritiesSection,
  ProductsSection,
  MarketsSection,
  TerminologySection,
  BenchmarkSection,
  NotesSection,
} from '../components/profile-editor';

interface Customer {
  customer_id: number;
  customer_name: string;
}

export function CustomerProfileEditorPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [profile, setProfile] = useState<CustomerIntelligenceProfile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerIdNum = customerId ? parseInt(customerId, 10) : null;

  useEffect(() => {
    if (customerIdNum) {
      loadData();
    }
  }, [customerIdNum]);

  const loadData = async () => {
    if (!customerIdNum || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('customer_id', customerIdNum)
        .maybeSingle();

      if (customerError) {
        throw customerError;
      }

      if (!customerData) {
        setError('Customer not found');
        setIsLoading(false);
        return;
      }

      setCustomer({
        customer_id: customerData.customer_id,
        customer_name: customerData.company_name,
      });

      let existingProfile = await getProfile(customerIdNum);

      if (!existingProfile) {
        existingProfile = await createProfile(customerIdNum, user.id, user.email || 'unknown');
      }

      setProfile(existingProfile);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: CustomerIntelligenceProfile) => {
    setProfile(updatedProfile);
  };

  const handleBack = () => {
    navigate('/knowledge-base?tab=profiles');
  };

  if (!isAdmin()) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">Only administrators can edit customer profiles.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-rocket-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (error || !customer || !profile) {
    return (
      <div className="p-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profiles
        </button>
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'Profile not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profiles
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {customer.customer_name} - Intelligence Profile
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Last updated {format(new Date(profile.updatedAt), 'MMM d, yyyy')} by {profile.updatedBy}
        </p>
      </div>

      <div className="space-y-6">
        <ProfileSection
          title="What They Care About"
          description="Customer priorities and what matters most to them"
          icon={Target}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        >
          <PrioritiesSection
            customerId={customer.customer_id}
            priorities={profile.priorities}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>

        <ProfileSection
          title="Products They Ship"
          description="Product types and how they map to shipment data"
          icon={Package}
          iconColor="text-rocket-500"
          iconBg="bg-rocket-50"
        >
          <ProductsSection
            customerId={customer.customer_id}
            products={profile.products}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>

        <ProfileSection
          title="Key Markets"
          description="Geographic regions important to this customer"
          icon={MapPin}
          iconColor="text-green-500"
          iconBg="bg-green-50"
        >
          <MarketsSection
            customerId={customer.customer_id}
            markets={profile.keyMarkets}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>

        <ProfileSection
          title="Terminology"
          description="Customer-specific terms and their meanings"
          icon={BookOpen}
          iconColor="text-purple-500"
          iconBg="bg-purple-50"
        >
          <TerminologySection
            customerId={customer.customer_id}
            terminology={profile.terminology}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>

        <ProfileSection
          title="Benchmark Period"
          description="Default time period for comparisons"
          icon={Calendar}
          iconColor="text-teal-500"
          iconBg="bg-teal-50"
        >
          <BenchmarkSection
            customerId={customer.customer_id}
            benchmarkPeriod={profile.benchmarkPeriod}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>

        <ProfileSection
          title="Account Notes"
          description="General notes and context about this customer"
          icon={FileText}
          iconColor="text-gray-500"
          iconBg="bg-gray-100"
        >
          <NotesSection
            customerId={customer.customer_id}
            notes={profile.accountNotes}
            onUpdate={handleProfileUpdate}
          />
        </ProfileSection>
      </div>
    </div>
  );
}

interface ProfileSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
}

function ProfileSection({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  children,
}: ProfileSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default CustomerProfileEditorPage;
