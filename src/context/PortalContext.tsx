import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CustomerProfile, Order, OrderItem, QuantityBreak } from "../types";
import { isFirebaseAvailable, db, auth } from "../firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

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
  cart: { product: Product; qty: number }[];
  
  // Auth actions
  register: (email: string, companyName: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Cart actions
  addToCart: (product: Product, qty: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  
  // Ordering
  placeOrder: (notes?: string) => Promise<Order>;
  
  // Admin actions
  approveCustomer: (customerId: string) => Promise<void>;
  rejectCustomer: (customerId: string) => Promise<void>;
  updateCustomerPricing: (customerId: string, productId: string, price: number) => Promise<void>;
  removeCustomerPricing: (customerId: string, productId: string) => Promise<void>;
  toggleRestrictedProductAccess: (customerId: string, productId: string) => Promise<void>;
  createProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Product>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  
  // System overrides for testing
  setPortalMode: (isFirebaseMode: boolean) => void;
  resetDemoData: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

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
      { minQty: 10, discountPercent: 5 },
      { minQty: 25, discountPercent: 12 }
    ],
    category: "Digital Meters",
    stock: 120
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
      { minQty: 5, discountPercent: 5 },
      { minQty: 10, discountPercent: 10 }
    ],
    category: "Safety Compliance",
    stock: 45
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
      { minQty: 2, discountPercent: 8 }
    ],
    category: "Signal Analysis",
    stock: 5
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
      { minQty: 15, discountPercent: 15 }
    ],
    category: "High-Voltage Diagnostics",
    stock: 80
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
      { minQty: 10, discountPercent: 10 }
    ],
    category: "Digital Meters",
    stock: 12
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
      { minQty: 10, discountPercent: 8 },
      { minQty: 25, discountPercent: 15 }
    ],
    category: "Component Analysis",
    stock: 60
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
    allowedProducts: ["DP-OSC-200"] // Can see restricted oscilloscope
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
  const [customers, setCustomers] = useState<CustomerProfile[]>(DEFAULT_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(DEFAULT_ORDERS);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  const adminEmails = ["lew@desmoproducts.com.au", "1@1.com"];
  const adminUids = ["rysSGhbaj8O7CIuZp0KiQsDUF", "FNmQiIOF1tccb2D1z7qfz2Vybgn2"];
  const isAdmin = currentUser ? (adminEmails.includes(currentUser.email) || adminUids.includes(currentUser.id)) : false;

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
      if (items.length > 0) setProducts(items);
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

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubOrders();
    };
  }, [isFirebase, currentUser?.id, isAdmin]);

  // Auth actions
  const register = async (email: string, companyName: string) => {
    const formattedEmail = email.trim().toLowerCase();
    
    if (isFirebase && isFirebaseAvailable) {
      try {
        const newUserProfile: Omit<CustomerProfile, "id"> = {
          email: formattedEmail,
          companyName,
          status: "pending",
          createdAt: new Date().toISOString(),
          customPricing: {},
          allowedProducts: []
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
        allowedProducts: []
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
          const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            setCurrentUser({ id: docSnap.id, ...docSnap.data() } as CustomerProfile);
          } else if (user.email.toLowerCase() === "lew@desmoproducts.com.au" || user.email.toLowerCase() === "1@1.com") {
            const adminProfile = {
              email: user.email.toLowerCase(),
              companyName: "Desmo Products HQ",
              status: "approved",
              createdAt: new Date().toISOString(),
              customPricing: {},
              allowedProducts: []
            };
            const docRef = await addDoc(collection(db, "users"), adminProfile);
            setCurrentUser({ id: docRef.id, ...adminProfile } as CustomerProfile);
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

  // Cart actions
  const addToCart = (product: Product, qty: number) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx > -1) {
        const nextCart = [...prev];
        nextCart[existingIdx].qty += qty;
        return nextCart;
      }
      return [...prev, { product, qty }];
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
  const placeOrder = async (notes?: string) => {
    if (!currentUser) throw new Error("Authentication required to place orders");
    if (currentUser.status !== "approved") throw new Error("Your account must be approved to order");
    if (cart.length === 0) throw new Error("Your cart is empty");

    // Map cart to OrderItems calculating custom prices and qty breaks
    const orderItems: OrderItem[] = cart.map(item => {
      const prod = item.product;
      // 1. Get original price (custom overrides base wholesale)
      const originalPrice = (currentUser.customPricing && currentUser.customPricing[prod.id] !== undefined)
        ? currentUser.customPricing[prod.id]
        : prod.baseWholesalePrice;
      
      // 2. Find applicable quantity break
      let discountPercent = 0;
      if (prod.quantityBreaks && prod.quantityBreaks.length > 0) {
        // Sort descending to find highest matched threshold
        const matchedBreak = [...prod.quantityBreaks]
          .sort((a,b) => b.minQty - a.minQty)
          .find(qb => item.qty >= qb.minQty);
        
        if (matchedBreak) {
          discountPercent = matchedBreak.discountPercent;
        }
      }

      const finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
      const totalLineAmount = Number((finalPricePerUnit * item.qty).toFixed(2));

      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        qty: item.qty,
        originalPrice,
        appliedDiscountPercent: discountPercent,
        finalPricePerUnit,
        totalLineAmount
      };
    });

    const subtotal = Number(orderItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
    const gstAmount = Number((subtotal * 0.10).toFixed(2)); // standard 10% GST in Australia
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    const nextInvoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: nextInvoiceNumber,
      customerId: currentUser.id,
      customerEmail: currentUser.email,
      companyName: currentUser.companyName,
      items: orderItems,
      subtotal,
      gstAmount,
      totalAmount,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      notes
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

    // Clear cart and return order
    clearCart();
    return newOrder;
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
        await updateDoc(doc(db, "products", productId), updatedFields as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
      }
    } else {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedFields } : p));
    }
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
        approveCustomer,
        rejectCustomer,
        updateCustomerPricing,
        removeCustomerPricing,
        toggleRestrictedProductAccess,
        createProduct,
        updateProduct,
        updateOrderStatus,
        setPortalMode,
        resetDemoData
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
