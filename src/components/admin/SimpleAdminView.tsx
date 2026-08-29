import React, { useState, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";
import { useToast } from "../ui/ToastContext";
import { Product, CustomerProfile, Order } from "../../types";
import { EditProductModal } from "../EditProductModal";
import { 
  Package, 
  Users, 
  Tag, 
  Megaphone, 
  Settings, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileText, 
  Plus, 
  Pencil, 
  Search, 
  DollarSign, 
  Send, 
  Building, 
  ShieldCheck, 
  RefreshCw, 
  X,
  Calculator,
  Download,
  Copy,
  Calendar,
  Check,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Receipt,
  CreditCard
} from "lucide-react";

interface SimpleAdminViewProps {
  onViewInvoice?: (orderId: string) => void;
  onSwitchToAdvanced?: () => void;
}

const SafeProductImage: React.FC<{ src?: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  const finalSrc = error || !src ? "/assets/default-product.png" : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export type DateFilterPeriod = "day" | "week" | "month" | "quarter" | "ytd" | "yearly" | "custom";

export const SimpleAdminView: React.FC<SimpleAdminViewProps> = ({
  onViewInvoice,
  onSwitchToAdvanced
}) => {
  const { showToast } = useToast();
  const {
    customers,
    products,
    orders,
    approveCustomer,
    rejectCustomer,
    createProduct,
    updateProduct,
    addShippingCharge,
    approveOrder,
    companySettings,
    updateCompanySettings,
    sendCustomerBroadcastEmail
  } = usePortal();

  // Active Main Section
  const [activeTask, setActiveTask] = useState<"orders" | "products" | "customers" | "announcement" | "settings" | "bas">("orders");

  // --- Orders State ---
  const [shippingModalOrderId, setShippingModalOrderId] = useState<string | null>(null);
  const [shippingCostInput, setShippingCostInput] = useState<string>("");
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);

  // --- Products State ---
  const [productSearch, setProductSearch] = useState("");
  const [quickPriceEditId, setQuickPriceEditId] = useState<string | null>(null);
  const [quickPriceVal, setQuickPriceVal] = useState<string>("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProdForm, setNewProdForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    stock: "50",
    category: "Digital Meters",
    image: "/assets/default-product.png"
  });

  // --- Broadcast State ---
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // --- Company Settings State ---
  const [settingsForm, setSettingsForm] = useState({ ...companySettings });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- BAS & Accounting State ---
  const [datePeriod, setDatePeriod] = useState<DateFilterPeriod>("quarter");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [basSearchQuery, setBasSearchQuery] = useState("");
  const [basStatusFilter, setBasStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [basCopied, setBasCopied] = useState(false);

  // Computed pending items
  const pendingOrders = orders.filter(o => 
    o.status === "pending_approval" || 
    o.status === "pending_payment" || 
    (o.status as any) === "Pending Approval" || 
    (o.status as any) === "Pending Payment"
  );
  const pendingCustomers = customers.filter(c => c.status === "pending");

  // ==========================================
  // BAS & ACCOUNTING CALCULATIONS
  // ==========================================
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let label = "";

    switch (datePeriod) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        label = `Today (${start.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })})`;
        break;

      case "week": {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        label = "This Week (Mon–Sun)";
        break;
      }

      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        label = now.toLocaleString("en-AU", { month: "long", year: "numeric" });
        break;

      case "quarter": {
        // Australian Tax Quarters: Q1 (Jul-Sep), Q2 (Oct-Dec), Q3 (Jan-Mar), Q4 (Apr-Jun)
        const month = now.getMonth(); // 0-indexed
        let qStartMonth = 0;
        let qName = "";
        if (month >= 6 && month <= 8) {
          qStartMonth = 6;
          qName = `Q1 BAS (Jul - Sep ${now.getFullYear()})`;
        } else if (month >= 9 && month <= 11) {
          qStartMonth = 9;
          qName = `Q2 BAS (Oct - Dec ${now.getFullYear()})`;
        } else if (month >= 0 && month <= 2) {
          qStartMonth = 0;
          qName = `Q3 BAS (Jan - Mar ${now.getFullYear()})`;
        } else {
          qStartMonth = 3;
          qName = `Q4 BAS (Apr - Jun ${now.getFullYear()})`;
        }
        start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
        label = qName;
        break;
      }

      case "ytd": {
        // Australian FY starts July 1st
        const currentYear = now.getFullYear();
        const isSecondHalf = now.getMonth() >= 6;
        const fyStartYear = isSecondHalf ? currentYear : currentYear - 1;
        start = new Date(fyStartYear, 6, 1, 0, 0, 0, 0); // July 1st
        label = `FY ${fyStartYear}/${fyStartYear + 1} YTD (From 1 Jul ${fyStartYear})`;
        break;
      }

      case "yearly": {
        const currentYear = now.getFullYear();
        const isSecondHalf = now.getMonth() >= 6;
        const fyStartYear = isSecondHalf ? currentYear : currentYear - 1;
        start = new Date(fyStartYear, 6, 1, 0, 0, 0, 0);
        end = new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999); // June 30th
        label = `Full FY ${fyStartYear}/${fyStartYear + 1} (1 Jul – 30 Jun)`;
        break;
      }

      case "custom":
        start = new Date(`${customStartDate}T00:00:00`);
        end = new Date(`${customEndDate}T23:59:59`);
        label = `Custom (${new Date(customStartDate).toLocaleDateString("en-AU")} – ${new Date(customEndDate).toLocaleDateString("en-AU")})`;
        break;
    }

    return { start, end, label };
  }, [datePeriod, customStartDate, customEndDate]);

  // Filter orders for accounting
  const basFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Exclude quotes and rejected drafts from BAS tax revenue
      if (
        order.documentType === "QUOTE" ||
        order.status === "declined" ||
        order.status === "cancelled" ||
        (order.status as any) === "Cancelled" ||
        order.status === "draft_quote" ||
        order.status === "quote_requested" ||
        order.status === "quote_finalized"
      ) {
        return false;
      }

      const orderDate = new Date(order.approvedAt || order.createdAt);
      if (orderDate < dateRangeBounds.start || orderDate > dateRangeBounds.end) {
        return false;
      }

      // Filter by payment status if selected
      if (basStatusFilter === "paid" && !(order.status === "paid" || order.status === "shipped" || (order.status as any) === "Dispatched")) {
        return false;
      }
      if (basStatusFilter === "unpaid" && (order.status === "paid" || order.status === "shipped" || (order.status as any) === "Dispatched")) {
        return false;
      }

      // Filter by search query
      if (basSearchQuery.trim()) {
        const q = basSearchQuery.toLowerCase();
        const matchId = order.id.toLowerCase().includes(q);
        const matchCompany = (order.companyName || "").toLowerCase().includes(q);
        const matchEmail = (order.customerEmail || "").toLowerCase().includes(q);
        return matchId || matchCompany || matchEmail;
      }

      return true;
    });
  }, [orders, dateRangeBounds, basStatusFilter, basSearchQuery]);

  // Aggregate BAS figures
  const basReport = useMemo(() => {
    let g1TotalSales = 0; // Total sales inc GST and Freight
    let totalGST_1A = 0; // 10% GST on sales
    let totalNetSales = 0; // Subtotal ex GST
    let totalFreight = 0;
    let totalCredits = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    basFilteredOrders.forEach(ord => {
      const freight = ord.shippingCharge || 0;
      const credit = ord.creditAdjustment || 0;
      const orderTotalIncGst = ord.totalAmount + freight - credit;

      g1TotalSales += orderTotalIncGst;
      totalGST_1A += ord.gstAmount;
      totalNetSales += ord.subtotal;
      totalFreight += freight;
      totalCredits += credit;

      const isPaid = ord.status === "paid" || ord.status === "shipped" || (ord.status as any) === "Dispatched";
      if (isPaid) {
        paidAmount += orderTotalIncGst;
        paidCount++;
      } else {
        unpaidAmount += orderTotalIncGst;
        unpaidCount++;
      }
    });

    const averageOrderValue = basFilteredOrders.length > 0 
      ? g1TotalSales / basFilteredOrders.length 
      : 0;

    return {
      g1TotalSales,
      totalGST_1A,
      totalNetSales,
      totalFreight,
      totalCredits,
      paidAmount,
      unpaidAmount,
      paidCount,
      unpaidCount,
      orderCount: basFilteredOrders.length,
      averageOrderValue
    };
  }, [basFilteredOrders]);

  // --- Accountant CSV Export Handler ---
  const handleExportAccountantCSV = () => {
    if (basFilteredOrders.length === 0) {
      showToast("No orders available in the selected period to export.", "info");
      return;
    }

    const headers = [
      "Invoice ID",
      "Issue Date",
      "Customer / Company",
      "Customer Email",
      "Document Type",
      "Status",
      "Subtotal (ex GST)",
      "GST (10%)",
      "Freight / Shipping",
      "Credit Adjustments",
      "Gross Total (AUD)",
      "Payment Status"
    ];

    const rows = basFilteredOrders.map(ord => {
      const isPaid = ord.status === "paid" || ord.status === "shipped" || (ord.status as any) === "Dispatched";
      const freight = ord.shippingCharge || 0;
      const credit = ord.creditAdjustment || 0;
      const grandTotal = ord.totalAmount + freight - credit;
      const dateStr = new Date(ord.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });

      return [
        `"${ord.id}"`,
        `"${dateStr}"`,
        `"${(ord.companyName || "Wholesale Buyer").replace(/"/g, '""')}"`,
        `"${ord.customerEmail || ""}"`,
        `"${ord.documentType || "INVOICE"}"`,
        `"${ord.status}"`,
        ord.subtotal.toFixed(2),
        ord.gstAmount.toFixed(2),
        freight.toFixed(2),
        credit.toFixed(2),
        grandTotal.toFixed(2),
        `"${isPaid ? "Paid" : "Outstanding"}"`
      ].join(",");
    });

    // Summary lines for accountant
    const summaryLines = [
      "",
      `"--- ATO BAS SUMMARY (${dateRangeBounds.label}) ---"`,
      `"G1 Total Sales (inc. GST & Freight)",${basReport.g1TotalSales.toFixed(2)}`,
      `"1A GST on Sales (10% to remit)",${basReport.totalGST_1A.toFixed(2)}`,
      `"Net Sales (ex. GST)",${basReport.totalNetSales.toFixed(2)}`,
      `"Total Freight Billed",${basReport.totalFreight.toFixed(2)}`,
      `"Total Settled/Paid",${basReport.paidAmount.toFixed(2)}`,
      `"Total Outstanding (A/R)",${basReport.unpaidAmount.toFixed(2)}`,
      `"Total Invoices Count",${basReport.orderCount}`,
      `"Generated At","${new Date().toLocaleString("en-AU")}"`,
      `"Business Name","${(companySettings.companyName || "Desmo Products Pty Ltd").replace(/"/g, '""')}"`,
      `"ABN","${companySettings.abn || "78 123 456 789"}"`
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows, ...summaryLines].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePeriodName = datePeriod.toUpperCase();
    const dateStamp = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `Desmo_BAS_Accountant_Ledger_${safePeriodName}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Accountant CSV file downloaded successfully!", "success");
  };

  // --- Copy BAS Summary Text Handler ---
  const handleCopyBasSummary = () => {
    const summaryText = `====================================================
