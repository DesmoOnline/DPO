import fs from 'fs';

const filePath = '/Users/bjmack/Downloads/Apps/Desmo/src/context/PortalContext.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update imports
if (!content.includes('Customer360, Warranty')) {
  content = content.replace(
    'CompanySettings, PricingTier, DocumentType } from "../types";',
    'CompanySettings, PricingTier, DocumentType, Customer360, Warranty } from "../types";'
  );
}

// 2. Add to PortalContextType
const portalContextTypeRegex = /(orders: Order\[\];[\s\S]*?)(cart: \{ product: Product; qty: number; selectedColors\?: string\[\] \}\[\];)/;
const replacementPortalContextType = `$1warranties: Warranty[];
  submitWarrantyClaim: (warranty: Omit<Warranty, "id" | "status" | "submissionDate">) => Promise<void>;
  updateWarrantyStatus: (warrantyId: string, status: Warranty["status"], adminNotes?: string) => Promise<void>;
  getCustomer360: (customerId: string) => Customer360 | null;
  $2`;
content = content.replace(portalContextTypeRegex, replacementPortalContextType);

// 3. Add warranties state to PortalProvider
const stateRegex = /(const \[cart, setCart\] = useState[\s\S]*?;)/;
const replacementState = `$1\n  const [warranties, setWarranties] = useState<Warranty[]>([]);`;
content = content.replace(stateRegex, replacementState);

// 4. Add warranties to local storage / persistence if needed. (Skipping for brevity, we'll just use a state array for sandbox, or firebase for live)
const sandboxLoadRegex = /(if \(localOrds\) setOrders\(JSON\.parse\(localOrds\)\);\n    else localStorage\.setItem\("dp_sandbox_orders_v2", JSON\.stringify\(DEFAULT_ORDERS\)\);)/;
const replacementSandboxLoad = `$1\n\n    const localWarranties = localStorage.getItem("dp_sandbox_warranties");\n    if (localWarranties) setWarranties(JSON.parse(localWarranties));`;
content = content.replace(sandboxLoadRegex, replacementSandboxLoad);

const sandboxSaveRegex = /(localStorage\.setItem\("dp_sandbox_orders_v2", JSON\.stringify\(orders\)\);)/;
const replacementSandboxSave = `$1\n      localStorage.setItem("dp_sandbox_warranties", JSON.stringify(warranties));`;
content = content.replace(sandboxSaveRegex, replacementSandboxSave);

// 5. Add warranties real-time listen (Firebase)
const firebaseListenRegex = /(return \(\) => \{\n      unsubProducts\(\);\n      unsubCustomers\(\);\n      unsubOrders\(\);\n      unsubTiers\(\);)/;
const replacementFirebaseListen = `
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

    $1\n      unsubWarranties();`;
content = content.replace(firebaseListenRegex, replacementFirebaseListen);

// 6. Add functions implementation
const functionsRegex = /(const updateCompanySettings = async \(settings: CompanySettings\) => \{[\s\S]*?^\s*};\n)/m;
const implementation = `
  const submitWarrantyClaim = async (warrantyData) => {
    const newId = \`war-\${Math.random().toString(36).substr(2, 9)}\`;
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
      const updateData = { status };
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
    const productMap = {};
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
`;
content = content.replace(functionsRegex, `$1\n${implementation}`);

// Add to context provider value
const providerValueRegex = /(updateCompanySettings,\n\s*pricingTiers,)/;
const replacementProviderValue = `warranties, submitWarrantyClaim, updateWarrantyStatus, getCustomer360, $1`;
content = content.replace(providerValueRegex, replacementProviderValue);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("PortalContext updated successfully");
