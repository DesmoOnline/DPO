import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CustomerProfile, Order, OrderItem, QuantityBreak, CompanySettings, PricingTier, DocumentType } from "../types";
import { isFirebaseAvailable, db, auth } from "../firebase";
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
import { onAuthStateChanged, signOut } from "firebase/auth";
import { generateInvoicePDF } from "../utils/pdfGenerator";

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
  currentUser: CustomerProfile | null;
  isAdmin: boolean;
  products: Product[];
  customers: CustomerProfile[];
  orders: Order[];
  cart: { product: Product; qty: number; selectedColors?: string[] }[];
  
  // Auth actions
  register: (email: string, companyName: string, deliveryAddress: string) => Promise<void>;
  logout: () => Promise<void>;
  addDeliveryAddress: (customerId: string, address: string) => Promise<void>;
  
  // Cart actions
  addToCart: (product: Product, qty: number, selectedColors?: string[]) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  
  // Ordering
  placeOrder: (notes?: string, onBehalfOf?: { customerId: string; customerEmail: string; companyName: string; customPricing?: { [productId: string]: number } }, ownTransport?: boolean, deliveryAddress?: string, documentMode?: DocumentType) => Promise<Order>;
  editOrder: (orderId: string, updatedItems: OrderItem[], deliveryAddress?: string) => Promise<void>;
  
  // Admin actions
  approveCustomer: (customerId: string) => Promise<void>;
  rejectCustomer: (customerId: string) => Promise<void>;
  updateCustomerPricing: (customerId: string, productId: string, price: number) => Promise<void>;
  removeCustomerPricing: (customerId: string, productId: string) => Promise<void>;
  toggleRestrictedProductAccess: (customerId: string, productId: string) => Promise<void>;
  createProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  categories: string[];
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  updateOrderDispatch: (orderId: string, dispatch: { freightCompany: string; consignmentNote: string; packingStatus: "Packed" | "Hold" }) => Promise<void>;
  approveOrder: (orderId: string) => Promise<void>;
  declineOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addShippingCharge: (orderId: string, shippingCharge: number) => Promise<void>;
  
  // Settings
  companySettings: CompanySettings;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;

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
  address: "123 Industrial Way, Perth WA 6000",
  email: "lew@desmoproducts.com.au",
  paymentTerms: "14 Days",
  bankName: "National Australia Bank (NAB)",
  bsb: "082-124",
  accountNo: "842-104-921",
  accountName: "Desmo Products Wholesale",
  orderPendingMessage: "Thank you for your wholesale request. Your order reference has been logged. Shipping costs will be calculated and added to this Invoice within 24 hours. Once confirmed, you will receive an approved invoice with bank deposit instructions to settle your account."
};

