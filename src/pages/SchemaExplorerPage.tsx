import { useEffect, useState } from 'react';
import { Database, Table, Loader2, Copy, CheckCircle2, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchTablesAndViews, fetchTableData } from '../lib/database';
import { TableMetadata } from '../types/database';
import { Card } from '../components/ui/Card';

type TabId = 'tables' | 'lookups';

const TABS = [
  { id: 'tables' as TabId, label: 'Tables & Views', icon: Database },
  { id: 'lookups' as TabId, label: 'Lookup Tables', icon: List },
];

export function SchemaExplorerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('tables');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Schema Explorer</h1>
        <p className="text-slate-600 mt-1">Explore database tables, field mappings, and lookup values</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-rocket-500 text-rocket-600 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tables' && <TablesTab />}
      {activeTab === 'lookups' && <LookupTablesTab />}
    </div>
  );
}

function TablesTab() {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableDetails(selectedTable);
    }
  }, [selectedTable]);

  const loadTables = async () => {
    setIsLoading(true);
    const data = await fetchTablesAndViews();
    setTables(data);
    if (data.length > 0 && !selectedTable) {
      setSelectedTable(data[0].name);
    }
    setIsLoading(false);
  };

  const loadTableDetails = async (tableName: string) => {
    setIsLoadingTable(true);
    const data = await fetchTableData(tableName, 1, 5);
    setTableData(data);
    setIsLoadingTable(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExampleQuery = (tableName: string) => {
    return `const { data, error } = await supabase
  .from('${tableName}')
  .select('*')
  .limit(10);`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 gap-6">
      <div className="md:col-span-1">
        <Card variant="elevated" padding="md">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-rocket-600" />
            Tables & Views
          </h2>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  selectedTable === table.name
                    ? 'bg-rocket-50 text-rocket-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Table className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{table.name}</span>
                {table.type === 'view' && (
                  <span className="ml-auto text-xs text-slate-500">view</span>
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="md:col-span-3">
        {selectedTable ? (
          <div className="space-y-6">
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedTable}</h2>
              <p className="text-slate-600">
                {tables.find((t) => t.name === selectedTable)?.type === 'view'
                  ? 'Database View'
                  : 'Database Table'}
              </p>
            </Card>

            {isLoadingTable ? (
              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-rocket-600 animate-spin" />
                </div>
              </Card>
            ) : (
              <>
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Columns</h3>
                  {tableData?.columns && tableData.columns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
                              Column Name
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
                              Sample Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.columns.map((column: string) => (
                            <tr key={column} className="border-b border-slate-100">
                              <td className="px-4 py-3 text-sm font-medium text-slate-800 font-mono">
                                {column}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {tableData.rows[0]?.[column] !== undefined &&
                                tableData.rows[0]?.[column] !== null
                                  ? typeof tableData.rows[0][column] === 'object'
                                    ? JSON.stringify(tableData.rows[0][column])
                                    : String(tableData.rows[0][column])
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500">No columns found</p>
                  )}
                </Card>

                <Card variant="elevated" padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Example Query</h3>
                    <button
                      onClick={() => copyToClipboard(getExampleQuery(selectedTable))}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-rocket-600 hover:bg-rocket-50 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{getExampleQuery(selectedTable)}</code>
                  </pre>
                </Card>
              </>
            )}
          </div>
        ) : (
          <Card variant="elevated" padding="lg">
            <div className="text-center">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a table to view details</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface LookupRow {
  [key: string]: unknown;
}

interface LookupCardColumn {
  key: string;
  label: string;
  mono?: boolean;
  highlight?: boolean;
  boolean?: boolean;
}

function LookupTablesTab() {
  const [modes, setModes] = useState<LookupRow[]>([]);
  const [statuses, setStatuses] = useState<LookupRow[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [m, s, e] = await Promise.all([
        supabase.from('shipment_mode').select('*').order('display_order'),
        supabase.from('shipment_status').select('*').order('display_order'),
        supabase.from('equipment_type').select('*').order('display_order'),
      ]);
      setModes(m.data || []);
      setStatuses(s.data || []);
      setEquipmentTypes(e.data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-rocket-50 border border-rocket-200 rounded-xl p-4">
        <p className="text-sm text-rocket-800">
          <strong>About Lookup Tables:</strong> These tables provide the display values for ID fields in
          reports and widgets. When you see <code className="bg-rocket-100 px-1 rounded">mode_id = 2</code>,
          the lookup table translates it to <code className="bg-rocket-100 px-1 rounded">LTL</code>.
        </p>
      </div>

      <LookupCard
        title="Shipment Modes"
        description="Transportation modes - maps mode_id to display values"
        fieldMapping="mode_id -> mode_code / mode_name"
        data={modes}
        columns={[
          { key: 'mode_id', label: 'ID', mono: true },
          { key: 'mode_code', label: 'Code', highlight: true },
          { key: 'mode_name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'is_active', label: 'Active', boolean: true },
        ]}
      />

      <LookupCard
        title="Shipment Statuses"
        description="Status values - maps status_id to display values"
        fieldMapping="status_id -> status_code / status_name"
        data={statuses}
        columns={[
          { key: 'status_id', label: 'ID', mono: true },
          { key: 'status_code', label: 'Code', highlight: true },
          { key: 'status_name', label: 'Name' },
          { key: 'is_completed', label: 'Completed', boolean: true },
          { key: 'is_cancelled', label: 'Cancelled', boolean: true },
          { key: 'is_active', label: 'Active', boolean: true },
        ]}
      />

      <LookupCard
        title="Equipment Types"
        description="Equipment/trailer types - maps equipment_type_id to display values"
        fieldMapping="equipment_type_id -> equipment_code / equipment_name"
        data={equipmentTypes}
        columns={[
          { key: 'equipment_type_id', label: 'ID', mono: true },
          { key: 'equipment_code', label: 'Code', highlight: true },
          { key: 'equipment_name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'is_active', label: 'Active', boolean: true },
        ]}
      />
    </div>
  );
}

function LookupCard({
  title,
  description,
  fieldMapping,
  data,
  columns,
}: {
  title: string;
  description: string;
  fieldMapping: string;
  data: LookupRow[];
  columns: LookupCardColumn[];
}) {
  return (
    <Card variant="outlined" padding="none">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <div className="text-xs bg-rocket-100 text-rocket-700 px-2 py-1 rounded font-mono">
            {fieldMapping}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left border-b">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 font-medium text-slate-600">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 ${col.mono ? 'font-mono text-xs text-slate-500' : ''} ${col.highlight ? 'font-semibold text-rocket-600' : ''}`}
                  >
                    {col.boolean ? (
                      row[col.key] ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )
                    ) : (
                      String(row[col.key] ?? '-')
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        {data.length} records
      </div>
    </Card>
  );
}
