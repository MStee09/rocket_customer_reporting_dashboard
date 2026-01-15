import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from './MetricCard';
import { DollarSign, Package, TrendingUp } from 'lucide-react';

describe('MetricCard', () => {
  it('should render label and value', () => {
    render(
      <MetricCard
        label="Total Revenue"
        value="$125,000"
        icon={DollarSign}
      />
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
  });

  it('should format numeric values with locale string', () => {
    render(
      <MetricCard
        label="Shipment Count"
        value={12500}
        icon={Package}
      />
    );

    expect(screen.getByText('12,500')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(
      <MetricCard
        label="Loading Metric"
        value="$0"
        icon={DollarSign}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading Metric')).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });

  it('should display positive trend', () => {
    render(
      <MetricCard
        label="Revenue"
        value="$100,000"
        icon={DollarSign}
        trend={{ value: 15, positive: true }}
      />
    );

    expect(screen.getByText('15% vs last period')).toBeInTheDocument();
  });

  it('should display negative trend', () => {
    render(
      <MetricCard
        label="Costs"
        value="$50,000"
        icon={DollarSign}
        trend={{ value: -10, positive: false }}
      />
    );

    expect(screen.getByText('10% vs last period')).toBeInTheDocument();
  });

  it('should not display trend when loading', () => {
    render(
      <MetricCard
        label="Revenue"
        value="$100,000"
        icon={DollarSign}
        trend={{ value: 15, positive: true }}
        isLoading={true}
      />
    );

    expect(screen.queryByText('15% vs last period')).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();

    render(
      <MetricCard
        label="Clickable Metric"
        value="$1,000"
        icon={DollarSign}
        onClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText('Clickable Metric').closest('div')!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply correct icon color classes', () => {
    const { container, rerender } = render(
      <MetricCard
        label="Orange Icon"
        value="100"
        icon={TrendingUp}
        iconColor="orange"
      />
    );

    expect(container.querySelector('.from-rocket-400')).toBeInTheDocument();

    rerender(
      <MetricCard
        label="Success Icon"
        value="100"
        icon={TrendingUp}
        iconColor="success"
      />
    );

    expect(container.querySelector('.from-success')).toBeInTheDocument();
  });

  it('should default to orange icon color', () => {
    const { container } = render(
      <MetricCard
        label="Default Color"
        value="100"
        icon={DollarSign}
      />
    );

    expect(container.querySelector('.from-rocket-400')).toBeInTheDocument();
  });

  it('should handle string values correctly', () => {
    render(
      <MetricCard
        label="String Value"
        value="N/A"
        icon={Package}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    render(
      <MetricCard
        label="Zero Value"
        value={0}
        icon={Package}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render without trend', () => {
    render(
      <MetricCard
        label="No Trend"
        value="$500"
        icon={DollarSign}
      />
    );

    expect(screen.getByText('No Trend')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.queryByText(/vs last period/)).not.toBeInTheDocument();
  });
});
