import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product, CustomerProfile, Order, OrderItem, QuantityBreak, CompanySettings, PricingTier, DocumentType, Customer360, Warranty } from "../types";
import { isFirebaseAvailable, db, auth, firebaseConfig } from "../firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, inMemoryPersistence } from "firebase/auth";
import { generateInvoicePDF } from "../utils/pdfGenerator";
import { freightEngine } from "../services/freight/freightEngine";
import { authService } from "../services/authService";
import { productService } from "../services/productService";
import { orderService } from "../services/orderService";
import { customerService } from "../services/customerService";

// Error structure required by firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface PortalContextType {
  isFirebase: boolean;
  isFirebaseConfigured: boolean;
  isOnline: boolean;
  currentUser: CustomerProfile | null;
  isAdmin: boolean;
  products: Product[];
  customers: CustomerProfile[];
  orders: Order[];
  warranties: Warranty[];
  submitWarrantyClaim: (warranty: Omit<Warranty, "id" | "status" | "submissionDate">) => Promise<void>;
  updateWarrantyStatus: (warrantyId: string, status: Warranty["status"], adminNotes?: string) => Promise<void>;
  getCustomer360: (customerId: string) => Customer360 | null;
  cart: { product: Product; qty: number; selectedColors?: string[] }[];
  
  // Auth actions
  register: (email: string, password: string, companyName: string, deliveryAddress: string) => Promise<void>;
  logout: () => Promise<void>;
  addDeliveryAddress: (customerId: string, address: string) => Promise<void>;
  
  // Cart actions
  addToCart: (product: Product, qty: number, selectedColors?: string[]) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  replaceCart?: (items: OrderItem[]) => void;
  
  // Ordering
  placeOrder: (notes?: string, onBehalfOf?: { customerId: string; customerEmail: string; companyName: string; customPricing?: { [productId: string]: number } }, ownTransport?: boolean, deliveryAddress?: string, documentMode?: DocumentType) => Promise<Order>;
  editOrder: (orderId: string, updatedItems: OrderItem[], deliveryAddress?: string) => Promise<void>;
  
  // Admin actions
  approveCustomer: (customerId: string) => Promise<void>;
  rejectCustomer: (customerId: string) => Promise<void>;
  createCustomerProfile: (email: string, password: string, companyName: string, deliveryAddress: string) => Promise<void>;
  deleteCustomerProfile: (customerId: string) => Promise<void>;
  updateCustomerPricing: (customerId: string, productId: string, price: number) => Promise<void>;
  updateCustomerRole: (customerId: string, role: "customer" | "admin" | "staff") => Promise<void>;
  updateCustomerAllowedProducts: (customerId: string, productIds: string[]) => Promise<void>;
  removeCustomerPricing: (customerId: string, productId: string) => Promise<void>;
  updateProductRateBreakAlignment: (customerId: string, productId: string, rateBreakId: string | null) => Promise<void>;
  toggleRestrictedProductAccess: (customerId: string, productId: string) => Promise<void>;
  createProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  categories: string[];
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  updateOrderDispatch: (orderId: string, dispatch: { freightCompany: string; consignmentNote: string; packingStatus: "Packed" | "Hold" }) => Promise<void>;
  approveOrder: (orderId: string) => Promise<string | void>;
  declineOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addShippingCharge: (orderId: string, shippingCharge: number, creditAdjustment?: number) => Promise<void>;
  requestShippingReview: (orderId: string, notes?: string) => Promise<void>;
  replicateOrder: (orderId: string) => Promise<string>;
  
  // Settings & Email Capabilities
  companySettings: CompanySettings;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;
  sendCustomerWelcomeEmail: (email: string, companyName: string) => Promise<void>;
  sendCustomerBroadcastEmail: (recipients: string[], subject: string, body: string, dealTitle?: string) => Promise<{ sentCount: number; errors?: string[] }>;
  sendPasswordResetLink: (email: string) => Promise<void>;

  // Pricing Tiers
  pricingTiers: PricingTier[];
  createPricingTier: (tier: Omit<PricingTier, "id">) => Promise<void>;
  updatePricingTier: (tierId: string, tier: Partial<PricingTier>) => Promise<void>;
  deletePricingTier: (tierId: string) => Promise<void>;
  assignPricingTier: (customerId: string, tierId: string | null) => Promise<void>;

  // System overrides for testing
  setPortalMode: (isFirebaseMode: boolean) => void;
  resetDemoData: () => void;

  // View modes
  adminViewMode: "admin" | "customer";
  setAdminViewMode: (mode: "admin" | "customer") => void;
  isActualAdmin: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  "Digital Meters",
  "Safety Compliance",
  "Signal Analysis",
  "High-Voltage Diagnostics",
  "Component Analysis",
  "General"
];

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  tradingName: "Desmo Products",
  companyName: "Desmo Products Pty Ltd",
  abn: "45 123 456 789",
  address: "123 Industrial Way, Perth WA 6000",
  email: "lew@desmoproducts.com.au",
  paymentTerms: "14 Days",
  bankName: "National Australia Bank (NAB)",
  bsb: "082-124",
  accountNo: "842-104-921",
  accountName: "Desmo Products Wholesale",
  orderPendingMessage: "Thank you for your wholesale request. Your order reference has been logged. Shipping costs will be calculated and added to this Invoice within 24 hours. Once confirmed, you will receive an approved invoice with bank deposit instructions to settle your account.",
  shippingBaseRate: 20.00,
  shippingPerKgRate: 1.20,
  gmailUser: "lew@desmoproducts.com.au",
  gmailAppPassword: "",
  emailSenderName: "Desmo Products Wholesale"
};

