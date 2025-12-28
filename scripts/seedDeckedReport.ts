import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
      createdBy: 'system',
    },
  ],
};

async function seedDeckedReport() {
  try {
    console.log('Seeding DECKED report...');

    const customerId = 4586648;
    const filePath = `${customerId}.json`;

    const blob = new Blob([JSON.stringify(deckedReportConfig, null, 2)], {
      type: 'application/json',
    });

    const { data, error } = await supabase.storage
      .from('customer-reports')
      .upload(filePath, blob, {
        upsert: true,
        contentType: 'application/json',
      });

    if (error) {
      console.error('Error uploading report:', error);
      process.exit(1);
    }

    console.log('Successfully seeded DECKED report:', data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedDeckedReport();
