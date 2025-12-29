import { Database, Plus, X, Link2 } from 'lucide-react';
import { ReportBuilderState, ReportJoin } from '../../types/reports';
import { TABLE_METADATA, getAvailableJoins } from '../../config/reportBuilderMetadata';

interface DataSourceStepProps {
  state: ReportBuilderState;
  updateState: (updates: Partial<ReportBuilderState>) => void;
}

export function DataSourceStep({ state, updateState }: DataSourceStepProps) {
  const availableJoins = getAvailableJoins(state.primaryTable);

  const addJoin = (relationship: any) => {
    const newJoin: ReportJoin = {
      table: relationship.toTable,
      on: relationship.joinKey,
      type: 'inner'
    };

    updateState({
      joins: [...state.joins, newJoin]
    });
  };

  const removeJoin = (index: number) => {
    const newJoins = [...state.joins];
    newJoins.splice(index, 1);
    updateState({ joins: newJoins });
  };

  const updateJoinType = (index: number, type: 'inner' | 'left' | 'right') => {
    const newJoins = [...state.joins];
    newJoins[index].type = type;
    updateState({ joins: newJoins });
  };

  const isJoinAdded = (tableName: string) => {
    return state.joins.some(j => j.table === tableName);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Database className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Data Source</h3>
          <p className="text-slate-600">Select your primary table and any related data to include</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Primary Table
          </label>
          <select
            value={state.primaryTable}
            onChange={(e) => updateState({ primaryTable: e.target.value, joins: [] })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
          >
            {Object.entries(TABLE_METADATA).map(([key, metadata]) => (
              <option key={key} value={key}>
                {metadata.displayLabel} - {metadata.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            The main table that contains your data
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-800">Related Data (Joins)</h4>
            <span className="text-xs text-slate-600">
              {state.joins.length} joined table{state.joins.length !== 1 ? 's' : ''}
            </span>
          </div>

          {state.joins.length > 0 && (
            <div className="space-y-3 mb-4">
              {state.joins.map((join, index) => {
                const metadata = TABLE_METADATA[join.table];
                return (
                  <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-800">{metadata?.displayLabel}</p>
                          <p className="text-xs text-slate-600">{metadata?.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeJoin(index)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Join Key</p>
                        <p className="font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded">
                          {join.on}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Join Type</p>
                        <select
                          value={join.type || 'inner'}
                          onChange={(e) => updateJoinType(index, e.target.value as any)}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        >
                          <option value="inner">Inner (matching rows only)</option>
                          <option value="left">Left (all primary + matches)</option>
                          <option value="right">Right (all related + matches)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {availableJoins.length > state.joins.length && (
            <div>
              <p className="text-sm text-slate-700 mb-2">Available Related Tables:</p>
              <div className="grid grid-cols-2 gap-2">
                {availableJoins
                  .filter(rel => !isJoinAdded(rel.toTable))
                  .map((relationship) => {
                    const metadata = TABLE_METADATA[relationship.toTable];
                    return (
                      <button
                        key={relationship.toTable}
                        onClick={() => addJoin(relationship)}
                        className="flex items-center gap-2 p-3 border border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{metadata?.displayLabel}</p>
                          <p className="text-xs text-slate-600">{relationship.displayLabel}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {availableJoins.length === state.joins.length && availableJoins.length > 0 && (
            <p className="text-sm text-slate-600 text-center py-2">
              All available related tables have been added
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-medium">Tip:</span> Add related tables to access more fields for your calculations. For example, add "Line Items" to analyze quantities or "Carrier Details" to group by carrier.
          </p>
        </div>
      </div>
    </div>
  );
}
