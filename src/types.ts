export interface QuantityBreak {
  minQty: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountPercent?: number; // legacy backwards-compatibility
}

export type DocumentType = "QUOTE" | "INVOICE" | "PACKING_SLIP";

export type DocumentStatus =
  | "draft_quote"
  | "quote_requested"
  | "quote_finalized"
  | "pending_approval"
  | "approved"
  | "declined"
  | "paid"
  | "shipped"
  | "cancelled";

// Weight Break Template: Reusable quantity-based pricing tier (up to 10 per system)
export interface WeightBreakTemplate {
  id: string;             // e.g. "wbt-1", "wbt-2", etc
  name: string;           // e.g. "Tier 1 - Starter", "Tier 2 - Professional"
  description?: string;   // e.g. "Small volume orders"
  quantityBreaks: QuantityBreak[]; // Quantity tiers for this weight break
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProductRateBreak {
  id: string;             // e.g. "prb_1"
  name: string;           // e.g. "Special Tier A"
  quantityBreaks: QuantityBreak[];
}

// Rate Break Profile: Reusable pricing template assigned to customers
export interface RateBreakProfile {
  id: string;             // e.g. "rbp-wholesale"
  name: string;           // e.g. "Wholesale Partner"
  description?: string;   // e.g. "Standard wholesale pricing"
  productBreaks: {        // per-product quantity breaks for this profile
    [productId: string]: QuantityBreak[];
  };
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
  createdBy: string;      // Admin user ID who created this
}

// A named pricing tier with product-specific quantity break schedules
export interface PricingTier {
  id: string;             // e.g. "tier-vip"
  name: string;           // e.g. "VIP Dealer"
  description?: string;   // e.g. "Top 10 dealers get better rates"
  productBreaks: {        // per-product break overrides for this tier
    [productId: string]: QuantityBreak[];
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  baseWholesalePrice: number; // The default price for wholesale customers
  isRestricted: boolean; // If true, only visible to approved customers in their allowed list
  autoApprove?: boolean; // If true, order containing only auto-approvable items is auto-approved
  quantityBreaks?: QuantityBreak[];
  rateBreaks?: ProductRateBreak[];
  category?: string;
  stock?: number;
  allowBackorders?: boolean;
  colors?: string[]; // Available colors for items sold by the pack
}

export interface CustomerProfile {
  id: string;
  email: string;
  companyName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  customPricing?: { [productId: string]: number }; // Custom flat price overrides per product
  allowedProducts?: string[]; // If a product is restricted, customer must have it here to see/order
  deliveryAddresses?: string[]; // Multiple delivery addresses for the customer
  pricingTierId?: string; // ID of a PricingTier assigned to this customer
  rateBreakProfileId?: string; // ID of RateBreakProfile assigned to this customer
  weightBreakAssignments?: { [productId: string]: string[] }; // Map of productId -> array of WeightBreakTemplate IDs
  productRateBreakAlignments?: { [productId: string]: string }; // Map of productId -> productRateBreakId
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  originalPrice: number; // baseWholesalePrice or customPricing
  appliedDiscountPercent: number; // legacy or calculated from percentage breaks
  finalPricePerUnit: number; // calculated unit price
  totalLineAmount: number;
  selectedColors?: string[]; // Colors selected by user for the order item
}

export interface Order {
  id: string; // "INV-1001" etc
  customerId: string;
  customerEmail: string;
  companyName: string;
  documentType?: DocumentType;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number; // 10% in Australia
  totalAmount: number;
  status: DocumentStatus;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  notes?: string;
  quoteMessage?: string;
  ownTransport?: boolean;
  shippingCharge?: number;
  deliveryAddress?: string; // The selected delivery address for this specific order
  freightCompany?: string;
  consignmentNote?: string;
  packingStatus?: "Packed" | "Hold";
}

export interface CompanySettings {
  logoBase64?: string;
  tradingName: string;
  companyName: string;
  abn: string;
  address: string;
  email: string;
  paymentTerms: string;
  bankName: string;
  bsb: string;
  accountNo: string;
  accountName: string;
  orderPendingMessage: string;
}

export interface GSTReportData {
  totalRevenue: number;
  totalGST: number;
  totalSubtotal: number;
  orderCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  byCustomer: { [companyName: string]: { subtotal: number; gst: number; total: number; count: number } };
  byMonth: { [month: string]: { subtotal: number; gst: number; total: number } };
}
