import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { verifyActiveCustomers } from '../utils/customerValidation';

export function DebugPage() {
  const { user, isAdmin, effectiveCustomerIds, customers, viewingAsCustomerId, isViewingAsCustomer } = useAuth();
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingReport, setSeedingReport] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string>('');
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    loadDebugInfo();
    loadCustomerData();
  }, [effectiveCustomerIds]);

  const loadCustomerData = async () => {
    setLoadingCustomers(true);
    try {
      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name, is_active')
        .order('company_name');

      if (customers) {
        const { data: shipments } = await supabase
          .from('shipment')
          .select('customer_id');

        const countMap = (shipments || []).reduce((acc, s) => {
          acc[s.customer_id] = (acc[s.customer_id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const enrichedCustomers = customers.map(c => ({
          ...c,
          shipment_count: countMap[c.customer_id] || 0
        }));

        setCustomerData(enrichedCustomers);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleVerifyCustomers = async () => {
    console.log('=== RUNNING CUSTOMER VERIFICATION ===');
    await verifyActiveCustomers();
    alert('Check console for customer verification results');
  };

  const loadDebugInfo = async () => {
    setLoading(true);

    // Call diagnostic function
    const { data: diag } = await supabase.rpc('get_diagnostic_info');
    setDiagnostic(diag);

    // Query shipments with no date filter
    const query = supabase
      .from('shipment')
      .select('load_id, customer_id, pickup_date, delivery_date, retail');

    if (!isAdmin() || isViewingAsCustomer) {
      query.in('customer_id', effectiveCustomerIds);
    }

    const { data: shipmentData, error } = await query.limit(100);

    console.log('Shipment query result:', { data: shipmentData, error, effectiveCustomerIds });
    setShipments(shipmentData || []);
    setLoading(false);
  };

  const seedDeckedReport = async () => {
    if (!isAdmin()) {
      setSeedMessage('Only admins can seed reports');
      return;
    }

    setSeedingReport(true);
    setSeedMessage('');

    try {
      const deckedReportConfig = {
        reports: [
          {
            id: 'avg-cost-per-unit-decked',
            name: 'Average Cost Per Unit',
            description: 'Track cost efficiency by product category',
            type: 'category_breakdown',
            config: {
              primaryTable: 'shipment',
              joins: [
                {
                  table: 'shipment_item',
                  on: 'load_id',
                  type: 'inner',
                },
              ],
              calculation: {
                numerator: {
                  field: 'retail',
                  aggregation: 'sum',
                },
                denominator: {
                  field: 'quantity',
                  aggregation: 'sum',
                },
              },
              groupBy: 'month',
              categories: [
                {
                  name: 'DRAWER SYSTEM',
                  keywords: ['DRAWER SYSTEM', 'DRAWER-SYSTEM', 'DRAWERSYSTEM'],
                  color: '#3b82f6',
                },
                {
                  name: 'CARGOGLIDE',
                  keywords: ['CARGOGLIDE', 'CARGO GLIDE', 'CARGO-GLIDE'],
                  color: '#10b981',
                },
                {
                  name: 'TOOLBOX',
                  keywords: ['TOOLBOX', 'TOOL BOX', 'TOOL-BOX'],
                  color: '#f59e0b',
                },
                {
                  name: 'OTHER',
                  keywords: [],
                  color: '#64748b',
                  isDefault: true,
                },
              ],
            },
            visualization: 'category_breakdown',
            createdAt: new Date().toISOString(),
            createdBy: user?.id || 'admin',
          },
        ],
      };

      const customerId = 4586648;
      const filePath = `${customerId}.json`;

      const blob = new Blob([JSON.stringify(deckedReportConfig, null, 2)], {
        type: 'application/json',
      });

      const { error } = await supabase.storage
        .from('customer-reports')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/json',
        });

      if (error) {
        throw error;
      }

      setSeedMessage('✅ Successfully seeded DECKED report! Navigate to Custom Reports to view it.');
    } catch (error: any) {
      console.error('Error seeding report:', error);
      setSeedMessage(`❌ Error: ${error.message || 'Failed to seed report'}`);
    } finally {
      setSeedingReport(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Debug Information</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current User State</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({
              userId: user?.id,
              email: user?.email,
              isAdmin: isAdmin(),
              isViewingAsCustomer,
              viewingAsCustomerId,
              effectiveCustomerIds,
              customersCount: customers.length,
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Database Diagnostic Info</h2>
          {diagnostic ? (
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(diagnostic, null, 2)}
            </pre>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Customers Array</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(customers, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Shipments Query Result (no date filter)</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <p className="mb-2">Found {shipments.length} shipments</p>
              <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-96">
                {JSON.stringify(shipments, null, 2)}
              </pre>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Verification</h2>
          <p className="text-gray-600 mb-4">
            All customers with shipment counts. This verifies customer_id accuracy.
          </p>
          {loadingCustomers ? (
            <p>Loading customer data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shipments</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerData.map((customer) => (
                    <tr key={customer.customer_id} className={!customer.is_active ? 'bg-gray-50 text-gray-500' : ''}>
                      <td className="px-4 py-2 text-sm">{customer.customer_id}</td>
                      <td className="px-4 py-2 text-sm font-medium">{customer.company_name}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          customer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`font-semibold ${customer.shipment_count === 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {customer.shipment_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={handleVerifyCustomers}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Run Customer Verification (Check Console)
          </button>
        </div>

        {isAdmin() && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Seed DECKED Custom Report</h2>
            <p className="text-gray-600 mb-4">
              Click the button below to seed the Average Cost Per Unit report for DECKED (Customer ID: 4586648)
            </p>
            <button
              onClick={seedDeckedReport}
              disabled={seedingReport}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {seedingReport ? 'Seeding...' : 'Seed DECKED Report'}
            </button>
            {seedMessage && (
              <div className={`mt-4 p-4 rounded-lg ${
                seedMessage.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {seedMessage}
              </div>
            )}
          </div>
        )}

        <button
          onClick={loadDebugInfo}
          className="px-4 py-2 bg-rocket-600 text-white rounded hover:bg-rocket-700"
        >
          Refresh Debug Info
        </button>
      </div>
    </div>
  );
}
