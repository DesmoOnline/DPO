export interface FreightCalculationInput {
  subtotal: number;
  totalWeightKg?: number;
  totalCubicMeters?: number;
  postcode?: string;
  isPalletized?: boolean;
  shippingBaseRate?: number;
  shippingPerKgRate?: number;
}

export interface FreightResult {
  charge: number;
  isFreeFreight: boolean;
  freeFreightThreshold: number;
  amountRemainingForFreeFreight: number;
  estimatedDays: string;
}

export class FreightEngine {
  private freeFreightThreshold = 1500; // $1,500 AUD free shipping threshold

  calculateFreight(input: FreightCalculationInput): FreightResult {
    const { 
      subtotal, 
      totalWeightKg = 0, 
      isPalletized = false,
      shippingBaseRate = 20.0,
      shippingPerKgRate = 1.20
    } = input;
    
    if (subtotal >= this.freeFreightThreshold) {
      return {
        charge: 0,
        isFreeFreight: true,
        freeFreightThreshold: this.freeFreightThreshold,
        amountRemainingForFreeFreight: 0,
        estimatedDays: "1-3 Business Days"
      };
    }

    const remaining = this.freeFreightThreshold - subtotal;

    let baseCharge = shippingBaseRate + (totalWeightKg * shippingPerKgRate);

    if (isPalletized) {
      baseCharge += 120.0;
    }

    return {
      charge: Math.round(baseCharge * 100) / 100,
      isFreeFreight: false,
      freeFreightThreshold: this.freeFreightThreshold,
      amountRemainingForFreeFreight: Math.round(remaining * 100) / 100,
      estimatedDays: "2-5 Business Days"
    };
  }
}

export const freightEngine = new FreightEngine();
