import { supabase } from '../lib/supabase';

export async function validateCustomerSelection(
  customerId: number,
  expectedName?: string
): Promise<{ valid: boolean; actualName?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('customer')
      .select('customer_id, company_name, is_active')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error(`[Validation] Error checking customer ${customerId}:`, error);
      return { valid: false, error: error.message };
    }

    if (!data) {
      console.error(`[Validation] Customer ID ${customerId} not found in database!`);
      return { valid: false, error: 'Customer not found' };
    }

    if (!data.is_active) {
      console.warn(`[Validation] Customer ${data.company_name} (ID: ${customerId}) is inactive!`);
      return { valid: false, actualName: data.company_name, error: 'Customer is inactive' };
    }

    if (expectedName && data.company_name !== expectedName) {
      console.warn(
        `[Validation] Customer name mismatch! Expected: ${expectedName}, Got: ${data.company_name} (ID: ${customerId})`
      );
    }

    console.log(`[Validation] ✓ Customer verified: ${data.company_name} (ID: ${customerId})`);
    return { valid: true, actualName: data.company_name };
  } catch (error) {
    console.error('[Validation] Unexpected error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

export async function verifyActiveCustomers(): Promise<void> {
  try {
    const { data: customers, error } = await supabase
      .from('customer')
      .select('customer_id, company_name, is_active')
      .eq('is_active', true)
      .order('company_name');

    if (error) {
      console.error('[Validation] Error loading active customers:', error);
      return;
    }

    if (customers && customers.length > 0) {
      console.log('[Validation] Active customers in database:');
      customers.forEach(c => {
        console.log(`  - ${c.company_name} (ID: ${c.customer_id})`);
      });

      const { data: shipmentCounts } = await supabase
        .from('shipment')
        .select('customer_id')
        .in('customer_id', customers.map(c => c.customer_id));

      if (shipmentCounts) {
        const countMap = shipmentCounts.reduce((acc, s) => {
          acc[s.customer_id] = (acc[s.customer_id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        console.log('[Validation] Shipment counts by customer:');
        customers.forEach(c => {
          const count = countMap[c.customer_id] || 0;
          console.log(`  - ${c.company_name} (ID: ${c.customer_id}): ${count} shipments`);
        });
      }
    } else {
      console.warn('[Validation] No active customers found!');
    }
  } catch (error) {
    console.error('[Validation] Error in verifyActiveCustomers:', error);
  }
}
