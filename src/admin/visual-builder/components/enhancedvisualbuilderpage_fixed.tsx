/**
 * Enhanced Visual Builder Page with Mode Selection
 * 
 * LOCATION: /src/admin/visual-builder/components/EnhancedVisualBuilderPage.tsx
 * 
 * This component wraps the existing Visual Builder with:
 * - Mode selection (AI Assist vs Manual)
 * - Improved step wizard for manual mode
 * - Better product/filter discovery with cascading values
 * 
 * It uses the EXISTING:
 * - BuilderContext for state management
 * - BuilderSchema types
 * - fieldService for data access
 * - widgetBuilderService for AI
 * - All existing panels (VisualizationPanel, FieldMappingPanel, etc.)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Database,
  Filter,
  Eye,
  Upload,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Settings,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Existing imports
import { 
  BuilderProvider, 
  useBuilder, 
  loadDraftFromStorage, 
  clearDraftFromStorage 
} from './BuilderContext';
import { AISuggestionAssistant } from './AISuggestionAssistant';
import { VisualizationPanel } from './panels/VisualizationPanel';
import { FieldMappingPanel } from './panels/FieldMappingPanel';
import { LogicPanel } from './panels/LogicPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { PublishPanel } from './panels/PublishPanel';
import { SearchableFieldSelect } from './SearchableFieldSelect';

import type { 
  VisualBuilderSchema, 
  FilterBlock, 
  FilterCondition,
  LogicBlock,
  VisualizationType,
} from '../types/BuilderSchema';

import {
  getAllBuilderFields,
  getDimensionFields,
  getMeasureFields,
  getGeoFields,
  AGGREGATION_OPTIONS,
} from '../services/fieldService';

import { supabase } from '../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type BuilderMode = 'choose' | 'ai' | 'manual' | 'advanced';
type ManualStep = 'filter' | 'breakdown' | 'measure' | 'chart' | 'publish';

interface FilterValueOption {
  value: string;
  label: string;
  count: number;
}

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

export function EnhancedVisualBuilderPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<BuilderMode>('choose');
  const [manualStep, setManualStep] = useState<ManualStep>('filter');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<VisualBuilderSchema | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<number | null>(null);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft && draft.ui.isDirty) {
      setSavedDraft(draft);
      setShowDraftModal(true);
    }
  }, []);

  const handleRestoreDraft = () => {
    setShowDraftModal(false);
    setMode('advanced'); // Go to advanced mode when restoring draft
  };

  const handleDiscardDraft = () => {
    clearDraftFromStorage();
    setSavedDraft(null);
    setShowDraftModal(false);
  };

  const handleModeSelect = (selectedMode: BuilderMode) => {
    setMode(selectedMode);
    if (selectedMode === 'manual') {
      setManualStep('filter');
    }
  };

  const handleReset = () => {
    setMode('choose');
    setManualStep('filter');
  };

  return (
    <PreviewCustomerContext.Provider value={{ previewCustomerId, setPreviewCustomerId }}>
      <BuilderProvider initialSchema={showDraftModal ? undefined : savedDraft || undefined}>
        <div className="min-h-screen bg-slate-100">
          {/* Header */}
          <EnhancedHeader 
            mode={mode} 
            manualStep={manualStep}
            onReset={handleReset}
            onBack={() => navigate(-1)}
            onStepClick={setManualStep}
            onModeChange={setMode}
          />

          {/* Main Content */}
          <main className="max-w-[1800px] mx-auto">
            {mode === 'choose' && (
              <ModeSelectionScreen onSelectMode={handleModeSelect} />
            )}
            
            {mode === 'ai' && (
              <AIAssistScreen 
                onComplete={() => setMode('advanced')} 
                onSwitchToManual={() => { setMode('manual'); setManualStep('filter'); }}
              />
            )}
            
            {mode === 'manual' && (
              <ManualBuilderScreen 
                step={manualStep}
                onStepChange={setManualStep}
                onComplete={() => setMode('advanced')}
              />
            )}
            
            {mode === 'advanced' && (
              <AdvancedBuilderScreen />
            )}
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
// ENHANCED HEADER
// =============================================================================

interface EnhancedHeaderProps {
  mode: BuilderMode;
  manualStep: ManualStep;
  onReset: () => void;
  onBack: () => void;
  onStepClick: (step: ManualStep) => void;
  onModeChange: (mode: BuilderMode) => void;
}

