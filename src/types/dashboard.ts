export interface CustomerData {
  customerId: number;
  customerName: string;
  shipmentCount: number;
  totalSpend: number;
  avgCostPerShipment: number;
}

export interface StateData {
  stateCode: string;
  avgCost: number;
  shipmentCount: number;
  isOutlier: boolean;
}
