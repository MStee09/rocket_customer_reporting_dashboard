import { useState } from 'react';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addProduct, validateProductCorrelation } from '../../services/customerIntelligenceService';
import type { CorrelationValidationResult } from '../../types/customerIntelligence';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  onProductAdded: () => void;
}

const FIELD_OPTIONS = [
  { value: 'description', label: 'Item Description', hint: 'Most common for product names' },
  { value: 'commodity', label: 'Item Commodity', hint: '' },
  { value: 'reference_number', label: 'Reference Number', hint: '' },
];

export function AddProductModal({ isOpen, onClose, customerId, onProductAdded }: AddProductModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [productName, setProductName] = useState('');
  const [selectedField, setSelectedField] = useState('description');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<CorrelationValidationResult | null>(null);

  const resetForm = () => {
    setStep(1);
    setProductName('');
    setSelectedField('description');
    setKeywords([]);
    setKeywordInput('');
    setValidationResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleValidate = async () => {
    if (keywords.length === 0) return;

    setIsValidating(true);
    try {
      const result = await validateProductCorrelation(customerId, selectedField, keywords);
      setValidationResult(result);
      setStep(2);
    } catch (err) {
      console.error('Error validating product:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveProduct = async (asSoftKnowledge: boolean) => {
    if (!user || !productName.trim()) return;

    setIsSaving(true);
    try {
      await addProduct(
        customerId,
        {
          name: productName.trim(),
          searchField: selectedField,
          keywords,
          validated: !asSoftKnowledge && (validationResult?.isValid ?? false),
          matchCount: asSoftKnowledge ? 0 : (validationResult?.matchCount ?? 0),
          matchPercent: asSoftKnowledge ? 0 : (validationResult?.matchPercent ?? 0),
          sampleMatches: asSoftKnowledge ? [] : (validationResult?.sampleMatches ?? []),
          validatedAt: new Date().toISOString(),
          isSoftKnowledge: asSoftKnowledge,
        },
        user.id,
        user.email || 'unknown',
        productName,
        {
          validated: !asSoftKnowledge,
          searchField: selectedField,
          keywords,
          matchCount: validationResult?.matchCount ?? 0,
          sampleMatches: validationResult?.sampleMatches ?? [],
          savedAsSoft: asSoftKnowledge,
        }
      );
      onProductAdded();
      handleClose();
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {step === 1 ? 'Add Product' : 'Validation Results'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={step === 1 ? 'text-blue-600 font-medium' : ''}>1. Setup</span>
            <ChevronRight className="w-4 h-4" />
            <span className={step === 2 ? 'text-blue-600 font-medium' : ''}>2. Validate</span>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Electronics, Furniture, Medical Supplies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Field
                </label>
                <div className="space-y-2">
                  {FIELD_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedField === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="searchField"
                        value={option.value}
                        checked={selectedField === option.value}
                        onChange={(e) => setSelectedField(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-rocket-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{option.label}</span>
                        {option.hint && (
                          <span className="ml-2 text-sm text-gray-500">({option.hint})</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a keyword and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    disabled={!keywordInput.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {keywords.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Add keywords to search for in shipment data
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={isValidating || !productName.trim() || keywords.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Validate
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              {validationResult && validationResult.matchCount > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">
                        Found {validationResult.matchCount.toLocaleString()} matching shipments
                      </p>
                      <p className="text-sm text-green-700">
                        ({validationResult.matchPercent}% of total)
                      </p>
                    </div>
                  </div>

                  {validationResult.sampleMatches.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Sample matches:</p>
                      <ul className="space-y-1">
                        {validationResult.sampleMatches.map((match, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200"
                          >
                            {match}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">No matches found</p>
                      <p className="text-sm text-amber-700 mt-1">
                        I searched the <span className="font-medium">{selectedField}</span> field for{' '}
                        <span className="font-medium">"{keywords.join('", "')}"</span> but found 0
                        matches.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Options:</p>
                    <ul className="text-sm text-gray-600 space-y-1 pl-4">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Try different keywords
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Try a different field
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Save as soft knowledge (context only)
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-3">
                {validationResult && validationResult.matchCount > 0 ? (
                  <button
                    onClick={() => handleSaveProduct(false)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Save Product
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveProduct(true)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Save as Soft Knowledge
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddProductModal;
