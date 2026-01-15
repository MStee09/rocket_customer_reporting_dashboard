import { describe, it, expect, vi, beforeEach } from 'vitest';

const categorizeItem = (
  description: string | null,
  categories: Array<{ name: string; keywords: string[]; isDefault?: boolean }>
): string => {
  if (!description) {
    const defaultCategory = categories.find((c) => c.isDefault);
    return defaultCategory?.name || 'OTHER';
  }

  const desc = description.toUpperCase();

  for (const category of categories) {
    if (category.keywords.length === 0 && category.isDefault) {
      continue;
    }
    for (const keyword of category.keywords) {
      if (desc.includes(keyword.toUpperCase())) {
        return category.name;
      }
    }
  }

  const defaultCategory = categories.find((c) => c.isDefault);
  return defaultCategory?.name || 'OTHER';
};

const calculateAvgCostPerUnit = (revenue: number, quantity: number): number => {
  return quantity > 0 ? revenue / quantity : 0;
};

const calculatePercentChange = (current: number, previous: number): number => {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
};

const calculateCategoryRevenue = (
  shipmentRetail: number,
  categoryQty: number,
  totalQty: number
): number => {
  if (totalQty === 0) return 0;
  return (shipmentRetail * categoryQty) / totalQty;
};

describe('categorizeItem', () => {
  const testCategories = [
    { name: 'ELECTRONICS', keywords: ['TV', 'COMPUTER', 'LAPTOP', 'PHONE'] },
    { name: 'AUTOMOTIVE', keywords: ['CAR', 'TRUCK', 'AUTO', 'VEHICLE', 'TIRE'] },
    { name: 'FURNITURE', keywords: ['CHAIR', 'TABLE', 'DESK', 'SOFA', 'BED'] },
    { name: 'OTHER', keywords: [], isDefault: true },
  ];

  it('should categorize electronics items correctly', () => {
    expect(categorizeItem('55" Samsung TV', testCategories)).toBe('ELECTRONICS');
    expect(categorizeItem('Dell Laptop Computer', testCategories)).toBe('ELECTRONICS');
    expect(categorizeItem('iPhone Phone Case', testCategories)).toBe('ELECTRONICS');
  });

  it('should categorize automotive items correctly', () => {
    expect(categorizeItem('Ford Truck Parts', testCategories)).toBe('AUTOMOTIVE');
    expect(categorizeItem('Car Battery', testCategories)).toBe('AUTOMOTIVE');
    expect(categorizeItem('Vehicle Accessories', testCategories)).toBe('AUTOMOTIVE');
    expect(categorizeItem('Winter Tires Set', testCategories)).toBe('AUTOMOTIVE');
  });

  it('should categorize furniture items correctly', () => {
    expect(categorizeItem('Office Chair', testCategories)).toBe('FURNITURE');
    expect(categorizeItem('Dining Table', testCategories)).toBe('FURNITURE');
    expect(categorizeItem('Standing Desk', testCategories)).toBe('FURNITURE');
  });

  it('should return default category for unmatched items', () => {
    expect(categorizeItem('Random Product', testCategories)).toBe('OTHER');
    expect(categorizeItem('Clothing Items', testCategories)).toBe('OTHER');
  });

  it('should return default category for null description', () => {
    expect(categorizeItem(null, testCategories)).toBe('OTHER');
  });

  it('should be case-insensitive', () => {
    expect(categorizeItem('tv stand', testCategories)).toBe('ELECTRONICS');
    expect(categorizeItem('CAR PARTS', testCategories)).toBe('AUTOMOTIVE');
    expect(categorizeItem('Office CHAIR', testCategories)).toBe('FURNITURE');
  });

  it('should return OTHER when no default category and no match', () => {
    const categoriesWithoutDefault = [
      { name: 'ELECTRONICS', keywords: ['TV', 'COMPUTER'] },
    ];
    expect(categorizeItem('Random Item', categoriesWithoutDefault)).toBe('OTHER');
    expect(categorizeItem(null, categoriesWithoutDefault)).toBe('OTHER');
  });
});

describe('calculateAvgCostPerUnit', () => {
  it('should calculate average cost per unit correctly', () => {
    expect(calculateAvgCostPerUnit(1000, 100)).toBe(10);
    expect(calculateAvgCostPerUnit(5000, 250)).toBe(20);
    expect(calculateAvgCostPerUnit(1500, 50)).toBe(30);
  });

  it('should return 0 when quantity is 0', () => {
    expect(calculateAvgCostPerUnit(1000, 0)).toBe(0);
  });

  it('should handle decimal results', () => {
    expect(calculateAvgCostPerUnit(100, 3)).toBeCloseTo(33.33, 2);
  });
});

describe('calculatePercentChange', () => {
  it('should calculate positive percent change', () => {
    expect(calculatePercentChange(110, 100)).toBe(10);
    expect(calculatePercentChange(150, 100)).toBe(50);
  });

  it('should calculate negative percent change', () => {
    expect(calculatePercentChange(90, 100)).toBe(-10);
    expect(calculatePercentChange(50, 100)).toBe(-50);
  });

  it('should return 0 when previous is 0 or negative', () => {
    expect(calculatePercentChange(100, 0)).toBe(0);
    expect(calculatePercentChange(100, -10)).toBe(0);
  });

  it('should handle large changes', () => {
    expect(calculatePercentChange(200, 100)).toBe(100);
    expect(calculatePercentChange(300, 100)).toBe(200);
  });
});

describe('calculateCategoryRevenue', () => {
  it('should calculate proportional revenue correctly', () => {
    expect(calculateCategoryRevenue(1000, 50, 100)).toBe(500);
    expect(calculateCategoryRevenue(1000, 25, 100)).toBe(250);
    expect(calculateCategoryRevenue(1000, 100, 100)).toBe(1000);
  });

  it('should return 0 when total quantity is 0', () => {
    expect(calculateCategoryRevenue(1000, 50, 0)).toBe(0);
  });

  it('should handle decimal quantities', () => {
    expect(calculateCategoryRevenue(1000, 33.33, 100)).toBeCloseTo(333.3, 1);
  });
});

describe('margin and revenue calculations', () => {
  it('should calculate total revenue from multiple shipments', () => {
    const shipments = [
      { retail: 1000 },
      { retail: 2500 },
      { retail: 1500 },
    ];
    const totalRevenue = shipments.reduce((sum, s) => sum + s.retail, 0);
    expect(totalRevenue).toBe(5000);
  });

  it('should calculate total quantity from items', () => {
    const items = [
      { quantity: 10 },
      { quantity: 25 },
      { quantity: 15 },
    ];
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    expect(totalQuantity).toBe(50);
  });

  it('should calculate weighted average cost', () => {
    const data = [
      { revenue: 1000, quantity: 100 },
      { revenue: 2000, quantity: 50 },
    ];
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalQuantity = data.reduce((sum, d) => sum + d.quantity, 0);
    const weightedAvg = totalRevenue / totalQuantity;
    expect(weightedAvg).toBe(20);
  });
});
