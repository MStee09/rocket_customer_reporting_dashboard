import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Save, Loader2, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

type Tab = 'profile' | 'how-to';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, role, customers } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }

    setIsChangingPassword(false);
  };

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'how-to' as Tab, label: 'How To', icon: HelpCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and learn how to use the app</p>
      </div>

      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-rocket-600 text-rocket-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-rocket-600" />
              <h2 className="text-xl font-bold text-slate-800">User Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      role?.is_admin
                        ? 'bg-rocket-100 text-rocket-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {role?.user_role || 'Customer'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Contact an administrator to change your role</p>
              </div>

              {customers && customers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Associated Customers
                  </label>
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div
                        key={customer.customer_id}
                        className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <p className="text-sm font-medium text-slate-800">{customer.customer_name}</p>
                        <p className="text-xs text-slate-500">ID: {customer.customer_id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-slate-800">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">Password changed successfully!</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-2 px-6 py-2 bg-charcoal-800 hover:bg-charcoal-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500">
                Password must be at least 8 characters long
              </p>
            </form>
          </Card>

          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Preferences</h2>
            <p className="text-slate-600 text-sm">
              User preferences are automatically saved as you use the application.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'how-to' && (
        <Card variant="elevated" padding="lg">
          <div className="text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-rocket-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-rocket-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Documentation & Guides
            </h2>
            <p className="text-slate-600 mb-6">
              Learn how to use every feature of the Rocket Shipping dashboard with our
              comprehensive documentation. From basic navigation to advanced analytics
              and reporting, we've got you covered.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <h3 className="font-semibold text-slate-800 mb-1">Getting Started</h3>
                <p className="text-sm text-slate-600">Dashboard basics and navigation</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <h3 className="font-semibold text-slate-800 mb-1">Shipment Management</h3>
                <p className="text-sm text-slate-600">Track and manage your shipments</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <h3 className="font-semibold text-slate-800 mb-1">Analytics & Reports</h3>
                <p className="text-sm text-slate-600">Create insights and custom reports</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-left">
                <h3 className="font-semibold text-slate-800 mb-1">Admin Features</h3>
                <p className="text-sm text-slate-600">User management and configuration</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settings/how-to')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rocket-600 hover:bg-rocket-700 text-white rounded-lg font-medium transition-colors"
            >
              Open Full Documentation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
