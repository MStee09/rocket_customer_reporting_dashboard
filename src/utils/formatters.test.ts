import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from './formatters';

describe('formatCurrency', () => {
  it('should format basic currency values', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle null values', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('should format compact currency', () => {
    expect(formatCurrency(1500000, { compact: true })).toBe('$1.5M');
    expect(formatCurrency(1500, { compact: true })).toBe('$1.5K');
  });
});

describe('formatNumber', () => {
  it('should format basic numbers', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(null)).toBe('—');
  });

  it('should format with decimals', () => {
    expect(formatNumber(1234.567, { decimals: 2 })).toBe('1,234.57');
  });
});

describe('formatPercent', () => {
  it('should format basic percentages', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('should show sign when requested', () => {
    expect(formatPercent(25, { showSign: true })).toBe('+25.0%');
    expect(formatPercent(-10, { showSign: true })).toBe('-10.0%');
  });
});
