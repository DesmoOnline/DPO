export interface QuantityBreak {
  minQty: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountPercent?: number; // legacy backwards-compatibility
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
  customPricing?: { [productId: string]: number }; // Custom pricing overrides for specific products
  allowedProducts?: string[]; // If a product is restricted, customer must have it here to see/order
  deliveryAddresses?: string[]; // Multiple delivery addresses for the customer
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
  items: OrderItem[];
  subtotal: number;
  gstAmount: number; // 10% in Australia
  totalAmount: number;
  status: "pending_approval" | "approved" | "declined" | "paid" | "shipped" | "cancelled";
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  notes?: string;
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
