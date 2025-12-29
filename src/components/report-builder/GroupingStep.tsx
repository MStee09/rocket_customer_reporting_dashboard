import { useState } from 'react';
import { Layers, Plus, X, Palette } from 'lucide-react';
import { ReportBuilderState } from '../../types/reports';
import { CategoryConfig } from '../../types/metrics';

interface GroupingStepProps {
  state: ReportBuilderState;
  updateState: (updates: Partial<ReportBuilderState>) => void;
}

import { chartColors } from '../../config/chartTheme';
const PRESET_COLORS = chartColors.primary;

export function GroupingStep({ state, updateState }: GroupingStepProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKeywords, setNewCategoryKeywords] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);

  const addCategory = () => {
    if (!newCategoryName.trim()) return;

    const keywords = newCategoryKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const newCategory: CategoryConfig = {
      name: newCategoryName.trim(),
      keywords,
      color: newCategoryColor
    };

    updateState({
      categories: [...state.categories, newCategory]
    });

    setNewCategoryName('');
    setNewCategoryKeywords('');
    setNewCategoryColor(PRESET_COLORS[state.categories.length % PRESET_COLORS.length]);
  };

  const removeCategory = (index: number) => {
    const newCategories = [...state.categories];
    newCategories.splice(index, 1);
    updateState({ categories: newCategories });
  };

  const hasOtherCategory = state.categories.some(c => c.isDefault);

  const ensureOtherCategory = () => {
    if (!hasOtherCategory) {
      updateState({
        categories: [
          ...state.categories,
          {
            name: 'OTHER',
            keywords: [],
            color: '#64748b',
            isDefault: true
          }
        ]
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rocket-100 rounded-lg">
          <Layers className="w-8 h-8 text-rocket-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Grouping & Categories</h3>
          <p className="text-slate-600">Organize your data by time periods and categories</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Time Grouping
          </label>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { value: '', label: 'None' },
              { value: 'day', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
              { value: 'quarter', label: 'Quarterly' },
              { value: 'year', label: 'Yearly' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateState({ groupBy: option.value as any })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  state.groupBy === option.value
                    ? 'border-rocket-600 bg-rocket-50'
                    : 'border-slate-300 hover:border-rocket-400 bg-white'
                }`}
              >
                <p className="font-medium text-sm text-slate-800">{option.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.enableCategoryBreakdown}
                onChange={(e) => {
                  updateState({ enableCategoryBreakdown: e.target.checked });
                  if (e.target.checked && !hasOtherCategory) {
                    ensureOtherCategory();
                  }
                }}
                className="w-4 h-4 text-rocket-600 rounded focus:ring-rocket-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable Category Breakdown
              </span>
            </label>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Group your data by keywords in text fields (e.g., categorize items by product type)
          </p>

          {state.enableCategoryBreakdown && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categorize By Field
                </label>
                <select
                  value={state.categorizeByField}
                  onChange={(e) => updateState({ categorizeByField: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select a field...</option>
                  <option value="shipment_item.description">Line Item Description</option>
                  <option value="shipment.reference_number">Reference Number</option>
                  <option value="shipment_carrier.carrier_name">Carrier Name</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-800">Categories</h4>
                  <span className="text-xs text-slate-600">
                    {state.categories.length} categor{state.categories.length !== 1 ? 'ies' : 'y'}
                  </span>
                </div>

                {state.categories.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {state.categories.map((category, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-start gap-3"
                      >
                        <div
                          className="w-6 h-6 rounded flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-800">{category.name}</p>
                            {!category.isDefault && (
                              <button
                                onClick={() => removeCategory(index)}
                                className="p-1 hover:bg-red-50 rounded text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {category.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {category.keywords.map((keyword, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-slate-100 text-xs rounded text-slate-700"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 mt-1">
                              {category.isDefault ? 'Default category for unmatched items' : 'No keywords'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name (e.g., DRAWER SYSTEM)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newCategoryKeywords}
                    onChange={(e) => setNewCategoryKeywords(e.target.value)}
                    placeholder="Keywords, separated by commas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-slate-600" />
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewCategoryColor(color)}
                            className={`w-6 h-6 rounded border-2 ${
                              newCategoryColor === color ? 'border-slate-800 scale-110' : 'border-slate-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={addCategory}
                      disabled={!newCategoryName.trim()}
                      className="ml-auto px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add Category
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
