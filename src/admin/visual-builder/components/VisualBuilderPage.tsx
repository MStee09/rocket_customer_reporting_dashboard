/**
 * VisualBuilderPage - Main Entry Point for Visual Widget Builder
 * 
 * Admin-only tool for creating and configuring widgets visually.
 * 
 * Features:
 * - Select visualization type (bar, line, pie, KPI, geo, etc.)
 * - Map data fields to chart dimensions
 * - Add filter and AI logic blocks
 * - Live preview with real data
 * - Publish to widget_instances table
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Database,
  Filter,
  Eye,
  Upload,
  Save,
  RotateCcw,
  AlertCircle,
  Users,
} from 'lucide-react';
import { BuilderProvider, useBuilder, loadDraftFromStorage, clearDraftFromStorage } from './BuilderContext';
import { AISuggestionAssistant } from './AISuggestionAssistant';
import { VisualizationPanel } from './panels/VisualizationPanel';
import { FieldMappingPanel } from './panels/FieldMappingPanel';
import { LogicPanel } from './panels/LogicPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { PublishPanel } from './panels/PublishPanel';
import { useAuth } from '../../../contexts/AuthContext';
import type { VisualBuilderSchema } from '../types/BuilderSchema';

interface PreviewCustomerContextValue {
  previewCustomerId: number | null;
  setPreviewCustomerId: (id: number | null) => void;
}

const PreviewCustomerContext = React.createContext<PreviewCustomerContextValue>({
  previewCustomerId: null,
  setPreviewCustomerId: () => {},
});

export function usePreviewCustomer() {
  return React.useContext(PreviewCustomerContext);
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function VisualBuilderPage() {
  const navigate = useNavigate();
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<VisualBuilderSchema | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<number | null>(null);

  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft && draft.ui.isDirty) {
      setSavedDraft(draft);
      setShowDraftModal(true);
    }
  }, []);

  const handleRestoreDraft = () => {
    setShowDraftModal(false);
  };

  const handleDiscardDraft = () => {
    clearDraftFromStorage();
    setSavedDraft(null);
    setShowDraftModal(false);
  };

  return (
    <PreviewCustomerContext.Provider value={{ previewCustomerId, setPreviewCustomerId }}>
      <BuilderProvider initialSchema={showDraftModal ? undefined : savedDraft || undefined}>
        <div className="min-h-screen bg-slate-100">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Visual Widget Builder</h1>
                  <p className="text-xs text-slate-500">Create custom widgets without code</p>
                </div>
              </div>
              <HeaderActions />
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-[1800px] mx-auto p-4">
            <BuilderLayout />
          </main>

          {/* Draft Recovery Modal */}
          {showDraftModal && savedDraft && (
            <DraftRecoveryModal
              draft={savedDraft}
              onRestore={handleRestoreDraft}
              onDiscard={handleDiscardDraft}
            />
          )}
        </div>
      </BuilderProvider>
    </PreviewCustomerContext.Provider>
  );
}

// =============================================================================
// HEADER ACTIONS
// =============================================================================

function HeaderActions() {
  const { state, reset } = useBuilder();

  return (
    <div className="flex items-center gap-2">
      {state.ui.isDirty && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Unsaved changes
        </span>
      )}
      <button
        onClick={reset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
}

// =============================================================================
// PREVIEW CUSTOMER SELECTOR
// =============================================================================

function PreviewCustomerSelector() {
  const { customers, role } = useAuth();
  const { previewCustomerId, setPreviewCustomerId } = usePreviewCustomer();

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
      <label className="text-xs text-slate-500 flex items-center gap-1">
        <Users className="w-3.5 h-3.5" />
        Preview Data:
      </label>
      <select
        value={previewCustomerId ?? 'all'}
        onChange={(e) => {
          const value = e.target.value;
          setPreviewCustomerId(value === 'all' ? null : parseInt(value, 10));
        }}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent flex-1 max-w-xs"
      >
        <option value="all">All Customers (Admin)</option>
        <optgroup label="Individual Customers">
          {customers.map((customer) => (
            <option key={customer.customer_id} value={customer.customer_id}>
              {customer.customer_name || `Customer ${customer.customer_id}`}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

// =============================================================================
// BUILDER LAYOUT
// =============================================================================

function BuilderLayout() {
  const { state, setActivePanel } = useBuilder();
  const activePanel = state.ui.activePanel;

  const tabs = [
    { id: 'visualization', label: 'Visualization', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'fields', label: 'Data Fields', icon: <Database className="w-4 h-4" /> },
    { id: 'logic', label: 'Logic', icon: <Filter className="w-4 h-4" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
    { id: 'publish', label: 'Publish', icon: <Upload className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
      {/* Left Panel - Configuration */}
      <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* AI Suggestion Assistant */}
        <AISuggestionAssistant />

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {tabs.slice(0, 3).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
                ${activePanel === tab.id
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-white -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {activePanel === 'visualization' && <VisualizationPanel />}
          {activePanel === 'fields' && <FieldMappingPanel />}
          {activePanel === 'logic' && <LogicPanel />}
        </div>
      </div>

      {/* Right Panel - Preview & Publish */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Preview */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <PreviewCustomerSelector />
          <PreviewPanel />
        </div>

        {/* Publish */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActivePanel('publish')}
              className={`
                flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
                ${activePanel === 'publish'
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-white -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              <Upload className="w-4 h-4" />
              Publish Settings
            </button>
          </div>
          <PublishPanel />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DRAFT RECOVERY MODAL
// =============================================================================

interface DraftRecoveryModalProps {
  draft: VisualBuilderSchema;
  onRestore: () => void;
  onDiscard: () => void;
}

function DraftRecoveryModal({ draft, onRestore, onDiscard }: DraftRecoveryModalProps) {
  const { loadSchema } = useBuilder();

  const handleRestore = () => {
    loadSchema(draft);
    onRestore();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Recover Unsaved Work?</h3>
            <p className="text-sm text-slate-500 mt-1">
              We found an unsaved widget draft: <strong>"{draft.title || 'Untitled'}"</strong>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleRestore}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

export default VisualBuilderPage;
