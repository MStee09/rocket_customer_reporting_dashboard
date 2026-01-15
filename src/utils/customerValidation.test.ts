import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
    })),
  },
}));

vi.mock('./logger', () => ({
  logger: {
    log: vi.fn(),
  },
}));

interface CustomerRecord {
  customer_id: number;
  company_name: string;
  is_active: boolean;
}

interface ValidationResult {
  valid: boolean;
  actualName?: string;
  error?: string;
}

function validateCustomerData(customer: CustomerRecord | null, expectedName?: string): ValidationResult {
  if (!customer) {
    return { valid: false, error: 'Customer not found' };
  }

  if (!customer.is_active) {
    return { valid: false, actualName: customer.company_name, error: 'Customer is inactive' };
  }

  return { valid: true, actualName: customer.company_name };
}

function validateCustomerId(customerId: unknown): { valid: boolean; error?: string } {
  if (customerId === null || customerId === undefined) {
    return { valid: false, error: 'Customer ID is required' };
  }

  if (typeof customerId !== 'number') {
    return { valid: false, error: 'Customer ID must be a number' };
  }

  if (customerId <= 0) {
    return { valid: false, error: 'Customer ID must be positive' };
  }

  if (!Number.isInteger(customerId)) {
    return { valid: false, error: 'Customer ID must be an integer' };
  }

  return { valid: true };
}

function countShipmentsByCustomer(
  shipments: Array<{ customer_id: number }>
): Record<number, number> {
  return shipments.reduce((acc, s) => {
    acc[s.customer_id] = (acc[s.customer_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
}

describe('validateCustomerData', () => {
  it('should return valid for active customer', () => {
    const customer: CustomerRecord = {
      customer_id: 1,
      company_name: 'Acme Corp',
      is_active: true,
    };

    const result = validateCustomerData(customer);
    expect(result.valid).toBe(true);
    expect(result.actualName).toBe('Acme Corp');
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for null customer', () => {
    const result = validateCustomerData(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Customer not found');
  });

  it('should return invalid for inactive customer', () => {
    const customer: CustomerRecord = {
      customer_id: 2,
      company_name: 'Inactive Inc',
      is_active: false,
    };

    const result = validateCustomerData(customer);
    expect(result.valid).toBe(false);
    expect(result.actualName).toBe('Inactive Inc');
    expect(result.error).toBe('Customer is inactive');
  });
});

describe('validateCustomerId', () => {
  it('should accept valid positive integer IDs', () => {
    expect(validateCustomerId(1).valid).toBe(true);
    expect(validateCustomerId(100).valid).toBe(true);
    expect(validateCustomerId(999999).valid).toBe(true);
  });

  it('should reject null or undefined', () => {
    expect(validateCustomerId(null).valid).toBe(false);
    expect(validateCustomerId(null).error).toBe('Customer ID is required');

    expect(validateCustomerId(undefined).valid).toBe(false);
    expect(validateCustomerId(undefined).error).toBe('Customer ID is required');
  });

  it('should reject non-number types', () => {
    expect(validateCustomerId('123').valid).toBe(false);
    expect(validateCustomerId('123').error).toBe('Customer ID must be a number');

    expect(validateCustomerId({}).valid).toBe(false);
    expect(validateCustomerId([]).valid).toBe(false);
  });

  it('should reject zero and negative numbers', () => {
    expect(validateCustomerId(0).valid).toBe(false);
    expect(validateCustomerId(0).error).toBe('Customer ID must be positive');

    expect(validateCustomerId(-1).valid).toBe(false);
    expect(validateCustomerId(-100).valid).toBe(false);
  });

  it('should reject non-integer numbers', () => {
    expect(validateCustomerId(1.5).valid).toBe(false);
    expect(validateCustomerId(1.5).error).toBe('Customer ID must be an integer');

    expect(validateCustomerId(99.99).valid).toBe(false);
  });
});

describe('countShipmentsByCustomer', () => {
  it('should count shipments per customer correctly', () => {
    const shipments = [
      { customer_id: 1 },
      { customer_id: 1 },
      { customer_id: 2 },
      { customer_id: 1 },
      { customer_id: 3 },
      { customer_id: 2 },
    ];

    const counts = countShipmentsByCustomer(shipments);

    expect(counts[1]).toBe(3);
    expect(counts[2]).toBe(2);
    expect(counts[3]).toBe(1);
  });

  it('should return empty object for empty array', () => {
    const counts = countShipmentsByCustomer([]);
    expect(Object.keys(counts).length).toBe(0);
  });

  it('should handle single customer', () => {
    const shipments = [
      { customer_id: 5 },
      { customer_id: 5 },
      { customer_id: 5 },
    ];

    const counts = countShipmentsByCustomer(shipments);
    expect(counts[5]).toBe(3);
    expect(Object.keys(counts).length).toBe(1);
  });
});

describe('data integrity checks', () => {
  it('should detect missing required fields', () => {
    const requiredFields = ['customer_id', 'company_name', 'is_active'];

    const validCustomer = {
      customer_id: 1,
      company_name: 'Test Corp',
      is_active: true,
    };

    const missingFields = requiredFields.filter(
      (field) => !(field in validCustomer)
    );
    expect(missingFields.length).toBe(0);

    const incompleteCustomer = {
      customer_id: 1,
    };

    const missingInIncomplete = requiredFields.filter(
      (field) => !(field in incompleteCustomer)
    );
    expect(missingInIncomplete).toContain('company_name');
    expect(missingInIncomplete).toContain('is_active');
  });

  it('should validate company name is not empty', () => {
    const validateCompanyName = (name: string | null | undefined): boolean => {
      if (!name) return false;
      return name.trim().length > 0;
    };

    expect(validateCompanyName('Acme Corp')).toBe(true);
    expect(validateCompanyName('')).toBe(false);
    expect(validateCompanyName('   ')).toBe(false);
    expect(validateCompanyName(null)).toBe(false);
    expect(validateCompanyName(undefined)).toBe(false);
  });
});