// Initial mock data to ensure the app is fully functional instantly
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "LT240A15",
    name: "240V Loadtester",
    sku: "LT240A15",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 236,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "B400",
    name: "GS 0008 (WP) 400A Barrier",
    sku: "B400",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 45,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "B600",
    name: "GS 6029 (WP) 600A Barrier",
    sku: "B600",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 45,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "NT01",
    name: "HG 2101 Neutral Tag (50 per pack)",
    sku: "NT01",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 39,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "ID02",
    name: "HG2102 ID Tag (20/pack, double legged)",
    sku: "ID02",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 6.5,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL2010",
    name: "RAL2010 Meter Seal - Signal Orange",
    sku: "RAL2010",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL2005",
    name: "RAL2005 Meter Seal - Luminous Orange",
    sku: "RAL2005",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL6004",
    name: "RAL6004 Meter Seal - Green",
    sku: "RAL6004",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL5019",
    name: "RAL5019 Meter Seal - Blue",
    sku: "RAL5019",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL1004",
    name: "RAL1004 Meter Seal - Yellow",
    sku: "RAL1004",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL9003",
    name: "RAL9003 Meter Seal - White",
    sku: "RAL9003",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL4005",
    name: "RAL4005 Meter Seal - Purple",
    sku: "RAL4005",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL1001",
    name: "RAL1001 Meter Seal - Beige",
    sku: "RAL1001",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL3000",
    name: "RAL3000 Meter Seal - Red",
    sku: "RAL3000",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL3015",
    name: "RAL3015 Meter Seal - Pink",
    sku: "RAL3015",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL6027",
    name: "RAL6027 Meter Seal - Light Blue",
    sku: "RAL6027",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL7000",
    name: "RAL7000 Meter Seal - Grey",
    sku: "RAL7000",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL8025",
    name: "RAL8025 Meter Seal - Brown",
    sku: "RAL8025",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RAL9011",
    name: "RAL9011 Meter Seal - Black",
    sku: "RAL9011",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 62,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "ICT-717",
    name: "Circuit Test Control Box, Hand Piece & Wand",
    sku: "ICT-717",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 1620,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "RCD-PLD1",
    name: "RCD / Polarity Tester",
    sku: "RCD/PLD1",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 63.6,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "GL15",
    name: "15W Bayonet globes for RCD/PLD1",
    sku: "GL15",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 3.3,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "DFP2",
    name: "Fused Probe (set of red & black)",
    sku: "DFP2",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 48,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "DFP1",
    name: "Fused Probe Single",
    sku: "DFP1",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 24,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "FE2",
    name: "Double Ended Fuse Extractor",
    sku: "FE2",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 204.5,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "CP3",
    name: "Continuity, Phasing & Insulation Resistance Test Unit",
    sku: "CP3",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 77,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "ALN1",
    name: "Alligator Clip (Black)",
    sku: "ALN1",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 8,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "SALT1",
    name: "Satchels for Loadtester",
    sku: "SALT1",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 21,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
  {
    id: "LT7A",
    name: "Loadtester 7A HRC Fuses (per pack of 10)",
    sku: "LT7A",
    description: "",
    imageUrl: "/assets/default-product.png",
    baseWholesalePrice: 12.5,
    isRestricted: false,
    quantityBreaks: [],
    category: "General",
    stock: 100,
    allowBackorders: true,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10
  },
];

