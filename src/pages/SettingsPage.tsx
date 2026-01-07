import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Save, Loader2, HelpCircle, BookOpen, ArrowRight, Database,
  Brain, RefreshCw, Check, AlertCircle, AlertTriangle, History, RotateCcw,
  Shield, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

type Tab = 'profile' | 'how-to' | 'ai-settings';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  requireTypedConfirmation?: string;
}

function ConfirmModal({
  isOpen, title, message, confirmLabel, cancelLabel = 'Cancel',
  variant = 'warning', onConfirm, onCancel, requireTypedConfirmation
}: ConfirmModalProps) {
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    if (!isOpen) setTypedValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = !requireTypedConfirmation || typedValue === requireTypedConfirmation;
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${
              variant === 'danger' ? 'bg-red-100' :
              variant === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                variant === 'danger' ? 'text-red-600' :
                variant === 'warning' ? 'text-amber-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{message}</p>

              {requireTypedConfirmation && (
                <div className="mt-4">
                  <p className="text-sm text-slate-700 mb-2">
                    Type <span className="font-mono font-bold text-red-600">{requireTypedConfirmation}</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={`Type "${requireTypedConfirmation}"`}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface HistoryEntry {
  id: string;
  setting_value: string;
  changed_at: string;
  change_reason: string | null;
}

const DRAFT_KEY = 'ai_settings_draft_investigator_system_prompt';
const MIN_PROMPT_LENGTH = 100;
const LARGE_DELETION_THRESHOLD = 0.3;

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, role, customers, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);
  const [promptError, setPromptError] = useState('');

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    requireTypedConfirmation?: string;
  }>({ isOpen: false, title: '', message: '', confirmLabel: '', variant: 'warning', onConfirm: () => {} });

  const [hasDraft, setHasDraft] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const previousPromptRef = useRef<string>('');

  useEffect(() => {
    if (activeTab === 'ai-settings' && isAdmin()) {
      loadSystemPrompt();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'ai-settings' && isAdmin()) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft && savedDraft !== originalPrompt && originalPrompt) {
        setHasDraft(true);
      }
    }
  }, [activeTab, originalPrompt]);

  useEffect(() => {
    if (systemPrompt && systemPrompt !== originalPrompt && activeTab === 'ai-settings') {
      const timer = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, systemPrompt);
        setLastAutoSave(new Date());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [systemPrompt, originalPrompt, activeTab]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPromptChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes to the AI system prompt. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [systemPrompt, originalPrompt]);

  const loadSystemPrompt = async () => {
    setIsLoadingPrompt(true);
    setPromptError('');
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('setting_value')
        .eq('setting_key', 'investigator_system_prompt')
        .maybeSingle();

      if (error) throw error;
      const value = data?.setting_value || '';
      setSystemPrompt(value);
      setOriginalPrompt(value);
      previousPromptRef.current = value;
    } catch (err) {
      console.error('Error loading system prompt:', err);
      setPromptError('Failed to load system prompt. The ai_settings table may not exist yet.');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings_history')
        .select('id, setting_value, changed_at, change_reason')
        .eq('setting_key', 'investigator_system_prompt')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePromptChange = useCallback((newValue: string) => {
    const previousValue = previousPromptRef.current;
    const deletionRatio = previousValue.length > 0
      ? (previousValue.length - newValue.length) / previousValue.length
      : 0;

    if (deletionRatio > LARGE_DELETION_THRESHOLD && previousValue.length > 200) {
      setConfirmModal({
        isOpen: true,
        title: 'Large Deletion Detected',
        message: `You're about to delete ${Math.round(deletionRatio * 100)}% of the prompt content (${previousValue.length - newValue.length} characters).\n\nThis is the core configuration that drives all AI behavior. Are you sure you want to continue?`,
        confirmLabel: 'Yes, Delete',
        variant: 'warning',
        onConfirm: () => {
          setSystemPrompt(newValue);
          previousPromptRef.current = newValue;
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setSystemPrompt(newValue);
      if (Math.abs(newValue.length - previousValue.length) > 50) {
        previousPromptRef.current = newValue;
      }
    }
  }, []);

  const saveSystemPrompt = async (reason?: string) => {
    setIsSavingPrompt(true);
    setPromptError('');
    setPromptSaveSuccess(false);

    try {
      await supabase.from('ai_settings_history').insert({
        setting_key: 'investigator_system_prompt',
        setting_value: originalPrompt,
        changed_by: user?.id,
        change_reason: reason || 'Manual update from Settings page'
      });

      const { error } = await supabase
        .from('ai_settings')
        .update({
          setting_value: systemPrompt,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('setting_key', 'investigator_system_prompt');

      if (error) throw error;

      setOriginalPrompt(systemPrompt);
      previousPromptRef.current = systemPrompt;
      setPromptSaveSuccess(true);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setTimeout(() => setPromptSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving system prompt:', err);
      setPromptError('Failed to save system prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSaveClick = () => {
    if (systemPrompt.length < MIN_PROMPT_LENGTH) {
      setConfirmModal({
        isOpen: true,
        title: 'Prompt Too Short',
        message: `The system prompt is only ${systemPrompt.length} characters. A prompt this short may cause the AI to behave unpredictably.\n\nMinimum recommended: ${MIN_PROMPT_LENGTH} characters.\n\nAre you absolutely sure you want to save this?`,
        confirmLabel: 'Save Anyway',
        variant: 'danger',
        requireTypedConfirmation: 'SAVE',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          saveSystemPrompt('Saved short prompt after confirmation');
        }
      });
      return;
    }

    const deletionRatio = originalPrompt.length > 0
      ? (originalPrompt.length - systemPrompt.length) / originalPrompt.length
      : 0;

    if (deletionRatio > 0.5) {
      setConfirmModal({
        isOpen: true,
        title: 'Major Content Reduction',
        message: `You're removing ${Math.round(deletionRatio * 100)}% of the original prompt.\n\nThis is a significant change that could dramatically affect AI behavior. The previous version will be saved to history for rollback.\n\nProceed with save?`,
        confirmLabel: 'Yes, Save Changes',
        variant: 'warning',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          saveSystemPrompt('Major content reduction');
        }
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Save System Prompt',
      message: 'This will update the AI Investigator behavior immediately for all new conversations.\n\nThe current version will be backed up to history.',
      confirmLabel: 'Save Changes',
      variant: 'info',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        saveSystemPrompt();
      }
    });
  };

  const handleDiscardChanges = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Discard Changes?',
      message: 'You will lose all unsaved changes to the system prompt.\n\nThis cannot be undone.',
      confirmLabel: 'Discard',
      variant: 'danger',
      onConfirm: () => {
        setSystemPrompt(originalPrompt);
        previousPromptRef.current = originalPrompt;
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      setConfirmModal({
        isOpen: true,
        title: 'Restore Draft?',
        message: 'This will replace the current content with your previously saved draft.',
        confirmLabel: 'Restore Draft',
        variant: 'info',
        onConfirm: () => {
          setSystemPrompt(savedDraft);
          previousPromptRef.current = savedDraft;
          setHasDraft(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleRestoreFromHistory = (entry: HistoryEntry) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore from History?',
      message: `This will replace the current prompt with the version from ${new Date(entry.changed_at).toLocaleString()}.\n\nYou'll still need to save after restoring.`,
      confirmLabel: 'Restore',
      variant: 'warning',
      onConfirm: () => {
        setSystemPrompt(entry.setting_value);
        previousPromptRef.current = entry.setting_value;
        setShowHistory(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleTabChange = (newTab: Tab) => {
    if (activeTab === 'ai-settings' && hasPromptChanges && newTab !== 'ai-settings') {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to the AI system prompt.\n\nLeaving this tab will not discard your draft (it\'s auto-saved), but you should save your changes soon.',
        confirmLabel: 'Leave Tab',
        variant: 'warning',
        onConfirm: () => {
          setActiveTab(newTab);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setActiveTab(newTab);
    }
  };

  const hasPromptChanges = systemPrompt !== originalPrompt;

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
    ...(isAdmin() ? [{ id: 'ai-settings' as Tab, label: 'AI Settings', icon: Brain }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        requireTypedConfirmation={confirmModal.requireTypedConfirmation}
      />

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
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-rocket-600 text-rocket-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'ai-settings' && hasPromptChanges && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  )}
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

          {isAdmin() && (
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Database className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Data Fields</h3>
                  <p className="text-sm text-slate-500">View and manage database schema</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/schema')}
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Open Schema Explorer
              </button>
            </Card>
          )}
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

      {activeTab === 'ai-settings' && isAdmin() && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Critical Configuration</h3>
              <p className="text-sm text-amber-800 mt-1">
                This system prompt controls all AI behavior in the application. Changes take effect immediately.
                All modifications are logged and can be rolled back from version history.
              </p>
            </div>
          </div>

          {hasDraft && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Unsaved draft found</p>
                  <p className="text-sm text-blue-700">You have a previously auto-saved draft.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem(DRAFT_KEY);
                    setHasDraft(false);
                  }}
                  className="px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleRestoreDraft}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Restore Draft
                </button>
              </div>
            </div>
          )}

          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-slate-800">Investigator System Prompt</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory && history.length === 0) {
                      loadHistory();
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <History className="w-4 h-4" />
                  History
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={loadSystemPrompt}
                  disabled={isLoadingPrompt}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingPrompt ? 'animate-spin' : ''}`} />
                  Reload
                </button>
              </div>
            </div>

            {showHistory && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Version History
                </h3>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">No version history available yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 hover:border-slate-300"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {new Date(entry.changed_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.setting_value.length.toLocaleString()} characters
                            {entry.change_reason && ` - ${entry.change_reason}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreFromHistory(entry)}
                          className="px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-slate-600 mb-4">
              This prompt controls how the AI Investigator behaves. It defines available data fields,
              response format, and investigation approach.
            </p>

            {promptError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{promptError}</p>
              </div>
            )}

            {promptSaveSuccess && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">System prompt saved successfully! Previous version backed up to history.</p>
              </div>
            )}

            {systemPrompt.length < MIN_PROMPT_LENGTH && systemPrompt.length > 0 && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Prompt is very short ({systemPrompt.length} chars). Minimum recommended: {MIN_PROMPT_LENGTH} characters.
                </p>
              </div>
            )}

            {isLoadingPrompt ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                  placeholder="Enter the system prompt..."
                />

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-500">
                    <span className={systemPrompt.length < MIN_PROMPT_LENGTH ? 'text-amber-600 font-medium' : ''}>
                      {systemPrompt.length.toLocaleString()} characters
                    </span>
                    {hasPromptChanges && (
                      <span className="ml-2 text-amber-600">Unsaved changes</span>
                    )}
                    {lastAutoSave && hasPromptChanges && (
                      <span className="ml-2 text-slate-400">
                        Draft saved {lastAutoSave.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {hasPromptChanges && (
                      <button
                        onClick={handleDiscardChanges}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Discard Changes
                      </button>
                    )}
                    <button
                      onClick={handleSaveClick}
                      disabled={isSavingPrompt || !hasPromptChanges}
                      className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingPrompt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Prompt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 className="font-semibold text-slate-800 mb-3">Tips for Writing Effective Prompts</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">-</span>
                <span><strong>List all available fields</strong> - The AI needs to know exactly what data fields exist to query them correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">-</span>
                <span><strong>Be specific about field names</strong> - Use exact column names like <code className="bg-slate-100 px-1 rounded">item_descriptions</code> not generic names</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">-</span>
                <span><strong>Define the response format</strong> - Tell the AI how to structure its answers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">-</span>
                <span><strong>Explain tool usage</strong> - Describe when and how to use each available tool</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