function EnhancedHeader({ mode, manualStep, onReset, onBack, onStepClick, onModeChange }: EnhancedHeaderProps) {
  const { state, reset } = useBuilder();
  
  const manualSteps: { id: ManualStep; label: string; icon: React.ReactNode }[] = [
    { id: 'filter', label: 'Filter', icon: <Filter className="w-4 h-4" /> },
    { id: 'breakdown', label: 'Breakdown', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'measure', label: 'Measure', icon: <Database className="w-4 h-4" /> },
    { id: 'chart', label: 'Chart', icon: <Eye className="w-4 h-4" /> },
    { id: 'publish', label: 'Publish', icon: <Upload className="w-4 h-4" /> },
  ];

  const currentStepIndex = manualSteps.findIndex(s => s.id === manualStep);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Visual Widget Builder</h1>
            <p className="text-xs text-slate-500">
              {mode === 'choose' && 'Choose how to build your widget'}
              {mode === 'ai' && 'AI-assisted configuration'}
              {mode === 'manual' && `Step ${currentStepIndex + 1} of ${manualSteps.length}`}
              {mode === 'advanced' && 'Advanced configuration'}
            </p>
          </div>
        </div>

        {/* Step Navigator for Manual Mode */}
        {mode === 'manual' && (
          <div className="flex items-center gap-1">
            {manualSteps.map((step, i) => {
              const isActive = step.id === manualStep;
              const isCompleted = i < currentStepIndex;
              const isClickable = i <= currentStepIndex;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                      ${isActive
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : isCompleted
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'
                        : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isCompleted ? 'bg-green-500 text-white' : 
                        isActive ? 'bg-orange-500 text-white' :
                        'bg-slate-200 text-slate-500'
                      }
                    `}>
                      {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="hidden lg:inline">{step.label}</span>
                  </button>
                  {i < manualSteps.length - 1 && (
                    <ChevronRight className={`w-4 h-4 ${i < currentStepIndex ? 'text-green-500' : 'text-slate-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Mode Switcher for Advanced Mode */}
        {mode === 'advanced' && (
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => onModeChange('ai')}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-white rounded-md transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
            <button
              onClick={() => onModeChange('manual')}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-white rounded-md transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              Guided
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {state.ui.isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
          <button
            onClick={() => { reset(); onReset(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// MODE SELECTION SCREEN
// =============================================================================

interface ModeSelectionScreenProps {
  onSelectMode: (mode: BuilderMode) => void;
}

function ModeSelectionScreen({ onSelectMode }: ModeSelectionScreenProps) {
  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            How would you like to build your widget?
          </h2>
          <p className="text-lg text-slate-500">
            Choose AI assistance for quick setup, or manual mode for full control
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* AI Assist Card */}
          <button
            onClick={() => onSelectMode('ai')}
            className="group relative p-6 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:border-purple-400 hover:shadow-lg transition-all text-left"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-purple-100 rounded text-xs text-purple-600 font-medium">
              Fastest
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Assist</h3>
            <p className="text-slate-500 text-sm mb-4">
              Describe what you want in plain English. AI configures everything.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Natural language input
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Auto-configure all settings
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Refine with manual tweaks
              </li>
            </ul>
          </button>

          {/* Manual Mode Card */}
          <button
            onClick={() => onSelectMode('manual')}
            className="group relative p-6 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-400 hover:shadow-lg transition-all text-left"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-blue-100 rounded text-xs text-blue-600 font-medium">
              Guided
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Step-by-Step</h3>
            <p className="text-slate-500 text-sm mb-4">
              Guided wizard with smart suggestions at each step.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Product search with counts
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Pick exact filter values
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Live preview at each step
              </li>
            </ul>
          </button>

          {/* Advanced Mode Card */}
          <button
            onClick={() => onSelectMode('advanced')}
            className="group relative p-6 rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-slate-400 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Advanced</h3>
            <p className="text-slate-500 text-sm mb-4">
              Full control with all panels. For power users.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                All configuration options
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Complex filter logic (AND/OR)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                AI logic blocks
              </li>
            </ul>
          </button>
        </div>

        {/* Quick Examples */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 mb-4">Not sure? Try these common widgets:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Revenue by carrier',
              'Shipments by origin state',
              'Monthly trend',
              'Top products by cost',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => onSelectMode('ai')}
                className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AI ASSIST SCREEN
// =============================================================================

interface AIAssistScreenProps {
  onComplete: () => void;
  onSwitchToManual: () => void;
}

function AIAssistScreen({ onComplete, onSwitchToManual }: AIAssistScreenProps) {
  const { state } = useBuilder();
  
  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
        {/* Left - AI Assistant */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">AI Assistant</h3>
                <p className="text-xs text-slate-500">Describe what you want to visualize</p>
              </div>
            </div>
          </div>
          
          {/* Use existing AI assistant */}
          <AISuggestionAssistant />
          
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onSwitchToManual}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Switch to manual configuration →
            </button>
          </div>
        </div>

        {/* Right - Preview */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <PreviewPanel />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
            >
              Continue to Advanced Settings
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL BUILDER SCREEN
// =============================================================================

interface ManualBuilderScreenProps {
  step: ManualStep;
  onStepChange: (step: ManualStep) => void;
  onComplete: () => void;
}

function ManualBuilderScreen({ step, onStepChange, onComplete }: ManualBuilderScreenProps) {
  const steps: ManualStep[] = ['filter', 'breakdown', 'measure', 'chart', 'publish'];
  const currentIndex = steps.indexOf(step);

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      onStepChange(steps[currentIndex + 1]);
    } else {
      onComplete();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      onStepChange(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
        {/* Left - Step Content */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {step === 'filter' && <ManualFilterStep onNext={goNext} />}
            {step === 'breakdown' && <ManualBreakdownStep onNext={goNext} onBack={goBack} />}
            {step === 'measure' && <ManualMeasureStep onNext={goNext} onBack={goBack} />}
            {step === 'chart' && <ManualChartStep onNext={goNext} onBack={goBack} />}
            {step === 'publish' && <ManualPublishStep onBack={goBack} />}
          </div>
        </div>

        {/* Right - Preview */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL STEP: FILTER
// =============================================================================

interface ManualFilterStepProps {
  onNext: () => void;
}

function ManualFilterStep({ onNext }: ManualFilterStepProps) {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FilterValueOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get existing filter block or create new one
  const productFilterBlock = state.logicBlocks.find(
    b => b.type === 'filter' && b.label === 'Product Filter'
  ) as FilterBlock | undefined;

  // Initialize selected products from existing filter
  useEffect(() => {
    if (productFilterBlock) {
      const productCondition = productFilterBlock.conditions.find(c => c.field === 'description');
      if (productCondition && Array.isArray(productCondition.value)) {
        setSelectedProducts(productCondition.value as string[]);
      }
    }
  }, []);

  // Search for products in shipment_item.description
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      // Query item descriptions matching search term
      const { data, error } = await supabase
        .from('shipment_item')
        .select('description')
        .ilike('description', `%${searchTerm}%`)
        .limit(500);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        return;
      }

      if (data) {
        // Group by uppercase description and count
        const counts = new Map<string, { count: number; sample: string }>();
        for (const row of data) {
          if (row.description) {
            // Use first part before " - " as the grouping key for cleaner results
            const desc = row.description.toUpperCase();
            const key = desc.split(' - ')[0].trim() || desc.substring(0, 50);
            
            if (counts.has(key)) {
              counts.get(key)!.count++;
            } else {
              counts.set(key, { count: 1, sample: row.description });
            }
          }
        }
        
        const results: FilterValueOption[] = Array.from(counts.entries())
          .map(([value, { count }]) => ({ value, label: value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);
        
        setSearchResults(results);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleProduct = (value: string) => {
    const newProducts = selectedProducts.includes(value)
      ? selectedProducts.filter(p => p !== value)
      : [...selectedProducts, value];
    
    setSelectedProducts(newProducts);
    updateProductFilter(newProducts);
  };

  const updateProductFilter = (products: string[]) => {
    if (products.length === 0) {
      // Remove filter block if no products selected
      if (productFilterBlock) {
        removeLogicBlock(productFilterBlock.id);
      }
      return;
    }

    const condition: FilterCondition = {
      field: 'description',
      operator: 'contains_any',
      value: products,
    };

    if (productFilterBlock) {
      updateLogicBlock(productFilterBlock.id, {
        conditions: [condition],
      });
    } else {
      const newBlock: FilterBlock = {
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: [condition],
        enabled: true,
        label: 'Product Filter',
      };
      addLogicBlock(newBlock);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Filter by Product</h2>
        <p className="text-slate-500">
          Search for products to include. Leave empty to include all shipments.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search products (e.g., drawer system, cargoglide)"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {/* Quick suggestions */}
        <div className="flex gap-2 mt-3">
          <span className="text-xs text-slate-400">Try:</span>
          {['drawer', 'cargoglide', 'toolbox', 'decked'].map(term => (
            <button
              key={term}
              onClick={() => setSearchTerm(term)}
              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Found {searchResults.length} products
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((result, i) => {
              const isSelected = selectedProducts.includes(result.value);
              return (
                <button
                  key={i}
                  onClick={() => toggleProduct(result.value)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded flex items-center justify-center
                      ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200'}
                    `}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {result.label}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {result.count.toLocaleString()} shipments
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Selected ({selectedProducts.length})
            </span>
            <button
              onClick={() => { setSelectedProducts([]); updateProductFilter([]); }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map(product => (
              <span
                key={product}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm"
              >
                {product}
                <button onClick={() => toggleProduct(product)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skip Note */}
      {selectedProducts.length === 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">
            💡 You can skip this step to include all shipments in your analysis.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
        >
          Next: Choose Breakdown
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL STEP: BREAKDOWN
// =============================================================================

interface ManualBreakdownStepProps {
  onNext: () => void;
  onBack: () => void;
}

function ManualBreakdownStep({ onNext, onBack }: ManualBreakdownStepProps) {
  const { state, setVisualization } = useBuilder();
  const [breakdownType, setBreakdownType] = useState<string>(state.visualization.xField || '');
  const [availableValues, setAvailableValues] = useState<FilterValueOption[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  const breakdownOptions = [
    { id: '', label: 'No breakdown', desc: 'Show total only', icon: '📊' },
    { id: 'origin_state', label: 'Origin State', desc: 'By pickup location', icon: '📍' },
    { id: 'destination_state', label: 'Destination State', desc: 'By delivery location', icon: '🎯' },
    { id: 'carrier_name', label: 'Carrier', desc: 'By carrier name', icon: '🚛' },
    { id: 'mode_name', label: 'Mode', desc: 'FTL, LTL, etc.', icon: '📦' },
    { id: 'equipment_name', label: 'Equipment', desc: 'Van, Flatbed, etc.', icon: '🚚' },
  ];

  // Load available values when breakdown type changes
  useEffect(() => {
    if (breakdownType) {
      loadAvailableValues(breakdownType);
    } else {
      setAvailableValues([]);
      setSelectedValues([]);
    }
  }, [breakdownType]);

  const loadAvailableValues = async (field: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipment_report_view')
        .select(field)
        .not(field, 'is', null)
        .limit(1000);

      if (data) {
        const counts = new Map<string, number>();
        for (const row of data) {
          const val = row[field];
          if (val) {
            counts.set(val, (counts.get(val) || 0) + 1);
          }
        }
        
        const results: FilterValueOption[] = Array.from(counts.entries())
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => b.count - a.count);
        
        setAvailableValues(results);
        setSelectedValues(results.map(r => r.value)); // Select all by default
      }
    } catch (err) {
      console.error('Error loading values:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakdownSelect = (id: string) => {
    setBreakdownType(id);
    setVisualization({ xField: id || undefined });
  };

  const toggleValue = (value: string) => {
    setSelectedValues(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const selectTop = (n: number) => {
    setSelectedValues(availableValues.slice(0, n).map(v => v.value));
  };

  const filteredValues = filterSearch
    ? availableValues.filter(v => 
        v.value.toLowerCase().includes(filterSearch.toLowerCase())
      )
    : availableValues;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Choose Breakdown</h2>
        <p className="text-slate-500">How do you want to group your data?</p>
      </div>

      {/* Breakdown Type Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {breakdownOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleBreakdownSelect(opt.id)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${breakdownType === opt.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{opt.icon}</span>
              <div>
                <div className={`font-medium ${breakdownType === opt.id ? 'text-orange-700' : 'text-slate-700'}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Value Selection */}
      {breakdownType && availableValues.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">
              Select values ({selectedValues.length} of {availableValues.length})
            </span>
            <div className="flex gap-2">
              <button onClick={() => selectTop(5)} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">
                Top 5
              </button>
              <button onClick={() => selectTop(10)} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">
                Top 10
              </button>
              <button 
                onClick={() => setSelectedValues(availableValues.map(v => v.value))} 
                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                All
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search values..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {/* Values List */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading values...</div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredValues.map((item, i) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <button
                    key={i}
                    onClick={() => toggleValue(item.value)}
                    className={`
                      w-full flex items-center justify-between p-2 rounded transition-all
                      ${isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-4 h-4 rounded border flex items-center justify-center
                        ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}
                      `}>
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">{item.count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
        >
          Next: Choose Measure
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL STEP: MEASURE
// =============================================================================

interface ManualMeasureStepProps {
  onNext: () => void;
  onBack: () => void;
}

function ManualMeasureStep({ onNext, onBack }: ManualMeasureStepProps) {
  const { state, setVisualization } = useBuilder();
  
  const measureOptions = [
    { id: 'retail', label: 'Revenue', desc: 'Customer charge', icon: '💰' },
    { id: 'cost', label: 'Cost', desc: 'Carrier cost (admin)', icon: '📉', admin: true },
    { id: 'miles', label: 'Miles', desc: 'Distance traveled', icon: '🛣️' },
    { id: 'total_weight', label: 'Weight', desc: 'Total weight', icon: '⚖️' },
  ];

  const aggregationOptions = [
    { id: 'sum', label: 'Total', desc: 'Sum of all values' },
    { id: 'avg', label: 'Average', desc: 'Mean value' },
    { id: 'count', label: 'Count', desc: 'Number of records' },
    { id: 'min', label: 'Minimum', desc: 'Lowest value' },
    { id: 'max', label: 'Maximum', desc: 'Highest value' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Choose Measure</h2>
        <p className="text-slate-500">What metric do you want to calculate?</p>
      </div>

      {/* Measure Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Metric</h3>
        <div className="grid grid-cols-2 gap-3">
          {measureOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setVisualization({ yField: opt.id })}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${state.visualization.yField === opt.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${state.visualization.yField === opt.id ? 'text-orange-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </span>
                    {opt.admin && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Admin</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Aggregation Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Aggregation</h3>
        <div className="flex flex-wrap gap-2">
          {aggregationOptions.map(agg => (
            <button
              key={agg.id}
              onClick={() => setVisualization({ aggregation: agg.id as any })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${state.visualization.aggregation === agg.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              {agg.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {aggregationOptions.find(a => a.id === state.visualization.aggregation)?.desc}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="text-sm text-slate-500 mb-1">Your widget will show:</div>
        <div className="text-lg font-medium text-slate-900">
          {aggregationOptions.find(a => a.id === state.visualization.aggregation)?.label || 'Sum'}{' '}
          {measureOptions.find(m => m.id === state.visualization.yField)?.label || 'Revenue'}
          {state.visualization.xField && (
            <span className="text-slate-600"> by {state.visualization.xField.replace('_', ' ')}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
        >
          Next: Choose Chart
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL STEP: CHART
// =============================================================================

interface ManualChartStepProps {
  onNext: () => void;
  onBack: () => void;
}

function ManualChartStep({ onNext, onBack }: ManualChartStepProps) {
  const { state, setVisualization, setTitle } = useBuilder();

  const chartOptions: { id: VisualizationType; label: string; icon: string; desc: string }[] = [
    { id: 'bar', label: 'Bar Chart', icon: '📊', desc: 'Compare values across categories' },
    { id: 'line', label: 'Line Chart', icon: '📈', desc: 'Show trends over time' },
    { id: 'pie', label: 'Pie Chart', icon: '🥧', desc: 'Show proportions' },
    { id: 'area', label: 'Area Chart', icon: '📉', desc: 'Cumulative trends' },
    { id: 'kpi', label: 'KPI Card', icon: '🔢', desc: 'Single value highlight' },
    { id: 'table', label: 'Table', icon: '📋', desc: 'Detailed data view' },
    { id: 'choropleth', label: 'Map', icon: '🗺️', desc: 'Geographic distribution' },
    { id: 'treemap', label: 'Treemap', icon: '🔲', desc: 'Hierarchical data' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Choose Visualization</h2>
        <p className="text-slate-500">Pick the chart type that best represents your data</p>
      </div>

      {/* Chart Type Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {chartOptions.map(chart => (
          <button
            key={chart.id}
            onClick={() => setVisualization({ type: chart.id })}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${state.visualization.type === chart.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{chart.icon}</span>
              <div>
                <div className={`font-medium ${state.visualization.type === chart.id ? 'text-orange-700' : 'text-slate-700'}`}>
                  {chart.label}
                </div>
                <div className="text-xs text-slate-500">{chart.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Widget Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Widget Title
        </label>
        <input
          type="text"
          value={state.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Revenue by Carrier"
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
        >
          Next: Publish
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MANUAL STEP: PUBLISH
// =============================================================================

interface ManualPublishStepProps {
  onBack: () => void;
}

function ManualPublishStep({ onBack }: ManualPublishStepProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Publish Widget</h2>
        <p className="text-slate-500">Configure where this widget will appear</p>
      </div>

      {/* Use existing PublishPanel */}
      <PublishPanel />

      {/* Navigation */}
      <div className="flex justify-start mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ADVANCED BUILDER SCREEN (Original Layout)
// =============================================================================

function AdvancedBuilderScreen() {
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
    <div className="p-4">
      <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
        {/* Left Panel */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* AI Assistant */}
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

        {/* Right Panel */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Preview */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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

export default EnhancedVisualBuilderPage;