const DEFAULT_CUSTOMERS: CustomerProfile[] = [
  {
    id: "melbourne-testing",
    email: "lew@desmoproducts.com.au", // Designated owner/admin email
    companyName: "Desmo Products HQ",
    status: "approved",
    createdAt: new Date(2026, 0, 15).toISOString(),
    customPricing: {}
  },
  {
    id: "apex-testing",
    email: "contact@apextesting.com",
    companyName: "Apex Electrical Calibration & Testing",
    status: "approved",
    createdAt: new Date(2026, 2, 10).toISOString(),
    approvedAt: new Date(2026, 2, 11).toISOString(),
    customPricing: {
      "DP-DMM-401": 135.00, // Custom wholesale discount
      "DP-PAT-302": 160.00
    },
    allowedProducts: ["DP-OSC-200", "METERSEAL-SIGNAL-ORANGE", "METERSEAL-GREEN", "METERSEAL-YELLOW", "METERSEAL-WHITE", "METERSEAL-BEIGE", "METERSEAL-RED", "METERSEAL-PINK", "METERSEAL-PURPLE", "METERSEAL-LIGHT-BLUE", "METERSEAL-GREY", "METERSEAL-BROWN", "METERSEAL-BLUE", "METERSEAL-BLACK", "METERSEAL-FLUORO-ORANGE"] // Can see restricted oscilloscope & meter seals
  },
  {
    id: "sydney-power",
    email: "orders@sydneypower.com.au",
    companyName: "Sydney Power Infrastructure Group",
    status: "approved",
    createdAt: new Date(2026, 3, 5).toISOString(),
    approvedAt: new Date(2026, 3, 6).toISOString(),
    customPricing: {
      "DP-CLP-600": 290.00 // Custom wholesale price
    },
    allowedProducts: ["DP-CLP-600"] // Can see clamp meter
  },
  {
    id: "euro-calibration",
    email: "info@eurocalibrations.com",
    companyName: "Euro Calibration Services Ltd",
    status: "pending",
    createdAt: new Date(2026, 6, 18).toISOString()
  },
  {
    id: "qld-testing",
    email: "compliance@qldtesting.org.au",
    companyName: "Queensland Testing & Tagging Services",
    status: "approved",
    createdAt: new Date(2026, 4, 1).toISOString(),
    approvedAt: new Date(2026, 4, 3).toISOString(),
    customPricing: {
      "DP-IRT-500": 85.00
    },
    allowedProducts: []
  },
  {
    id: "perth-cal",
    email: "calibrations@perthcal.com.au",
    companyName: "Perth Calibrations Agency",
    status: "rejected",
    createdAt: new Date(2026, 4, 15).toISOString()
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: "INV-1001",
    customerId: "qld-testing",
    customerEmail: "compliance@qldtesting.org.au",
    companyName: "Queensland Testing & Tagging Services",
    createdAt: new Date(2026, 4, 15, 14, 30).toISOString(),
    status: "paid",
    notes: "Please ship via Express Post. Commercial compliance audit scheduled next week.",
    items: [
      {
        productId: "DP-IRT-500",
        productName: "Insulation Resistance Diagnostic Tester",
        sku: "DP-IRT-500",
        qty: 15,
        originalPrice: 85.00, // Custom price
        appliedDiscountPercent: 15, // 15+ discount
        finalPricePerUnit: 72.25,
        totalLineAmount: 1083.75
      },
      {
        productId: "DP-LCR-100",
        productName: "Precision LCR Bridge Meter",
        sku: "DP-LCR-100",
        qty: 5,
        originalPrice: 110.00,
        appliedDiscountPercent: 0,
        finalPricePerUnit: 110.00,
        totalLineAmount: 550.00
      }
    ],
    subtotal: 1633.75,
    gstAmount: 163.38,
    totalAmount: 1797.13
  },
  {
    id: "INV-1002",
    customerId: "apex-testing",
    customerEmail: "contact@apextesting.com",
    companyName: "Apex Electrical Calibration & Testing",
    createdAt: new Date(2026, 5, 10, 11, 15).toISOString(),
    status: "paid",
    paidAt: new Date(2026, 5, 11).toISOString(),
    notes: "Please verify accuracy calibration certificate is packed in the crate.",
    items: [
      {
        productId: "DP-OSC-200",
        productName: "Desmo Handheld Digital Oscilloscope",
        sku: "DP-OSC-200",
        qty: 2,
        originalPrice: 1250.00,
        appliedDiscountPercent: 8,
        finalPricePerUnit: 1150.00,
        totalLineAmount: 2300.00
      }
    ],
    subtotal: 2300.00,
    gstAmount: 230.00,
    totalAmount: 2530.00
  },
  {
    id: "INV-1003",
    customerId: "sydney-power",
    customerEmail: "orders@sydneypower.com.au",
    companyName: "Sydney Power Infrastructure Group",
    createdAt: new Date(2026, 6, 1, 9, 45).toISOString(),
    status: "pending_payment",
    items: [
      {
        productId: "DP-CLP-600",
        productName: "True RMS AC/DC Clamp Meter",
        sku: "DP-CLP-600",
        qty: 12,
        originalPrice: 290.00, // Custom price
        appliedDiscountPercent: 10, // 10+ break
        finalPricePerUnit: 261.00,
        totalLineAmount: 3132.00
      },
      {
        productId: "DP-DMM-401",
        productName: "Desmo True RMS Digital Multimeter",
        sku: "DP-DMM-401",
        qty: 8,
        originalPrice: 150.00,
        appliedDiscountPercent: 0,
        finalPricePerUnit: 150.00,
        totalLineAmount: 1200.00
      }
    ],
    subtotal: 4332.00,
    gstAmount: 433.20,
    totalAmount: 4765.20
  }
];

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFirebase, setIsFirebase] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [customers, setCustomers] = useState<CustomerProfile[]>(DEFAULT_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(DEFAULT_ORDERS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number; selectedColors?: string[] }[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [adminViewMode, setAdminViewMode] = useState<"admin" | "customer">("admin");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isActualAdmin = currentUser 
    ? (currentUser.role === "admin" || currentUser.role === "staff") 
    : false;
  const isAdmin = isActualAdmin && adminViewMode === "admin";

  // Load from local storage or set initial defaults
  useEffect(() => {
    // 1. Determine active mode (Firebase vs Sandbox)
    setIsFirebase(true);

    // 2. Load Local Storage state for sandbox persistence
    const localProds = localStorage.getItem("dp_sandbox_products_v2");
    const localCusts = localStorage.getItem("dp_sandbox_customers_v2");
    const localOrds = localStorage.getItem("dp_sandbox_orders_v2");
    const localUser = localStorage.getItem("dp_sandbox_user");

    if (localProds) setProducts(JSON.parse(localProds));
    else localStorage.setItem("dp_sandbox_products_v2", JSON.stringify(DEFAULT_PRODUCTS));
    
    const savedCategories = localStorage.getItem("dp_sandbox_categories");
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    else localStorage.setItem("dp_sandbox_categories", JSON.stringify(DEFAULT_CATEGORIES));

    if (localCusts) setCustomers(JSON.parse(localCusts));
    else localStorage.setItem("dp_sandbox_customers_v2", JSON.stringify(DEFAULT_CUSTOMERS));

    if (localOrds) setOrders(JSON.parse(localOrds));
    else localStorage.setItem("dp_sandbox_orders_v2", JSON.stringify(DEFAULT_ORDERS));

    const localWarranties = localStorage.getItem("dp_sandbox_warranties");
    if (localWarranties) setWarranties(JSON.parse(localWarranties));

    const localSettings = localStorage.getItem("dp_sandbox_company_settings");
    if (localSettings) {
      setCompanySettings(JSON.parse(localSettings));
    } else {
      localStorage.setItem("dp_sandbox_company_settings", JSON.stringify(DEFAULT_COMPANY_SETTINGS));
    }

    if (localUser) {
      setCurrentUser(JSON.parse(localUser));
    } else {
      // Default auto-login as guest/unregistered first or prompt login.
      // We will let user select their persona, or default to EuroCycles (pending) or Apex Desmo (approved) for easy testing!
      // Let's default to no user (null) on first load, so they can experience the login/register flows.
    }
  }, []);

  // Update sandbox storage whenever sandbox states change
  useEffect(() => {
    localStorage.setItem("dp_sandbox_products_v2", JSON.stringify(products));
    localStorage.setItem("dp_sandbox_customers_v2", JSON.stringify(customers));
    localStorage.setItem("dp_sandbox_orders_v2", JSON.stringify(orders));
    localStorage.setItem("dp_sandbox_warranties", JSON.stringify(warranties));
    if (currentUser) {
      localStorage.setItem("dp_sandbox_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("dp_sandbox_user");
    }
  }, [products, customers, orders, currentUser, warranties]);

  // Synchronize with Firebase if Live Mode is enabled
  useEffect(() => {
    if (!isFirebase || !isFirebaseAvailable) return;

    // Real-time listen to products
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      
      const snapshotIds = new Set(items.map(i => i.id));
      const missingDefaults = DEFAULT_PRODUCTS.filter(d => !snapshotIds.has(d.id));
      const combined = [...items, ...missingDefaults];
      setProducts(combined);

      // If admin is logged in and there are missing default products in Firestore, auto-sync them up
      if (currentUser && (currentUser.email === "lew@desmoproducts.com.au" || currentUser.email === "1@1.com")) {
        missingDefaults.forEach((prod) => {
          setDoc(doc(db, "products", prod.id), prod).catch(() => {});
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "products");
    });

    // Real-time listen to customers (Admin only or current user profile)
    let unsubCustomers = () => {};
    if (isAdmin) {
      unsubCustomers = onSnapshot(collection(db, "users"), (snapshot) => {
        const items: CustomerProfile[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as CustomerProfile);
        });
        setCustomers(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      });
    } else if (currentUser && auth?.currentUser) {
      unsubCustomers = onSnapshot(doc(db, "users", currentUser.id), (docSnap) => {
        if (docSnap.exists()) {
          const profile = { id: docSnap.id, ...docSnap.data() } as CustomerProfile;
          setCurrentUser(profile);
          // Sync with customer list
          setCustomers(prev => prev.map(c => c.id === profile.id ? profile : c));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}`);
      });
    }

    // Real-time listen to orders
    let unsubOrders = () => {};
    const ordersCol = collection(db, "orders");
    if (isAdmin) {
      unsubOrders = onSnapshot(ordersCol, (snapshot) => {
        const items: Order[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(items.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      });
    } else if (currentUser && auth?.currentUser && currentUser.status === "approved") {
      const q = query(ordersCol, where("customerId", "==", currentUser.id));
      unsubOrders = onSnapshot(q, (snapshot) => {
        const items: Order[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(items.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      });
    }

    // Load pricing tiers (available to all signed-in users)
    let unsubTiers = () => {};
    if (currentUser && auth?.currentUser && currentUser.status === "approved") {
      unsubTiers = onSnapshot(collection(db, "pricingTiers"), (snapshot) => {
        const items: PricingTier[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as PricingTier);
        });
        setPricingTiers(items);
      }, () => { /* silent fail – rules may block non-admins */ });
    }

    
    let unsubWarranties = () => {};
    const warrantiesCol = collection(db, "warranties");
    if (isAdmin) {
      unsubWarranties = onSnapshot(warrantiesCol, (snapshot) => {
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        setWarranties(items);
      }, () => {});
    } else if (currentUser && auth?.currentUser && currentUser.status === "approved") {
      const q = query(warrantiesCol, where("customerId", "==", currentUser.id));
      unsubWarranties = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        setWarranties(items);
      }, () => {});
    }

    // Real-time listen to company settings
    const unsubSettings = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as CompanySettings);
      }
    }, () => { /* silent fail */ });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubOrders();
      unsubTiers();
      unsubWarranties();
      unsubSettings();
    };
  }, [isFirebase, currentUser?.id, isAdmin]);

  // Auth actions
  const register = async (email: string, password: string, companyName: string, deliveryAddress: string) => {
    const formattedEmail = email.trim().toLowerCase();
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        const profile = await authService.register(auth, db, formattedEmail, password, companyName, deliveryAddress);
        setCurrentUser(profile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "users");
      }
    } else {
      // Sandbox Mode registration
      const existing = customers.find(c => c.email.toLowerCase() === formattedEmail);
      if (existing) {
        setCurrentUser(existing);
        return;
      }

      const newId = `cust-${Math.random().toString(36).substr(2, 9)}`;
      const profile: CustomerProfile = {
        id: newId,
        email: formattedEmail,
        companyName,
        status: "pending",
        createdAt: new Date().toISOString(),
        customPricing: {},
        allowedProducts: [],
        deliveryAddresses: [deliveryAddress]
      };
      
      setCustomers(prev => [...prev, profile]);
      setCurrentUser(profile);
    }
  };

  useEffect(() => {
    if (!isFirebase || !isFirebaseAvailable || !auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        try {
          // Look up the user's profile document directly by their Auth UID
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (user.email && (user.email.toLowerCase() === "lew@desmoproducts.com.au" || user.email.toLowerCase() === "1@1.com")) {
            if (data.role !== "admin" || data.status !== "approved") {
              data.role = "admin";
              data.status = "approved";
              await setDoc(userDocRef, data, { merge: true });
            }
          }
          setCurrentUser({ id: docSnap.id, ...data } as CustomerProfile);
        } else if (user.email.toLowerCase() === "lew@desmoproducts.com.au" || user.email.toLowerCase() === "1@1.com") {
          // Automatically create the admin profile if it doesn't exist yet, using their UID as the document ID
          const adminProfile = {
            email: user.email.toLowerCase(),
            companyName: "Desmo Products HQ",
            status: "approved",
            role: "admin",
            createdAt: new Date().toISOString(),
            customPricing: {},
            allowedProducts: []
          };
          await setDoc(userDocRef, adminProfile);
          setCurrentUser({ id: user.uid, ...adminProfile } as CustomerProfile);
        } else {
           setCurrentUser(null);
        }
        } catch (error) {
          console.error("Failed to load user profile:", error);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [isFirebase]);

  const logout = async () => {
    if (isFirebase && isFirebaseAvailable) {
      await authService.logout(auth);
    }
    setCurrentUser(null);
    setCart([]);
  };

  const addDeliveryAddress = async (customerId: string, address: string) => {
    if (!address.trim()) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        const customerRef = doc(db, "users", customerId);
        const snap = await getDoc(customerRef);
        if (snap.exists()) {
          const currentAddrs = snap.data().deliveryAddresses || [];
          if (!currentAddrs.includes(address.trim())) {
            await updateDoc(customerRef, { deliveryAddresses: [...currentAddrs, address.trim()] });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => {
        const next = prev.map(c => {
          if (c.id === customerId) {
            const addrs = c.deliveryAddresses || [];
            if (!addrs.includes(address.trim())) {
              return { ...c, deliveryAddresses: [...addrs, address.trim()] };
            }
          }
          return c;
        });
        localStorage.setItem("dp_sandbox_customers_v2", JSON.stringify(next));
        return next;
      });
      // also update current user if it matches
      if (currentUser?.id === customerId) {
        setCurrentUser(prev => {
          if (!prev) return null;
          const addrs = prev.deliveryAddresses || [];
          if (!addrs.includes(address.trim())) {
            return { ...prev, deliveryAddresses: [...addrs, address.trim()] };
          }
          return prev;
        });
      }
    }
  };

  // Cart actions
  const addToCart = useCallback((product: Product, qty: number, selectedColors?: string[]) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.id === product.id && 
        JSON.stringify(item.selectedColors || []) === JSON.stringify(selectedColors || [])
      );
      if (existingIdx > -1) {
        const nextCart = [...prev];
        nextCart[existingIdx].qty += qty;
        return nextCart;
      }
      return [...prev, { product, qty, selectedColors }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, qty } : item));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);

  const replaceCart = (items: OrderItem[]) => {
    const newCart = items.map((item) => {
      const foundProd = products.find((p) => p.id === item.productId || p.sku === item.sku) || {
        id: item.productId,
        name: item.productName,
        sku: item.sku,
        description: '',
        imageUrl: '',
        baseWholesalePrice: item.originalPrice,
        isRestricted: false,
      };
      return {
        product: foundProd as Product,
        qty: item.qty,
        selectedColors: item.selectedColors,
      };
    });
    setCart(newCart);
  };

  // Place Order (Submit Invoice and Packing Slip via Server API)
  const placeOrder = async (
    notes?: string, 
    onBehalfOf?: { customerId: string; customerEmail: string; companyName: string; customPricing?: { [productId: string]: number } },
    ownTransport?: boolean,
    deliveryAddress?: string,
    documentMode: DocumentType = "INVOICE"
  ): Promise<Order> => {
    if (!currentUser) throw new Error("Authentication required to place orders");
    
    // Delegate to orderService
    const createdOrder = await orderService.placeOrder(
      cart,
      currentUser,
      isActualAdmin,
      notes,
      onBehalfOf,
      ownTransport,
      deliveryAddress,
      documentMode
    );

    setOrders(prev => [createdOrder, ...prev.filter(o => o.id !== createdOrder.id)]);
    clearCart();
    return createdOrder;
  };

  const editOrder = async (orderId: string, updatedItems: OrderItem[], newDeliveryAddress?: string) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        const updates = await orderService.editOrder(db, orders, orderId, updatedItems, newDeliveryAddress);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      // Sandbox mode recalculation
      const existingOrder = orders.find(o => o.id === orderId);
      const shippingCharge = existingOrder?.shippingCharge || 0;
      const subtotal = Number(updatedItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
      const gstAmount = Number(((subtotal + shippingCharge) * 0.10).toFixed(2));
      const totalAmount = Number((subtotal + shippingCharge + gstAmount).toFixed(2));

      const updates: Partial<Order> = {
        items: updatedItems,
        subtotal,
        gstAmount,
        totalAmount,
      };
      if (newDeliveryAddress !== undefined) {
        updates.deliveryAddress = newDeliveryAddress;
      }
      setOrders(prev => {
        const next = prev.map(o => o.id === orderId ? { ...o, ...updates } : o);
        localStorage.setItem("dp_sandbox_orders_v2", JSON.stringify(next));
        return next;
      });
    }
  };

  const replicateOrder = async (orderId: string): Promise<string> => {
    if (isFirebase && isFirebaseAvailable) {
      try {
        const nextId = await orderService.replicateOrder(db, orders, orderId);
        // We'll need to fetch/update orders list, but since the local state might desync,
        // let's also replicate it optimistically or wait for the real-time query.
        // For simplicity, we create the local representation:
        const src = orders.find(o => o.id === orderId);
        if (src) {
          const isQuote = src.documentType === "QUOTE";
          const { approvedAt, paidAt, shippedAt, packingStatus, consignmentNote, freightCompany, ...rest } = src;
          const newOrder: Order = {
            ...rest,
            id: nextId,
            status: isQuote ? "quote_finalized" : "pending_approval",
            createdAt: new Date().toISOString()
          };
          setOrders(prev => [newOrder, ...prev]);
        }
        return nextId;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
        throw error;
      }
    } else {
      const src = orders.find(o => o.id === orderId);
      if (!src) throw new Error("Source order/quote not found");
      const isQuote = src.documentType === "QUOTE";
      const prefix = isQuote ? "QTE" : "INV";
      const nextId = `${prefix}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
      const { approvedAt, paidAt, shippedAt, packingStatus, consignmentNote, freightCompany, ...rest } = src;
      const newOrder: Order = {
        ...rest,
        id: nextId,
        status: isQuote ? "quote_finalized" : "pending_approval",
        createdAt: new Date().toISOString()
      };
      setOrders(prev => [newOrder, ...prev]);
      return nextId;
    }
  };


  // Admin Actions
  const approveCustomer = async (customerId: string) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.approveCustomer(db, customerId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => c.id === customerId ? {
        ...c,
        status: "approved",
        approvedAt: new Date().toISOString()
      } : c));
    }
  };

  const updateCustomerRole = async (customerId: string, role: "customer" | "admin" | "staff") => {
    if (!isAdmin && isFirebase) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.updateCustomerRole(db, customerId, role);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, role } : c));
    }
  };

  const rejectCustomer = async (customerId: string) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.rejectCustomer(db, customerId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: "rejected" } : c));
    }
  };

  const createCustomerProfile = async (email: string, password: string, companyName: string, deliveryAddress: string) => {
    if (!isAdmin && isFirebase) return;

    const formattedEmail = email.trim().toLowerCase();

    if (isFirebase && isFirebaseAvailable) {
      // Create a temporary secondary Firebase app instance to avoid logging out the admin
      const tempAppName = `temp-auth-creator-${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      try {
        await setPersistence(tempAuth, inMemoryPersistence);
        const userCreds = await createUserWithEmailAndPassword(tempAuth, formattedEmail, password);
        const uid = userCreds.user.uid;
        const newProfile: Omit<CustomerProfile, "id"> = {
          email: formattedEmail,
          companyName,
          status: "approved",
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          customPricing: {},
          allowedProducts: [],
          deliveryAddresses: [deliveryAddress]
        };
        await setDoc(doc(db, "users", uid), newProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "users");
        throw error;
      } finally {
        await deleteApp(tempApp).catch(console.error);
      }
    } else {
      const newId = `cust-${Math.random().toString(36).substr(2, 9)}`;
      const profile: CustomerProfile = {
        id: newId,
        email: formattedEmail,
        companyName,
        status: "approved",
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        customPricing: {},
        allowedProducts: [],
        deliveryAddresses: [deliveryAddress]
      };
      setCustomers(prev => [...prev, profile]);
    }
  };

  const deleteCustomerProfile = async (customerId: string) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, "users", customerId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${customerId}`);
        throw error;
      }
    } else {
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    }
  };

  const updateCustomerPricing = async (customerId: string, productId: string, price: number) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.updateCustomerPricing(db, customerId, productId, price);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const customPricing = { ...c.customPricing, [productId]: Number(price) };
          return { ...c, customPricing };
        }
        return c;
      }));
    }
  };

  const removeCustomerPricing = async (customerId: string, productId: string) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.removeCustomerPricing(db, customerId, productId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId && c.customPricing) {
          const customPricing = { ...c.customPricing };
          delete customPricing[productId];
          return { ...c, customPricing };
        }
        return c;
      }));
    }
  };

  const updateProductRateBreakAlignment = async (customerId: string, productId: string, rateBreakId: string | null) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.updateProductRateBreakAlignment(db, customerId, productId, rateBreakId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const productRateBreakAlignments = { ...c.productRateBreakAlignments };
          if (rateBreakId) {
            productRateBreakAlignments[productId] = rateBreakId;
          } else {
            delete productRateBreakAlignments[productId];
          }
          return { ...c, productRateBreakAlignments };
        }
        return c;
      }));
    }
  };

  const toggleRestrictedProductAccess = async (customerId: string, productId: string) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await customerService.toggleRestrictedProductAccess(db, customerId, productId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const allowed = c.allowedProducts ? [...c.allowedProducts] : [];
          const index = allowed.indexOf(productId);
          if (index > -1) {
            allowed.splice(index, 1);
          } else {
            allowed.push(productId);
          }
          return { ...c, allowedProducts: allowed };
        }
        return c;
      }));
    }
  };


  const createProduct = async (product: Omit<Product, "id">) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        const newId = await productService.createProduct(db, product);
        // We'll trust the real-time onSnapshot queries to update the state
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `products`);
      }
    } else {
      const newId = `prod-${Math.random().toString(36).substr(2, 9)}`;
      const fullProd: Product = { id: newId, ...product };
      setProducts(prev => [...prev, fullProd]);
    }
  };

  const updateProduct = async (productId: string, updatedFields: Partial<Product>) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await productService.updateProduct(db, productId, updatedFields);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
      }
    } else {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedFields } : p));
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!isActualAdmin) return;
    
    // Optimistically update UI
    setProducts(prev => {
      const next = prev.filter(p => p.id !== productId);
      return next;
    });
    setCart(prev => prev.filter(item => item.product.id !== productId));
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await productService.deleteProduct(db, productId);
      } catch (error) {
        // Revert on error
        console.error("Delete failed, reverting:", error);
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
        // Re-fetch products to restore state
        try {
          const productsCollection = collection(db, "products");
          const docs = await getDocs(productsCollection);
          const loaded: Product[] = docs.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          setProducts(loaded);
        } catch (e) {
          console.error("Failed to restore products after delete error:", e);
        }
      }
    } else {
      localStorage.setItem("dp_sandbox_products_v2", JSON.stringify(products.filter(p => p.id !== productId)));
    }
  };


  const addCategory = async (category: string) => {
    if (!isActualAdmin || !category.trim()) return;
    const cat = category.trim();
    if (categories.includes(cat)) return;
    setCategories(prev => {
      const next = [...prev, cat];
      localStorage.setItem("dp_sandbox_categories", JSON.stringify(next));
      return next;
    });
  };

  const deleteCategory = async (category: string) => {
    if (!isActualAdmin) return;
    setCategories(prev => {
      const next = prev.filter(c => c !== category);
      localStorage.setItem("dp_sandbox_categories", JSON.stringify(next));
      return next;
    });
  };

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        const updates = await orderService.updateOrderStatus(db, orderId, status);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      const updates: Partial<Order> = { status };
      if (status === "paid") {
        updates.paidAt = new Date().toISOString();
      } else if (status === "shipped") {
        updates.shippedAt = new Date().toISOString();
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    }
  };

  const updateOrderDispatch = async (orderId: string, dispatch: { freightCompany: string; consignmentNote: string; packingStatus: "Packed" | "Hold" }) => {
    if (!isAdmin && isFirebase) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        await orderService.updateOrderDispatch(db, orderId, dispatch);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...dispatch } : o));
  };

  const approveOrder = async (orderId: string) => {
    const orderToApprove = orders.find(o => o.id === orderId);
    if (!orderToApprove) return;

    const canApprove = isAdmin || (
      currentUser &&
      orderToApprove.customerId === currentUser.id &&
      orderToApprove.documentType === "QUOTE" &&
      (orderToApprove.status === "quote_finalized" || orderToApprove.status === "quote_requested")
    );
    if (!canApprove && isFirebase) return;

    const updates: Partial<Order> = { status: "approved", approvedAt: new Date().toISOString() };
    const isConvertingQuote = orderToApprove.documentType === "QUOTE";
    let finalOrderId = orderId;

    if (isConvertingQuote) {
      updates.documentType = "INVOICE";
      if (orderId.startsWith("QTE-")) {
        finalOrderId = orderId.replace("QTE-", "INV-");
        updates.id = finalOrderId;
      }
    }

    if (isFirebase && isFirebaseAvailable) {
      try {
        if (finalOrderId !== orderId) {
          // Create new document with INV id and delete old QTE document
          const newOrderData = { ...orderToApprove, ...updates, id: finalOrderId };
          delete newOrderData.quoteMessage;
          await setDoc(doc(db, "orders", finalOrderId), newOrderData);
          await deleteDoc(doc(db, "orders", orderId));
        } else {
          await updateDoc(doc(db, "orders", orderId), updates);
        }
        
        // Deduct stock for each item in the order
        for (const item of orderToApprove.items) {
          const productRef = doc(db, "products", item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            const newStock = currentStock - item.qty;
            await updateDoc(productRef, { stock: newStock });
          }
        }

        // Notify Admin via email if converted by a customer
        if (isConvertingQuote && !isAdmin) {
          fetch("/api/send-invoice-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: "lew@desmoproducts.com.au",
              subject: `[Desmo Portal] Quote ${orderId} Converted to Purchase Order`,
              body: `Hello Admin,\n\nCustomer "${orderToApprove.companyName}" (${orderToApprove.customerEmail}) has converted Quote ${orderId} to a Purchase Order (${finalOrderId}).\n\nOrder Total: $${orderToApprove.totalAmount.toFixed(2)} AUD\n\nPlease log in to the admin dashboard to review and process the order.\n\nBest regards,\nDesmo Products Portal System`
            })
          }).catch(err => console.warn("Failed to notify admin via email:", err));
        }
        
        return finalOrderId;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      setProducts(prevProducts => prevProducts.map(p => {
        const orderItem = orderToApprove.items.find(item => item.productId === p.id);
        if (orderItem) {
          const currentStock = p.stock || 0;
          return { ...p, stock: currentStock - orderItem.qty };
        }
        return p;
      }));

      // Notify Admin via email if converted by a customer (sandbox mode)
      if (isConvertingQuote && !isAdmin) {
        fetch("/api/send-invoice-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "lew@desmoproducts.com.au",
            subject: `[Desmo Portal] Quote ${orderId} Converted to Purchase Order (Sandbox)`,
            body: `Hello Admin,\n\nCustomer "${orderToApprove.companyName}" (${orderToApprove.customerEmail}) has converted Quote ${orderId} to a Purchase Order (Sandbox).\n\nOrder Total: $${orderToApprove.totalAmount.toFixed(2)} AUD\n\nBest regards,\nDesmo Products Portal System`
          })
        }).catch(err => console.warn("Failed to notify admin via email:", err));
      }
    }
  };

  const declineOrder = async (orderId: string) => {
    const orderToDecline = orders.find(o => o.id === orderId);
    if (!orderToDecline) return;
    const canDecline = isAdmin || (
      currentUser &&
      orderToDecline.customerId === currentUser.id &&
      orderToDecline.documentType === "QUOTE" &&
      (orderToDecline.status === "quote_finalized" || orderToDecline.status === "quote_requested")
    );
    if (!canDecline && isFirebase) return;
    const updates: Partial<Order> = { status: "declined" };

    if (isFirebase && isFirebaseAvailable) {
      try {
        await orderService.declineOrder(db, orderId);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!isActualAdmin) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await orderService.deleteOrder(db, orderId);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addShippingCharge = async (orderId: string, shippingCharge: number, creditAdjustment?: number) => {
    if (!isActualAdmin) return;

    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const credit = creditAdjustment !== undefined ? creditAdjustment : (orderToUpdate.creditAdjustment || 0);

    if (isFirebase && isFirebaseAvailable) {
      try {
        await orderService.addShippingCharge(db, orderId, shippingCharge, credit);
        // Live listener will pick up the updated doc total.
      } catch (error) {
        // Fallback or bubble up
        console.error("Failed to add shipping charge:", error);
      }
    } else {
      // Sandbox mode recalculation
      const rawSubtotal = Number(orderToUpdate.items.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
      const newGst = Number(((rawSubtotal + shippingCharge - credit) * 0.10).toFixed(2));
      const newTotal = Number((rawSubtotal + shippingCharge - credit + newGst).toFixed(2));

      const updates: Partial<Order> = {
        shippingCharge,
        creditAdjustment: credit,
        gstAmount: newGst,
        totalAmount: newTotal,
        status: orderToUpdate.documentType === "QUOTE" ? "quote_finalized" : orderToUpdate.status,
        shippingReviewRequested: false
      };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    }
  };

  const requestShippingReview = async (orderId: string, notes?: string) => {
    const updates: Partial<Order> = {
      shippingReviewRequested: true,
      shippingReviewNotes: notes || "",
      status: "quote_requested"
    };

    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "orders", orderId), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    }
  };


  const updateCompanySettings = async (settings: CompanySettings) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await setDoc(doc(db, "settings", "company"), settings);
        setCompanySettings(settings);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `settings/company`);
      }
    } else {
      setCompanySettings(settings);
      localStorage.setItem("dp_sandbox_company_settings", JSON.stringify(settings));
    }
  };

  const sendPasswordResetLink = async (email: string) => {
    if (isFirebase && isFirebaseAvailable && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      console.log("Simulated password reset email sent to:", email);
    }
  };

  const sendCustomerWelcomeEmail = async (email: string, companyName: string) => {
    // Attempt Firebase password reset trigger first
    if (isFirebase && isFirebaseAvailable && auth) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (e) {
        console.warn("Password reset link generation note:", e);
      }
    }

    const res = await fetch("/api/send-welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, companyName })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to send welcome email.");
    }
  };

  const sendCustomerBroadcastEmail = async (recipients: string[], subject: string, body: string, dealTitle?: string) => {
    const res = await fetch("/api/send-broadcast-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, subject, body, dealTitle })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to send broadcast email.");
    }
    return { sentCount: data.sentCount, errors: data.errors };
  };


  const submitWarrantyClaim = async (warrantyData) => {
    const newId = `war-${Math.random().toString(36).substr(2, 9)}`;
    const fullWarranty = {
      id: newId,
      ...warrantyData,
      status: "pending",
      submissionDate: new Date().toISOString()
    };
    
    if (isFirebase && isFirebaseAvailable) {
      await setDoc(doc(db, "warranties", newId), fullWarranty);
    } else {
      setWarranties(prev => [...prev, fullWarranty]);
    }
  };

  const updateWarrantyStatus = async (warrantyId, status, adminNotes) => {
    if (!isAdmin) return;
    if (isFirebase && isFirebaseAvailable) {
      const updateData: Record<string, any> = { status };
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      await updateDoc(doc(db, "warranties", warrantyId), updateData);
    } else {
      setWarranties(prev => prev.map(w => w.id === warrantyId ? { ...w, status, adminNotes: adminNotes ?? w.adminNotes } : w));
    }
  };

  const getCustomer360 = (customerId) => {
    const customerOrders = orders.filter(o => o.customerId === customerId && o.documentType !== "QUOTE");
    
    const lifetimeValue = customerOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = customerOrders.length;
    const averageOrderValue = totalOrders > 0 ? lifetimeValue / totalOrders : 0;
    
    // Purchase history map
    const productMap: Record<string, { productId: string, qty: number, lastPurchased: string }> = {};
    customerOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { productId: item.productId, qty: 0, lastPurchased: order.createdAt };
        }
        productMap[item.productId].qty += item.qty;
        if (order.createdAt > productMap[item.productId].lastPurchased) {
          productMap[item.productId].lastPurchased = order.createdAt;
        }
      });
    });
    
    const purchaseHistory = Object.values(productMap);
    
    // Mock analytics and tickets
    return {
      customerId,
      lifetimeValue,
      totalOrders,
      averageOrderValue,
      purchaseHistory,
      behaviorAnalytics: {
        lastLogin: new Date().toISOString(),
        frequentlyViewedCategories: ["Digital Meters", "Safety Compliance"],
        cartAbandonmentRate: 15.5
      },
      satisfactionScore: 88,
      supportTickets: [
        { id: "TKT-001", subject: "Shipping delay query", status: "Closed", date: new Date(Date.now() - 86400000 * 10).toISOString() }
      ],
      paymentBehavior: {
        averageDaysToPay: 14,
        latePaymentsCount: 0
      },
      productPreferences: purchaseHistory.map(p => p.productId).slice(0, 3),
      idealNextOrderPrediction: [
        { productId: "DP-DMM-401", probability: 0.85 }
      ],
      riskScore: 12,
      engagementMetrics: {
        emailOpenRate: 65,
        portalSessionsPerMonth: 8
      }
    };
  };

  // ── Pricing Tier CRUD ────────────────────────────────────────────────────
  const createPricingTier = async (tier: Omit<PricingTier, "id">) => {
    if (!isAdmin) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, "pricingTiers"), tier);
        setPricingTiers(prev => [...prev, { id: docRef.id, ...tier }]);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "pricingTiers");
      }
    } else {
      const newTier = { id: `tier-${Date.now()}`, ...tier };
      setPricingTiers(prev => [...prev, newTier]);
    }
  };

  const updatePricingTier = async (tierId: string, updates: Partial<PricingTier>) => {
    if (!isAdmin) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "pricingTiers", tierId), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `pricingTiers/${tierId}`);
      }
    }
    setPricingTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...updates } : t));
  };

  const deletePricingTier = async (tierId: string) => {
    if (!isAdmin) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "pricingTiers", tierId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `pricingTiers/${tierId}`);
      }
    }
    setPricingTiers(prev => prev.filter(t => t.id !== tierId));
  };

  const assignPricingTier = async (customerId: string, tierId: string | null) => {
    if (!isAdmin) return;
    const updates = { pricingTierId: tierId ?? null };
    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "users", customerId), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    }
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, pricingTierId: tierId ?? undefined } : c));
  };

  // Helper overrides to reset configurations
  const setPortalMode = (isFirebaseMode: boolean) => {
    if (isFirebaseMode && !isFirebaseAvailable) {
      alert("Real Firebase has not been initialized yet. Add your VITE_FIREBASE_API_KEY environment variable to connect.");
      return;
    }
    setIsFirebase(isFirebaseMode);
    localStorage.setItem("dp_portal_mode", isFirebaseMode ? "firebase" : "sandbox");
    
    // Clear user on toggle to prevent state pollution
    setCurrentUser(null);
    setCart([]);
  };

  const resetDemoData = () => {
    localStorage.removeItem("dp_sandbox_products_v2");
    localStorage.removeItem("dp_sandbox_customers_v2");
    localStorage.removeItem("dp_sandbox_orders_v2");
    localStorage.removeItem("dp_sandbox_user");
    setProducts(DEFAULT_PRODUCTS);
    setCustomers(DEFAULT_CUSTOMERS);
    setOrders(DEFAULT_ORDERS);
    setCurrentUser(null);
    setCart([]);
  };

  return (
    <PortalContext.Provider
      value={{
        isFirebase,
        isFirebaseConfigured: isFirebaseAvailable,
        isOnline,
        currentUser,
        isAdmin,
        products,
        customers,
        orders,
        cart,
        register,
        logout,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        replaceCart,
        placeOrder,
        editOrder,
        approveCustomer,
        rejectCustomer,
        updateCustomerRole,
        createCustomerProfile,
        deleteCustomerProfile,
        updateCustomerPricing,
        removeCustomerPricing,
        updateProductRateBreakAlignment,
        toggleRestrictedProductAccess,
        createProduct,
        updateProduct,
        deleteProduct,
        categories,
        addCategory,
        deleteCategory,
        updateOrderStatus,
        updateOrderDispatch,
        approveOrder,
        declineOrder,
        deleteOrder,
        addShippingCharge,
        requestShippingReview,
        replicateOrder,
        companySettings,
        warranties, submitWarrantyClaim, updateWarrantyStatus, getCustomer360, updateCompanySettings,
        sendCustomerWelcomeEmail, sendCustomerBroadcastEmail, sendPasswordResetLink,
        pricingTiers,
        createPricingTier,
        updatePricingTier,
        deletePricingTier,
        assignPricingTier,
        setPortalMode,
        resetDemoData,
        adminViewMode,
        setAdminViewMode,
        isActualAdmin
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
};