DESMO PRODUCTS PTY LTD - ATO BAS SUMMARY
====================================================
Period: ${dateRangeBounds.label}
ABN: ${companySettings.abn || "78 123 456 789"}
Generated: ${new Date().toLocaleString("en-AU")}

--- OFFICIAL ATO BAS BOXES ---
[G1] Total Sales (inc. GST & Freight):   $${basReport.g1TotalSales.toFixed(2)} AUD
[1A] GST on Sales (10% ATO Remittance): $${basReport.totalGST_1A.toFixed(2)} AUD

--- BREAKDOWN ---
Net Sales Revenue (ex. GST):           $${basReport.totalNetSales.toFixed(2)} AUD
Freight & Delivery Billed:             $${basReport.totalFreight.toFixed(2)} AUD
Credit Adjustments:                    $${basReport.totalCredits.toFixed(2)} AUD

--- RECEIVABLES & CASHFLOW ---
Settled / Paid Revenue (${basReport.paidCount} orders):    $${basReport.paidAmount.toFixed(2)} AUD
Outstanding Receivables (${basReport.unpaidCount} orders):  $${basReport.unpaidAmount.toFixed(2)} AUD
Total Invoices in Period:              ${basReport.orderCount}
====================================================`;

    navigator.clipboard.writeText(summaryText);
    setBasCopied(true);
    showToast("ATO BAS Summary copied to clipboard!", "success");
    setTimeout(() => setBasCopied(false), 2500);
  };

  // ==========================================
  // HANDLERS FOR OTHER TASKS
  // ==========================================
  const handleOpenShippingModal = (order: Order) => {
    setShippingModalOrderId(order.id);
    setShippingCostInput(order.shippingCharge !== undefined ? order.shippingCharge.toString() : "15.00");
  };

  const handleSaveShipping = async () => {
    if (!shippingModalOrderId) return;
    const cost = parseFloat(shippingCostInput);
    if (isNaN(cost) || cost < 0) {
      showToast("Please enter a valid shipping dollar amount.", "error");
      return;
    }
    setIsSubmittingShipping(true);
    try {
      await addShippingCharge(shippingModalOrderId, cost);
      showToast(`Shipping charge of $${cost.toFixed(2)} added!`, "success");
      setShippingModalOrderId(null);
    } catch (err: any) {
      showToast(err.message || "Failed to add shipping charge.", "error");
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      await approveOrder(orderId);
      showToast("Order approved successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to approve order.", "error");
    }
  };

  const handleApproveCustomer = async (cust: CustomerProfile) => {
    try {
      await approveCustomer(cust.id);
      showToast(`Approved wholesale account for ${cust.companyName || cust.email}`, "success");
    } catch (err: any) {
      showToast("Failed to approve account.", "error");
    }
  };

  const handleRejectCustomer = async (cust: CustomerProfile) => {
    if (!window.confirm(`Are you sure you want to decline registration for ${cust.companyName || cust.email}?`)) return;
    try {
      await rejectCustomer(cust.id);
      showToast(`Declined registration for ${cust.companyName || cust.email}`, "info");
    } catch (err: any) {
      showToast("Failed to decline account.", "error");
    }
  };

  const handleQuickSavePrice = async (prod: Product) => {
    const newPrice = parseFloat(quickPriceVal);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast("Please enter a valid price.", "error");
      return;
    }
    try {
      await updateProduct(prod.id, { baseWholesalePrice: newPrice });
      showToast(`Price updated for ${prod.name} to $${newPrice.toFixed(2)}`, "success");
      setQuickPriceEditId(null);
    } catch (err: any) {
      showToast("Failed to update price.", "error");
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdForm.name || !newProdForm.sku || !newProdForm.price) {
      showToast("Please fill in the product Name, SKU, and Price.", "error");
      return;
    }
    try {
      createProduct({
        name: newProdForm.name,
        sku: newProdForm.sku,
        description: newProdForm.description || "High quality industrial equipment.",
        baseWholesalePrice: parseFloat(newProdForm.price),
        stock: parseInt(newProdForm.stock) || 50,
        category: newProdForm.category,
        imageUrl: newProdForm.image || "/assets/default-product.png",
        isRestricted: false,
        allowBackorders: true,
        autoApprove: false,
        weightKg: 1.0,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5
      });
      showToast(`Added product "${newProdForm.name}" successfully!`, "success");
      setIsAddProductModalOpen(false);
      setNewProdForm({
        name: "",
        sku: "",
        description: "",
        price: "",
        stock: "50",
        category: "Digital Meters",
        image: "/assets/default-product.png"
      });
    } catch (err: any) {
      showToast("Failed to create product.", "error");
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastMessage) {
      showToast("Please provide both a subject line and announcement message.", "error");
      return;
    }
    setIsSendingBroadcast(true);
    try {
      const recipientEmails = customers.filter(c => c.email).map(c => c.email);
      await sendCustomerBroadcastEmail(
        recipientEmails,
        broadcastSubject,
        broadcastMessage,
        "Special Announcement"
      );
      showToast(`Announcement sent to ${recipientEmails.length} customer(s)!`, "success");
      setBroadcastSubject("");
      setBroadcastMessage("");
    } catch (err: any) {
      showToast("Failed to send broadcast announcement.", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateCompanySettings(settingsForm);
      showToast("Company settings saved!", "success");
    } catch (err: any) {
      showToast("Failed to save settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto font-sans" id="simple_admin_portal">
      
      {/* --- Top Welcome & Status Banner --- */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border-b-4 border-amber-400">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4" /> Store Owner Control Panel
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Easy Store Manager</h1>
            <p className="text-slate-300 text-base mt-2 max-w-2xl">
              Welcome back! Review your orders, check BAS & GST tax metrics, edit product prices, approve new wholesale accounts, or export data for your accountant.
            </p>
          </div>

          {/* Dual Mode Switch Button */}
          {onSwitchToAdvanced && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">Need deep developer settings?</span>
              <button
                onClick={onSwitchToAdvanced}
                className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-bold py-2.5 px-4 rounded-lg transition border border-slate-600 shadow"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Switch to Advanced Mode
              </button>
            </div>
          )}
        </div>

        {/* Action Summary Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div 
            onClick={() => setActiveTask("orders")}
            className={`cursor-pointer p-4 rounded-xl border transition flex items-center gap-4 ${
              pendingOrders.length > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-slate-800/50 border-slate-700/50 text-slate-300"
            }`}
          >
            <div className={`p-3 rounded-xl ${pendingOrders.length > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
              <Package className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="text-2xl font-black">{pendingOrders.length}</div>
              <div className="text-xs uppercase font-bold tracking-wider">Orders Needing Action</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTask("bas")}
            className="cursor-pointer p-4 rounded-xl border bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 transition flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-amber-400 text-slate-950">
              <Calculator className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="text-2xl font-black font-mono">${basReport.g1TotalSales.toFixed(0)}</div>
              <div className="text-xs uppercase font-bold tracking-wider">BAS Total Sales (G1)</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTask("customers")}
            className={`cursor-pointer p-4 rounded-xl border transition flex items-center gap-4 ${
              pendingCustomers.length > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-slate-800/50 border-slate-700/50 text-slate-300"
            }`}
          >
            <div className={`p-3 rounded-xl ${pendingCustomers.length > 0 ? "bg-emerald-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
              <Users className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="text-2xl font-black">{pendingCustomers.length}</div>
              <div className="text-xs uppercase font-bold tracking-wider">New Dealer Sign-ups</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTask("products")}
            className="cursor-pointer p-4 rounded-xl border bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 transition flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-slate-700 text-slate-300">
              <Tag className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="text-2xl font-black">{products.length}</div>
              <div className="text-xs uppercase font-bold tracking-wider">Active Store Products</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Big Action Task Selector Buttons --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" id="task_navigation_buttons">
        <button
          onClick={() => setActiveTask("orders")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "orders" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Package className={`w-8 h-8 mb-1.5 ${activeTask === "orders" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">1. Orders & Freight</span>
          {pendingOrders.length > 0 && (
            <span className="mt-1 bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
              {pendingOrders.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTask("bas")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "bas" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Calculator className={`w-8 h-8 mb-1.5 ${activeTask === "bas" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">2. BAS & Accounts</span>
        </button>

        <button
          onClick={() => setActiveTask("products")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "products" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Tag className={`w-8 h-8 mb-1.5 ${activeTask === "products" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">3. Products & Prices</span>
        </button>

        <button
          onClick={() => setActiveTask("customers")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "customers" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Users className={`w-8 h-8 mb-1.5 ${activeTask === "customers" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">4. Dealer Approvals</span>
          {pendingCustomers.length > 0 && (
            <span className="mt-1 bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
              {pendingCustomers.length} Waiting
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTask("announcement")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "announcement" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Megaphone className={`w-8 h-8 mb-1.5 ${activeTask === "announcement" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">5. Send News / Email</span>
        </button>

        <button
          onClick={() => setActiveTask("settings")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-center transition min-h-[105px] ${
            activeTask === "settings" 
              ? "bg-amber-400 border-amber-500 text-slate-950 shadow-lg scale-[1.02]" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Settings className={`w-8 h-8 mb-1.5 ${activeTask === "settings" ? "text-slate-950" : "text-amber-500"}`} />
          <span className="text-sm sm:text-base font-extrabold leading-tight">6. Store Contact</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* --- TASK: BAS & ACCOUNTING REPORTING --- */}
      {/* ========================================================================= */}
      {activeTask === "bas" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-8" id="bas_accounting_view">
          
          {/* Header & Accountant Export Tools */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b pb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-900 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                <Receipt className="w-4 h-4" /> Australian Tax Office (ATO) Compliance
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
                <Calculator className="w-8 h-8 text-amber-500" /> BAS & Accounting Center
              </h2>
              <p className="text-slate-600 text-base mt-1">
                Automated BAS calculations, GST breakdown, cashflow metrics, and 1-click export for your accountant.
              </p>
            </div>

            {/* Accountant Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyBasSummary}
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3 px-4 rounded-xl transition border border-slate-300 shadow-sm min-h-[48px]"
              >
                {basCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
                {basCopied ? "BAS Copied to Clipboard!" : "Copy BAS Summary"}
              </button>

              <button
                onClick={handleExportAccountantCSV}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 px-5 rounded-xl transition shadow-md min-h-[48px]"
              >
                <Download className="w-5 h-5" />
                Download Accountant CSV (Excel)
              </button>
            </div>
          </div>

          {/* Date Range Selector Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" /> Select Accounting Period:
              </span>
              <span className="text-sm font-extrabold text-amber-700 bg-amber-100/60 px-3 py-1 rounded-lg border border-amber-200">
                Active Period: {dateRangeBounds.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <button
                onClick={() => setDatePeriod("day")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "day"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                📅 Day (Today)
              </button>

              <button
                onClick={() => setDatePeriod("week")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "week"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                📆 Week (7 Days)
              </button>

              <button
                onClick={() => setDatePeriod("month")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "month"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                🗓️ Month
              </button>

              <button
                onClick={() => setDatePeriod("quarter")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "quarter"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                🏛️ Quarter (BAS)
              </button>

              <button
                onClick={() => setDatePeriod("ytd")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "ytd"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                📈 YTD (Financial Year)
              </button>

              <button
                onClick={() => setDatePeriod("yearly")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "yearly"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                📊 Full Year (12 Mo)
              </button>

              <button
                onClick={() => setDatePeriod("custom")}
                className={`py-3 px-3 rounded-xl font-extrabold text-sm border-2 transition text-center ${
                  datePeriod === "custom"
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                ⚙️ Custom Dates
              </button>
            </div>

            {/* Custom Date Range Inputs */}
            {datePeriod === "custom" && (
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">From Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="p-2.5 border-2 border-slate-300 rounded-xl font-bold text-sm bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">To Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="p-2.5 border-2 border-slate-300 rounded-xl font-bold text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* --- OFFICIAL ATO BAS BOXES --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* G1 Box */}
            <div className="bg-amber-50 border-3 border-amber-400 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  ATO Box G1
                </span>
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Sales (inc. GST)</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono mt-1">
                  ${basReport.g1TotalSales.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Gross income including products and shipping.
                </p>
              </div>
            </div>

            {/* 1A Box */}
            <div className="bg-blue-50 border-3 border-blue-400 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  ATO Box 1A
                </span>
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">GST on Sales (10%)</div>
                <div className="text-3xl sm:text-4xl font-black text-blue-900 font-mono mt-1">
                  ${basReport.totalGST_1A.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  GST collected to remit to Australian Taxation Office.
                </p>
              </div>
            </div>

            {/* Net Revenue */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Net Sales
                </span>
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Net (ex. GST)</div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-900 font-mono mt-1">
                  ${basReport.totalNetSales.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  True business sales revenue excluding GST.
                </p>
              </div>
            </div>

            {/* Freight Billed */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="bg-slate-700 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Freight Income
                </span>
                <Truck className="w-6 h-6 text-slate-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Shipping Collected</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono mt-1">
                  ${basReport.totalFreight.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Total postage & carrier charges billed.
                </p>
              </div>
            </div>

          </div>

          {/* Cashflow & Accounts Receivable Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle2 className="w-7 h-7 font-black" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-slate-500">Paid & Settled Revenue</div>
                <div className="text-2xl font-black text-emerald-800 font-mono">${basReport.paidAmount.toFixed(2)}</div>
                <div className="text-xs text-slate-500 font-medium">{basReport.paidCount} paid orders</div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3.5 bg-amber-100 text-amber-900 rounded-xl">
                <Clock className="w-7 h-7 font-black" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-slate-500">Outstanding (Receivables)</div>
                <div className="text-2xl font-black text-amber-800 font-mono">${basReport.unpaidAmount.toFixed(2)}</div>
                <div className="text-xs text-slate-500 font-medium">{basReport.unpaidCount} unpaid/pending</div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3.5 bg-blue-100 text-blue-800 rounded-xl">
                <BarChart3 className="w-7 h-7 font-black" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-slate-500">Average Order Value</div>
                <div className="text-2xl font-black text-blue-900 font-mono">${basReport.averageOrderValue.toFixed(2)}</div>
                <div className="text-xs text-slate-500 font-medium">{basReport.orderCount} total invoices</div>
              </div>
            </div>

          </div>

          {/* --- INVOICES LEDGER TABLE --- */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Tax Invoices in this Period ({basFilteredOrders.length})</h3>
                <p className="text-xs text-slate-500">Click any invoice to view or print official tax invoice copy.</p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl border border-slate-300 overflow-hidden bg-white text-xs font-bold">
                  <button
                    onClick={() => setBasStatusFilter("all")}
                    className={`px-3 py-2 ${basStatusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    onClick={() => setBasStatusFilter("paid")}
                    className={`px-3 py-2 ${basStatusFilter === "paid" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    Paid
                  </button>
                  <button
                    onClick={() => setBasStatusFilter("unpaid")}
                    className={`px-3 py-2 ${basStatusFilter === "unpaid" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    Unpaid
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={basSearchQuery}
                    onChange={e => setBasSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none w-48"
                  />
                </div>
              </div>
            </div>

            {basFilteredOrders.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 font-bold">
                No orders or invoices found for this time period.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-2xl shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-800 font-bold text-xs uppercase border-b">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Customer / Company</th>
                      <th className="p-3.5 text-right">Subtotal</th>
                      <th className="p-3.5 text-right">GST (10%)</th>
                      <th className="p-3.5 text-right">Freight</th>
                      <th className="p-3.5 text-right">Total (inc GST)</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-800 text-xs sm:text-sm">
                    {basFilteredOrders.map((ord) => {
                      const isPaid = ord.status === "paid" || ord.status === "shipped" || (ord.status as any) === "Dispatched";
                      const freight = ord.shippingCharge || 0;
                      const grandTotal = ord.totalAmount + freight;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50 font-medium">
                          <td className="p-3.5 font-mono font-black text-slate-900">#{ord.id}</td>
                          <td className="p-3.5 text-slate-500">
                            {new Date(ord.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{ord.companyName || "Wholesale Buyer"}</div>
                            <div className="text-xs text-slate-400 font-mono">{ord.customerEmail}</div>
                          </td>
                          <td className="p-3.5 text-right font-mono">${ord.subtotal.toFixed(2)}</td>
                          <td className="p-3.5 text-right font-mono text-blue-700">${ord.gstAmount.toFixed(2)}</td>
                          <td className="p-3.5 text-right font-mono text-slate-600">${freight.toFixed(2)}</td>
                          <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm">
                            ${grandTotal.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {isPaid ? "Paid" : "Outstanding"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {onViewInvoice && (
                              <button
                                onClick={() => onViewInvoice(ord.id)}
                                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-400" /> View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TASK 1: ORDERS & FREIGHT MANAGEMENT --- */}
      {/* ========================================================================= */}
      {activeTask === "orders" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Package className="w-7 h-7 text-amber-500" /> Customer Orders & Shipping
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Review incoming orders, set freight charges, and approve orders to send invoices.
              </p>
            </div>
            <span className="bg-slate-100 text-slate-800 text-sm font-bold px-4 py-2 rounded-xl border">
              Total Orders: {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-lg font-bold">No orders placed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const isPending = ord.status === "pending_approval" || ord.status === "pending_payment" || (ord.status as any) === "Pending Approval" || (ord.status as any) === "Pending Payment";
                const totalFreight = ord.shippingCharge || 0;
                const grandTotal = ord.totalAmount + totalFreight;

                return (
                  <div 
                    key={ord.id} 
                    className={`rounded-2xl border-2 p-5 sm:p-6 transition shadow-sm ${
                      isPending ? "bg-amber-50/50 border-amber-300" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono font-black text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border">
                            #{ord.id}
                          </span>
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                            ord.status === "approved" || (ord.status as any) === "Approved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                              : ord.status === "shipped" || (ord.status as any) === "Dispatched"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-amber-200 text-amber-900 border border-amber-400"
                          }`}>
                            {ord.status}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(ord.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="text-lg font-extrabold text-slate-900">
                          Customer: <span className="text-amber-600">{ord.companyName || "Wholesale Buyer"}</span> ({ord.customerEmail})
                        </div>

                        {/* Items list summary */}
                        <div className="text-sm text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-200 max-w-xl">
                          <span className="font-bold text-slate-800">Items Ordered:</span>{" "}
                          {ord.items.map(i => `${i.qty}x ${i.productName}`).join(", ")}
                        </div>

                        {/* Totals */}
                        <div className="flex items-center gap-6 pt-1">
                          <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Subtotal:</span>
                            <div className="text-lg font-bold text-slate-800">${ord.totalAmount.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Freight/Shipping:</span>
                            <div className="text-lg font-bold text-blue-600 font-mono">
                              {ord.shippingCharge !== undefined ? `$${ord.shippingCharge.toFixed(2)}` : "Not Added Yet"}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">Grand Total:</span>
                            <div className="text-xl font-black text-slate-900 font-mono">
                              ${grandTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Big Actions */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                        {/* Add Freight Button */}
                        <button
                          onClick={() => handleOpenShippingModal(ord)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3 px-5 rounded-xl transition shadow-md min-h-[48px]"
                        >
                          <Truck className="w-5 h-5" />
                          {ord.shippingCharge !== undefined ? "Change Freight ($)" : "Set Freight ($)"}
                        </button>

                        {/* Approve Order Button */}
                        {isPending && (
                          <button
                            onClick={() => handleApproveOrder(ord.id)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-3 px-5 rounded-xl transition shadow-md min-h-[48px]"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Approve Order
                          </button>
                        )}

                        {/* View Invoice Button */}
                        {onViewInvoice && (
                          <button
                            onClick={() => onViewInvoice(ord.id)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-base py-3 px-4 rounded-xl transition shadow-sm min-h-[48px]"
                          >
                            <FileText className="w-5 h-5 text-amber-400" />
                            Invoice
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TASK 3: PRODUCTS & PRICES MANAGEMENT --- */}
      {/* ========================================================================= */}
      {activeTask === "products" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-7 h-7 text-amber-500" /> Products & Price Management
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                View all items in store. Easily edit prices or add new products.
              </p>
            </div>
            
            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-base py-3.5 px-6 rounded-xl transition shadow-lg shrink-0 min-h-[48px]"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              Add New Product
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product by name or SKU..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-lg font-medium focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Products List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex gap-4">
                  <SafeProductImage
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-24 h-24 object-contain rounded-xl bg-slate-50 border p-2 shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">
                      SKU: {prod.sku}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">{prod.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{prod.description}</p>
                    <div className="text-xs font-bold text-slate-700 pt-1">
                      Stock Level: <span className={(prod.stock || 0) > 0 ? "text-emerald-600" : "text-rose-600 font-black"}>{prod.stock ?? 0} units</span>
                    </div>
                  </div>
                </div>

                {/* Quick Price Editor Section */}
                <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase block">Current Price</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">${prod.baseWholesalePrice.toFixed(2)}</span>
                  </div>

                  {quickPriceEditId === prod.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={quickPriceVal}
                        onChange={e => setQuickPriceVal(e.target.value)}
                        className="w-28 p-2 border-2 border-amber-400 rounded-lg text-lg font-bold font-mono"
                        placeholder="0.00"
                        autoFocus
                      />
                      <button
                        onClick={() => handleQuickSavePrice(prod)}
                        className="bg-emerald-600 text-white font-bold px-3 py-2.5 rounded-lg hover:bg-emerald-700 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setQuickPriceEditId(null)}
                        className="bg-slate-200 text-slate-700 font-bold px-2 py-2 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingProduct(prod)}
                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 px-3 rounded-xl transition shadow-sm border border-slate-300"
                      >
                        <Settings className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setQuickPriceEditId(prod.id);
                          setQuickPriceVal(prod.baseWholesalePrice.toString());
                        }}
                        className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl transition shadow-sm"
                      >
                        <Pencil className="w-4 h-4" /> Change Price
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TASK 4: DEALER APPROVALS --- */}
      {/* ========================================================================= */}
      {activeTask === "customers" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-amber-500" /> B2B Wholesale Dealer Approvals
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Review new account signups. Approved accounts get access to wholesale trade pricing.
            </p>
          </div>

          {/* Pending Accounts Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Accounts Waiting for Review ({pendingCustomers.length})
            </h3>

            {pendingCustomers.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-800 font-bold">
                ✅ All dealer signups have been reviewed! No pending approvals.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCustomers.map((cust) => (
                  <div key={cust.id} className="border-2 border-amber-300 bg-amber-50/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                      <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                        Pending Wholesale Registration
                      </span>
                      <h4 className="text-xl font-black text-slate-900 mt-2">{cust.companyName || "Wholesale Applicant"}</h4>
                      <p className="text-sm text-slate-600">Email: {cust.email}</p>
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-amber-200">
                      <button
                        onClick={() => handleApproveCustomer(cust)}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base py-3 px-4 rounded-xl transition shadow min-h-[48px]"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Approve Account
                      </button>
                      <button
                        onClick={() => handleRejectCustomer(cust)}
                        className="inline-flex items-center justify-center gap-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-sm py-3 px-4 rounded-xl transition border min-h-[48px]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Accounts Summary */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-slate-900 mb-3">All Registered Customers ({customers.length})</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Customer / Company</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{c.companyName || "Wholesale Buyer"}</td>
                      <td className="p-3 font-mono">{c.email}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TASK 5: BROADCAST ANNOUNCEMENTS --- */}
      {/* ========================================================================= */}
      {activeTask === "announcement" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-amber-500" /> Send Customer Announcement
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Broadcast an email message or deal announcement to all approved store customers.
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-5 max-w-2xl">
            <div>
              <label className="block text-base font-extrabold text-slate-900 mb-2">
                Email Subject Line *
              </label>
              <input
                type="text"
                placeholder="e.g. New True RMS Multimeters Now In Stock!"
                value={broadcastSubject}
                onChange={e => setBroadcastSubject(e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-medium focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-base font-extrabold text-slate-900 mb-2">
                Announcement Message *
              </label>
              <textarea
                rows={6}
                placeholder="Write your news or special offer here..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-base font-medium focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSendingBroadcast}
              className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-lg py-4 px-8 rounded-xl transition shadow-lg min-h-[52px]"
            >
              <Send className="w-6 h-6" />
              {isSendingBroadcast ? "Sending Broadcast..." : "Send Announcement to All Customers"}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TASK 6: STORE CONTACT & GST SETTINGS --- */}
      {/* ========================================================================= */}
      {activeTask === "settings" && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Building className="w-7 h-7 text-amber-500" /> Store Details & Contact Info
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Update company address, main contact email, and payment details.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">Company / Trading Name</label>
                <input
                  type="text"
                  value={settingsForm.companyName}
                  onChange={e => setSettingsForm({ ...settingsForm, companyName: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">ABN</label>
                <input
                  type="text"
                  value={settingsForm.abn}
                  onChange={e => setSettingsForm({ ...settingsForm, abn: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={settingsForm.bankName}
                  onChange={e => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1">Store Address</label>
              <textarea
                rows={3}
                value={settingsForm.address}
                onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-base py-3.5 px-6 rounded-xl transition shadow-md min-h-[48px]"
            >
              {isSavingSettings ? "Saving Settings..." : "Save Store Details"}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL: Add Shipping Charge --- */}
      {/* ========================================================================= */}
      {shippingModalOrderId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" /> Set Shipping Cost
              </h3>
              <button 
                onClick={() => setShippingModalOrderId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Enter the freight/shipping cost for order <strong className="font-mono">#{shippingModalOrderId}</strong>:
            </p>

            <div className="relative">
              <DollarSign className="w-6 h-6 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="number"
                step="0.01"
                value={shippingCostInput}
                onChange={e => setShippingCostInput(e.target.value)}
                placeholder="15.00"
                className="w-full pl-12 pr-4 py-3 border-2 border-blue-400 rounded-xl text-2xl font-bold font-mono focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveShipping}
                disabled={isSubmittingShipping}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition shadow min-h-[48px]"
              >
                {isSubmittingShipping ? "Saving..." : "Save Freight Charge"}
              </button>
              <button
                onClick={() => setShippingModalOrderId(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 px-4 rounded-xl transition min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL: Add New Product --- */}
      {/* ========================================================================= */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 max-w-xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-7 h-7 text-amber-500 stroke-[3]" /> Add New Product
              </h3>
              <button 
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. True RMS Digital Multimeter"
                  value={newProdForm.name}
                  onChange={e => setNewProdForm({ ...newProdForm, name: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-900 mb-1">SKU / Model Number *</label>
                  <input
                    type="text"
                    placeholder="DES-MM-01"
                    value={newProdForm.sku}
                    onChange={e => setNewProdForm({ ...newProdForm, sku: e.target.value })}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-slate-900 mb-1">Price ($ AUD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="199.00"
                    value={newProdForm.price}
                    onChange={e => setNewProdForm({ ...newProdForm, price: e.target.value })}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-900 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter product details..."
                  value={newProdForm.description}
                  onChange={e => setNewProdForm({ ...newProdForm, description: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-900 mb-1">Category</label>
                  <select
                    value={newProdForm.category}
                    onChange={e => setNewProdForm({ ...newProdForm, category: e.target.value })}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Digital Meters">Digital Meters</option>
                    <option value="Clamp Meters">Clamp Meters</option>
                    <option value="Thermal Imaging">Thermal Imaging</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-slate-900 mb-1">Initial Stock Level</label>
                  <input
                    type="number"
                    value={newProdForm.stock}
                    onChange={e => setNewProdForm({ ...newProdForm, stock: e.target.value })}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-base font-bold font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-lg py-3.5 px-4 rounded-xl transition shadow-lg min-h-[48px]"
                >
                  Create Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 px-4 rounded-xl transition min-h-[48px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
        />
      )}

    </div>
  );
};