// Initial mock data to ensure the app is fully functional instantly
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "DP-DMM-401",
    name: "Desmo True RMS Digital Multimeter",
    sku: "DP-DMM-401",
    description: "Industrial grade auto-ranging digital multimeter with high safety rating (CAT III 1000V / CAT IV 600V). Features temperature measurement, dual displays, and micro-amp testing for flame sensors.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 150.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 5 },
      { minQty: 25, discountType: "percentage", discountValue: 12 }
    ],
    category: "Digital Meters",
    stock: 120,
    allowBackorders: true
  },
  {
    id: "DP-PAT-302",
    name: "Portable Appliance Safety Tester",
    sku: "DP-PAT-302",
    description: "Fast and easy-to-use handheld PAT tester. Features clear pass/fail indicators, earth bond test, and insulation resistance checks for compliant electrical safety inspections.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 180.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 5, discountType: "percentage", discountValue: 5 },
      { minQty: 10, discountType: "percentage", discountValue: 10 }
    ],
    category: "Safety Compliance",
    stock: 45,
    allowBackorders: false
  },
  {
    id: "DP-OSC-200",
    name: "Desmo Handheld Digital Oscilloscope",
    sku: "DP-OSC-200",
    description: "Extremely high-precision, dual-channel 100MHz handheld oscilloscope. Features advanced waveform trigger capture, color TFT screen, and battery power for field diagnostics. Restricted access.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 1250.00,
    isRestricted: true,
    quantityBreaks: [
      { minQty: 2, discountType: "fixed", discountValue: 1150.00 }
    ],
    category: "Signal Analysis",
    stock: 5,
    allowBackorders: true
  },
  {
    id: "DP-IRT-500",
    name: "Insulation Resistance Diagnostic Tester",
    sku: "DP-IRT-500",
    description: "Rugged high-voltage diagnostic insulation tester for checking motors, generators, cables, and switchgears. Test voltages up to 2500V with PI/DAR ratio calculations.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 95.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 15, discountType: "percentage", discountValue: 15 }
    ],
    category: "High-Voltage Diagnostics",
    stock: 80,
    allowBackorders: false
  },
  {
    id: "DP-CLP-600",
    name: "True RMS AC/DC Clamp Meter",
    sku: "DP-CLP-600",
    description: "Professional jaw clamp current meter with True RMS accuracy. Replaces traditional line breaking methods, allowing safe current measurements in tight panel nodes. Restricted access.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 340.00,
    isRestricted: true,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 10 }
    ],
    category: "Digital Meters",
    stock: 12,
    allowBackorders: true
  },
  {
    id: "DP-LCR-100",
    name: "Precision LCR Bridge Meter",
    sku: "DP-LCR-100",
    description: "High-accuracy component tester for measuring inductance (L), capacitance (C), and resistance (R) with dissipation factor (D) and quality factor (Q). Dual display layout.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 110.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 8 },
      { minQty: 25, discountType: "percentage", discountValue: 15 }
    ],
    category: "Component Analysis",
    stock: 60,
    allowBackorders: true
  },
  {
    id: "LT240A15",
    name: "CAT IV 600V Single Phase Loadtester",
    sku: "LT240A15",
    description: "The Loadtester is used as an electrical load on kWh power meters when testing to ensure the correct operation and functionality of the meters. Incorporates fused probes with silicon leads and is housed in a compact body. Protected by an automatic thermal cut-out switch.\n\nSpecifications:\nVoltage: 240 – 250V max. 1Ø\nLoad: 1100W – 4.5amp\nInternal Fusing: 7amp\nSafety Rating: Cat IV 600V – Cat III 1000V\nCompliant to: AS: 61010.1: 2003\nWeight: 420gm\nLeads: Silicon with internal white wear indicator layer\nTest Probes: Cat III 1000V\nMotor: 1100W with thermal cut-out\nGrills: Black Nylon 15% Glass Filled\nCable Grommet: TPE 90A Shore\nBody: PC-ABS Fire Retardant – spark finish\nHook: Polished 316 S/S that allows hands free operation.",
    imageUrl: "placeholder",
    baseWholesalePrice: 430.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 50,
    allowBackorders: true
  },
  {
    id: "B400",
    name: "400A LV Barrier",
    sku: "B400",
    description: "Insulated safety barrier used on the overhead network of the West Australian supply authority during switching and interconnection movements. Installed by hand or Hotstick onto the contact blade of a 400A Low Voltage isolator (disconnector) to prevent closure contact.\n\nSpecifications:\nWeight: 225gm\nMaterial: High Impact Polyethylene PVC\nLength: 310mm\nDiameter: 50mm\nAdapts to male Flowline fitting on standard Hotstick or Double Ended Fuse Extractor (FE2)",
    imageUrl: "placeholder",
    baseWholesalePrice: 99.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 100,
    allowBackorders: true
  },
  {
    id: "B600",
    name: "600A LV Barrier",
    sku: "B600",
    description: "Insulated safety barrier used on the overhead network of the West Australian supply authority during switching and interconnection movements. Installed by hand or Hotstick onto the contact blade of a 600A Low Voltage isolator (disconnector) to prevent closure contact.\n\nSpecifications:\nWeight: 200gm\nMaterial: High Impact Polyethylene PVC\nLength: 275mm\nDiameter: 50mm\nAdapts to male Flowline fitting on standard Hotstick or Double Ended Fuse Extractor (FE2)",
    imageUrl: "placeholder",
    baseWholesalePrice: 129.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 100,
    allowBackorders: true
  },
  {
    id: "METERSEAL",
    name: "KWh Meter Seals (Pack)",
    sku: "METERSEAL",
    description: "Polypropylene meter seals used as an anti-pilferage measure on KWh power meters by the Australian Supply Authorities. Can also be used for all types of sealing equipment and printed with flag symbol/logo if required.\n\nSpecifications:\nMaterial: Polypropylene\nLength: 235mm\nTag Size: 25mm x 12mm",
    imageUrl: "placeholder",
    baseWholesalePrice: 45.00,
    isRestricted: true,
    autoApprove: false,
    category: "Safety Compliance",
    stock: 200,
    allowBackorders: true,
    colors: [
      "Signal Orange",
      "Green",
      "Yellow",
      "White",
      "Beige",
      "Red",
      "Pink",
      "Purple",
      "L/ Blue",
      "Grey",
      "Brown",
      "Blue",
      "Black",
      "Fluoro Orange"
    ]
  }
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
    allowedProducts: ["DP-OSC-200", "METERSEAL"] // Can see restricted oscilloscope & meter seals
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
  const [adminViewMode, setAdminViewMode] = useState<"admin" | "customer">("admin");

  const adminEmails = ["lew@desmoproducts.com.au", "1@1.com"];
  const adminUids = ["rysSGhbaj8O7CIuZp0KiQsDUF", "FNmQiIOF1tccb2D1z7qfz2Vybgn2"];
  const isActualAdmin = currentUser ? (adminEmails.includes(currentUser.email) || adminUids.includes(currentUser.id)) : false;
  const isAdmin = isActualAdmin && adminViewMode === "admin";

  // Load from local storage or set initial defaults
  useEffect(() => {
    // 1. Determine active mode (Firebase vs Sandbox)
    setIsFirebase(true);

    // 2. Load Local Storage state for sandbox persistence
    const localProds = localStorage.getItem("dp_sandbox_products");
    const localCusts = localStorage.getItem("dp_sandbox_customers");
    const localOrds = localStorage.getItem("dp_sandbox_orders");
    const localUser = localStorage.getItem("dp_sandbox_user");

    if (localProds) setProducts(JSON.parse(localProds));
    else localStorage.setItem("dp_sandbox_products", JSON.stringify(DEFAULT_PRODUCTS));
    
    const savedCategories = localStorage.getItem("dp_sandbox_categories");
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    else localStorage.setItem("dp_sandbox_categories", JSON.stringify(DEFAULT_CATEGORIES));

    if (localCusts) setCustomers(JSON.parse(localCusts));
    else localStorage.setItem("dp_sandbox_customers", JSON.stringify(DEFAULT_CUSTOMERS));

    if (localOrds) setOrders(JSON.parse(localOrds));
    else localStorage.setItem("dp_sandbox_orders", JSON.stringify(DEFAULT_ORDERS));

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
    if (!isFirebase) {
      localStorage.setItem("dp_sandbox_products", JSON.stringify(products));
      localStorage.setItem("dp_sandbox_customers", JSON.stringify(customers));
      localStorage.setItem("dp_sandbox_orders", JSON.stringify(orders));
      if (currentUser) {
        localStorage.setItem("dp_sandbox_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("dp_sandbox_user");
      }
    }
  }, [products, customers, orders, currentUser, isFirebase]);

  // Synchronize with Firebase if Live Mode is enabled
  useEffect(() => {
    if (!isFirebase || !isFirebaseAvailable) return;

    // Real-time listen to products
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
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
    } else if (currentUser) {
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
    } else if (currentUser) {
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
    if (currentUser) {
      unsubTiers = onSnapshot(collection(db, "pricingTiers"), (snapshot) => {
        const items: PricingTier[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as PricingTier);
        });
        setPricingTiers(items);
      }, () => { /* silent fail – rules may block non-admins */ });
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubOrders();
      unsubTiers();
    };
  }, [isFirebase, currentUser?.id, isAdmin]);

  // Auth actions
  const register = async (email: string, companyName: string, deliveryAddress: string) => {
    const formattedEmail = email.trim().toLowerCase();
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        const newUserProfile: Omit<CustomerProfile, "id"> = {
          email: formattedEmail,
          companyName,
          status: "pending",
          createdAt: new Date().toISOString(),
          customPricing: {},
          allowedProducts: [],
          deliveryAddresses: [deliveryAddress]
        };
        // In real Firebase, doc ID matches auth UID, but we can generate or add
        const docRef = await addDoc(collection(db, "users"), newUserProfile);
        const profile: CustomerProfile = { id: docRef.id, ...newUserProfile };
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
            setCurrentUser({ id: docSnap.id, ...docSnap.data() } as CustomerProfile);
          } else if (user.email.toLowerCase() === "lew@desmoproducts.com.au" || user.email.toLowerCase() === "1@1.com") {
            // Automatically create the admin profile if it doesn't exist yet, using their UID as the document ID
            const adminProfile = {
              email: user.email.toLowerCase(),
              companyName: "Desmo Products HQ",
              status: "approved",
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
    if (auth) {
      await signOut(auth);
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
        localStorage.setItem("dp_sandbox_customers", JSON.stringify(next));
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
  const addToCart = (product: Product, qty: number, selectedColors?: string[]) => {
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
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, qty } : item));
  };

  const clearCart = () => setCart([]);

  // Place Order (Submit Invoice and Packing Slip)
  const placeOrder = async (
    notes?: string, 
    onBehalfOf?: { customerId: string; customerEmail: string; companyName: string; customPricing?: { [productId: string]: number } },
    ownTransport?: boolean,
    deliveryAddress?: string,
    documentMode: DocumentType = "INVOICE"
  ): Promise<Order> => {
    if (!currentUser) throw new Error("Authentication required to place orders");
    // Admins can place on behalf of others; regular users must be approved
    if (!isActualAdmin && currentUser.status !== "approved") throw new Error("Your account must be approved to order");
    if (cart.length === 0) throw new Error("Your cart is empty");

    // Determine the effective customer for this order
    const effectiveCustomer = onBehalfOf || {
      customerId: currentUser.id,
      customerEmail: currentUser.email,
      companyName: currentUser.companyName,
      customPricing: currentUser.customPricing
    };

    // Map cart to OrderItems calculating custom prices and qty breaks
    const orderItems: OrderItem[] = cart.map(item => {
      const prod = item.product;
      // 1. Get original price (custom overrides base wholesale)
      const originalPrice = (effectiveCustomer.customPricing && effectiveCustomer.customPricing[prod.id] !== undefined)
        ? effectiveCustomer.customPricing[prod.id]
        : prod.baseWholesalePrice;
      
      // 2. Find applicable quantity break and compute unit price
      let discountPercent = 0;
      let finalPricePerUnit = originalPrice;
      
      if (prod.quantityBreaks && prod.quantityBreaks.length > 0) {
        // Sort descending to find highest matched threshold
        const matchedBreak = [...prod.quantityBreaks]
          .sort((a,b) => b.minQty - a.minQty)
          .find(qb => item.qty >= qb.minQty);
        
        if (matchedBreak) {
          if (matchedBreak.discountType === "fixed") {
            finalPricePerUnit = matchedBreak.discountValue;
          } else if (matchedBreak.discountType === "percentage") {
            discountPercent = matchedBreak.discountValue;
            finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
          } else if (matchedBreak.discountPercent !== undefined) {
            // Fallback for legacy breaks
            discountPercent = matchedBreak.discountPercent;
            finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
          }
        }
      }

      const totalLineAmount = Number((finalPricePerUnit * item.qty).toFixed(2));

      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        qty: item.qty,
        originalPrice,
        appliedDiscountPercent: discountPercent,
        finalPricePerUnit,
        totalLineAmount,
        ...(item.selectedColors && item.selectedColors.length > 0 ? { selectedColors: item.selectedColors } : {})
      };
    });

    const subtotal = Number(orderItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
    const gstAmount = Number((subtotal * 0.10).toFixed(2)); // standard 10% GST in Australia
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    const nextInvoiceNumber = `${documentMode === "QUOTE" ? "QTE" : "INV"}-${Math.floor(1000 + Math.random() * 9000)}`;

    const allAutoApproved = cart.every(item => item.product.autoApprove === true);
    let initialStatus: Order["status"] = allAutoApproved ? "approved" : "pending_approval";
    if (documentMode === "QUOTE") {
      initialStatus = "quote_requested";
    } else if (!ownTransport) {
      initialStatus = "pending_approval";
    }

    const newOrder: Order = {
      id: nextInvoiceNumber,
      customerId: effectiveCustomer.customerId,
      customerEmail: effectiveCustomer.customerEmail,
      companyName: effectiveCustomer.companyName,
      documentType: documentMode,
      items: orderItems,
      subtotal,
      gstAmount,
      totalAmount,
      status: initialStatus,
      createdAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
      ...(documentMode === "QUOTE" ? { quoteMessage: notes || "This quote excludes shipping until finalized by Desmo Products." } : {}),
      ...(ownTransport !== undefined ? { ownTransport } : {}),
      ...(deliveryAddress ? { deliveryAddress } : {})
    };

    if (isFirebase && isFirebaseAvailable) {
      try {
        await setDoc(doc(db, "orders", nextInvoiceNumber), newOrder);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${nextInvoiceNumber}`);
      }
    } else {
      // Sandbox mode
      setOrders(prev => [newOrder, ...prev]);
    }

    if (initialStatus === "approved" && documentMode !== "QUOTE") {
      try {
        const pdf = generateInvoicePDF(newOrder);
        const dataUri = pdf.output("datauristring");
        const pdfBase64 = dataUri.split(",")[1];
        fetch("/api/send-invoice-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: newOrder.customerEmail,
            subject: `Invoice from Desmo Products Online - ${newOrder.id}`,
            body: `Dear customer,\n\nPlease find attached your tax invoice (${newOrder.id}) for your wholesale order with Desmo Products Online.\n\nTotal Amount: $${newOrder.totalAmount.toFixed(2)} AUD\n\nPlease settle payment within 14 days via bank deposit.\n\nThank you,\nDesmo Products HQ`,
            pdfBase64,
            filename: `invoice_${newOrder.id}.pdf`
          }),
        }).catch(err => console.error("Auto email invoice failed", err));
      } catch (e) {
        console.error("Auto invoice PDF generation failed", e);
      }
    }

    // Clear cart and return order
    clearCart();
    return newOrder;
  };

  const editOrder = async (orderId: string, updatedItems: OrderItem[], newDeliveryAddress?: string) => {
    if (!isAdmin && isFirebase) return;
    
    // Recalculate totals
    const subtotal = Number(updatedItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
    const gstAmount = Number((subtotal * 0.10).toFixed(2));
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    const updates: Partial<Order> = {
      items: updatedItems,
      subtotal,
      gstAmount,
      totalAmount,
    };
    if (newDeliveryAddress !== undefined) {
      updates.deliveryAddress = newDeliveryAddress;
    }

    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "orders", orderId), updates as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      }
    } else {
      setOrders(prev => {
        const next = prev.map(o => o.id === orderId ? { ...o, ...updates } : o);
        localStorage.setItem("dp_sandbox_orders", JSON.stringify(next));
        return next;
      });
    }
  };

  // Admin Actions
  const approveCustomer = async (customerId: string) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "users", customerId), {
          status: "approved",
          approvedAt: new Date().toISOString()
        });
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

  const rejectCustomer = async (customerId: string) => {
    if (!isAdmin && isFirebase) return;
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "users", customerId), {
          status: "rejected"
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${customerId}`);
      }
    } else {
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: "rejected" } : c));
    }
  };

  const updateCustomerPricing = async (customerId: string, productId: string, price: number) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        const customerRef = doc(db, "users", customerId);
        const snap = await getDoc(customerRef);
        if (snap.exists()) {
          const customPricing = snap.data().customPricing || {};
          customPricing[productId] = Number(price);
          await updateDoc(customerRef, { customPricing });
        }
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
        const customerRef = doc(db, "users", customerId);
        const snap = await getDoc(customerRef);
        if (snap.exists()) {
          const customPricing = snap.data().customPricing || {};
          delete customPricing[productId];
          await updateDoc(customerRef, { customPricing });
        }
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

  const toggleRestrictedProductAccess = async (customerId: string, productId: string) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        const customerRef = doc(db, "users", customerId);
        const snap = await getDoc(customerRef);
        if (snap.exists()) {
          const allowedProducts = snap.data().allowedProducts || [];
          const index = allowedProducts.indexOf(productId);
          if (index > -1) {
            allowedProducts.splice(index, 1);
          } else {
            allowedProducts.push(productId);
          }
          await updateDoc(customerRef, { allowedProducts });
        }
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

    const newId = `prod-${Math.random().toString(36).substr(2, 9)}`;
    const fullProd: Product = { id: newId, ...product };

    if (isFirebase && isFirebaseAvailable) {
      try {
        await setDoc(doc(db, "products", newId), product);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `products/${newId}`);
      }
    } else {
      setProducts(prev => [...prev, fullProd]);
    }
  };

  const updateProduct = async (productId: string, updatedFields: Partial<Product>) => {
    if (!isAdmin && isFirebase) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        const productRef = doc(db, "products", productId);
        await setDoc(productRef, updatedFields as any, { merge: true });
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
        await deleteDoc(doc(db, "products", productId));
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
      localStorage.setItem("dp_sandbox_products", JSON.stringify(products.filter(p => p.id !== productId)));
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

    const updates: Partial<Order> = { status };
    if (status === "paid") {
      updates.paidAt = new Date().toISOString();
    } else if (status === "shipped") {
      updates.shippedAt = new Date().toISOString();
    }

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

  const updateOrderDispatch = async (orderId: string, dispatch: { freightCompany: string; consignmentNote: string; packingStatus: "Packed" | "Hold" }) => {
    if (!isAdmin && isFirebase) return;
    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "orders", orderId), dispatch);
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
      orderToApprove.status === "quote_finalized"
    );
    if (!canApprove && isFirebase) return;

    const updates: Partial<Order> = { status: "approved", approvedAt: new Date().toISOString() };
    if (orderToApprove.documentType === "QUOTE") {
      updates.quoteMessage = undefined;
    }

    if (isFirebase && isFirebaseAvailable) {
      try {
        await updateDoc(doc(db, "orders", orderId), updates);
        
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
    }
  };

  const declineOrder = async (orderId: string) => {
    const orderToDecline = orders.find(o => o.id === orderId);
    if (!orderToDecline) return;
    const canDecline = isAdmin || (
      currentUser &&
      orderToDecline.customerId === currentUser.id &&
      orderToDecline.documentType === "QUOTE" &&
      orderToDecline.status === "quote_finalized"
    );
    if (!canDecline && isFirebase) return;
    const updates: Partial<Order> = { status: "declined" };

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

  const deleteOrder = async (orderId: string) => {
    if (!isActualAdmin) return;

    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;

    if (isFirebase && isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
    }

    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addShippingCharge = async (orderId: string, shippingCharge: number) => {
    if (!isActualAdmin) return;

    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const newSubtotal = Number((orderToUpdate.items.reduce((acc, item) => acc + item.totalLineAmount, 0) + shippingCharge).toFixed(2));
    const newGst = Number((newSubtotal * 0.10).toFixed(2));
    const newTotal = Number((newSubtotal + newGst).toFixed(2));

    const updates: Partial<Order> = {
      shippingCharge,
      subtotal: newSubtotal,
      gstAmount: newGst,
      totalAmount: newTotal,
      ...(orderToUpdate.documentType === "QUOTE" ? { status: "quote_finalized" as Order["status"] } : {})
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
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `settings/company`);
      }
    } else {
      setCompanySettings(settings);
      localStorage.setItem("dp_sandbox_company_settings", JSON.stringify(settings));
    }
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
    localStorage.removeItem("dp_sandbox_products");
    localStorage.removeItem("dp_sandbox_customers");
    localStorage.removeItem("dp_sandbox_orders");
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
        placeOrder,
        editOrder,
        approveCustomer,
        rejectCustomer,
        updateCustomerPricing,
        removeCustomerPricing,
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
        companySettings,
        updateCompanySettings,
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
