import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Product, CustomerProfile, Order, GSTReportData } from "../types";
import { 
  Users, 
  Wrench, 
  TrendingUp, 
  Check, 
  X, 
  Shield, 
  Copy,
  Plus,
  Trash2,
  Download
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { 
    customers, 
    products, 
    orders, 
    approveCustomer, 
    rejectCustomer, 
    updateCustomerPricing, 
    removeCustomerPricing, 
    toggleRestrictedProductAccess,
    createProduct,
    deleteProduct,
    categories,
    addCategory,
    deleteCategory
  } = usePortal();

  const [activeSubTab, setActiveSubTab] = useState<"accounting" | "customers" | "products">("accounting");

  // Filter ranges for tax data
  const [dateRange, setDateRange] = useState<"30days" | "3months" | "fy">("fy");
  const [reportSortBy, setReportSortBy] = useState<"customer" | "week" | "month" | "quarter" | "fy">("customer");

  // CRM State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Product Creation state
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImg, setNewProdImg] = useState("");
  const [newProdPrice, setNewProdPrice] = useState(100);
  const [newProdRestricted, setNewProdRestricted] = useState(false);
  const [newProdCategory, setNewProdCategory] = useState("Digital Meters");
  const [newProdStock, setNewProdStock] = useState(50);
  const [newProdAllowBackorders, setNewProdAllowBackorders] = useState(true);
  const [newProdAutoApprove, setNewProdAutoApprove] = useState(false);
  
  const [newProdQbValueType, setNewProdQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [newProdQbValue, setNewProdQbValue] = useState(5);
  const [newProdQtyBreaks, setNewProdQtyBreaks] = useState<QuantityBreak[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Preview loaded local files
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Feedback states
  const [pricingInputValues, setPricingInputValues] = useState<{ [customerId_productId: string]: string }>({});
  const [basCopied, setBasCopied] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Compute accounting metrics based on date range
  const getFilteredOrders = (): Order[] => {
    const now = new Date();
    return orders.filter(order => {
      // ONLY include confirmed orders (approved, paid, shipped)
      if (
        order.status === "pending_approval" || 
        order.status === "declined" || 
        order.status === "cancelled"
      ) {
        return false;
      }
      
      const orderDate = new Date(order.createdAt);
      if (dateRange === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      } else if (dateRange === "3months") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return orderDate >= threeMonthsAgo;
      }
      return true; // Full FY / history
    });
  };

  const currentFilteredOrders = getFilteredOrders();

  const calculateGSTReport = () => {
    let totalRevenue = 0;
    let totalGST = 0;
    let totalSubtotal = 0;
    let paidOrderCount = 0;
    let pendingOrderCount = 0;

    // Dynamic ledger based on reportSortBy
    const ledger: { [key: string]: { subtotal: number; gst: number; total: number; count: number } } = {};
    const byMonth: { [month: string]: { subtotal: number; gst: number; total: number } } = {};

    currentFilteredOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      totalGST += order.gstAmount;
      totalSubtotal += order.subtotal;

      if (order.status === "paid" || order.status === "shipped") paidOrderCount++;
      else pendingOrderCount++;

      // Compute dynamic ledger grouping key
      let key = order.companyName; // Default "customer"
      const date = new Date(order.createdAt);
      
      if (reportSortBy === "week") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else if (reportSortBy === "month") {
        key = date.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
      } else if (reportSortBy === "quarter") {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `Q${q} ${date.getFullYear()}`;
      } else if (reportSortBy === "fy") {
        const year = date.getFullYear();
        const isSecondHalf = date.getMonth() >= 6; // July-June fiscal year
        key = isSecondHalf ? `FY ${year}/${year + 1}` : `FY ${year - 1}/${year}`;
      }

      if (!ledger[key]) {
        ledger[key] = { subtotal: 0, gst: 0, total: 0, count: 0 };
      }
      ledger[key].subtotal += order.subtotal;
      ledger[key].gst += order.gstAmount;
      ledger[key].total += order.totalAmount;
      ledger[key].count += 1;

      // Breakdown by month for graph
      const monthKey = date.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { subtotal: 0, gst: 0, total: 0 };
      }
      byMonth[monthKey].subtotal += order.subtotal;
      byMonth[monthKey].gst += order.gstAmount;
      byMonth[monthKey].total += order.totalAmount;
    });

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalGST: Number(totalGST.toFixed(2)),
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      orderCount: currentFilteredOrders.length,
      paidOrderCount,
      pendingOrderCount,
      ledger,
      byMonth
    };
  };

  const report = calculateGSTReport();

  // Export BAS CSV Data to Clipboard
  // Export BAS CSV Data to Clipboard
  const handleCopyBasData = () => {
    let csv = "";
    if (reportSortBy === "customer") {
      csv = "Customer/Company,Orders Count,Subtotal (ex. GST),GST Collected (10%),Gross Total (AUD)\n";
      Object.entries(report.ledger).forEach(([key, val]) => {
        csv += `"${key}",${val.count},${val.subtotal.toFixed(2)},${val.gst.toFixed(2)},${val.total.toFixed(2)}\n`;
      });
    } else {
      csv = "Period,Invoices Count,Subtotal (ex. GST),GST Collected (10%),Gross Total (AUD)\n";
      Object.entries(report.ledger).forEach(([key, val]) => {
        csv += `"${key}",${val.count},${val.subtotal.toFixed(2)},${val.gst.toFixed(2)},${val.total.toFixed(2)}\n`;
      });
    }

    navigator.clipboard.writeText(csv);
    setBasCopied(true);
    setTimeout(() => setBasCopied(false), 2000);
  };

  const handleAddQtyBreak = () => {
    if (newProdQbQty <= 1 || newProdQbValue < 1) return;
    setNewProdQtyBreaks(prev => [
      ...prev, 
      { 
        minQty: newProdQbQty, 
        discountType: newProdQbValueType, 
        discountValue: newProdQbValue 
      }
    ].sort((a,b) => a.minQty - b.minQty));
    setNewProdQbQty(10);
    setNewProdQbValue(5);
  };

  const handleRemoveQtyBreak = (index: number) => {
    setNewProdQtyBreaks(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 650;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setNewProdImg(base64);
        setImagePreviewUrl(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSku) return;

    createProduct({
      name: newProdName,
      sku: newProdSku,
      description: newProdDesc || "Precision industrial electrical testing instrument.",
      imageUrl: newProdImg || "placeholder",
      baseWholesalePrice: Number(newProdPrice),
      isRestricted: newProdRestricted,
      autoApprove: newProdAutoApprove,
      category: newProdCategory,
      quantityBreaks: newProdQtyBreaks,
      stock: Number(newProdStock),
      allowBackorders: newProdAllowBackorders
    });

    setNewProdName("");
    setNewProdSku("");
    setNewProdDesc("");
    setNewProdImg("");
    setImagePreviewUrl(null);
    setNewProdPrice(100);
    setNewProdRestricted(false);
    setNewProdAutoApprove(false);
    setNewProdStock(50);
    setNewProdAllowBackorders(true);
    setNewProdQtyBreaks([]);
    setNewProdAutoApprove(false);
  };

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      products,
      customers,
      orders,
      categories
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `desmo-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdatePriceOverride = (customerId: string, productId: string) => {
    const valKey = `${customerId}_${productId}`;
    const priceStr = pricingInputValues[valKey];
    if (priceStr === undefined || priceStr === "") return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) return;
    
    updateCustomerPricing(customerId, productId, price);
    setPricingInputValues(prev => ({ ...prev, [valKey]: "" }));
    alert("Custom contract pricing updated!");
  };

  return (
    <div className="space-y-8" id="admin_dashboard_container">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm rounded-xl" id="admin_dashboard_header">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-full">
            Secure Admin Area
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-slate-900 mt-1">
            Desmo Products Administrator
          </h2>
          <p className="text-sm text-slate-650 max-w-2xl leading-relaxed font-medium">
            Manage custom dealer accounts, establish contract pricing structures, and evaluate monthly GST liabilities.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportBackup}
            className="hidden sm:flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Backup Data
          </button>
          <Shield className="w-10 h-10 text-blue-600 hidden md:block" />
        </div>
      </div>

      {/* Segment Selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 border-b border-slate-100 pb-4" id="admin_tab_selector">
        {(["accounting", "customers", "products"] as const).map((tab) => {
          const label = tab === "accounting" 
            ? "Bookkeeping & GST" 
            : tab === "customers" 
              ? `Customers (${customers.filter(c => c.email !== "lew@desmoproducts.com.au").length})` 
              : "Products";
          const icon = tab === "accounting" 
            ? <TrendingUp className="w-4 h-4" /> 
            : tab === "customers" 
              ? <Users className="w-4 h-4" /> 
              : <Wrench className="w-4 h-4" />;
          return (
            <button
              key={tab}
              id={`admin_tab_${tab}`}
              onClick={() => { setActiveSubTab(tab); if (tab !== "customers") setSelectedCustomerId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 border text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                activeSubTab === tab
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Bookkeeping & GST */}
      {activeSubTab === "accounting" && (
        <div className="space-y-8" id="accounting_sub_panel">
          {/* Ranges Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Reporting Window:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "30days", label: "Last 30 Days" },
                  { id: "3months", label: "Last Quarter" },
                  { id: "fy", label: "Financial Year" }
                ].map(range => (
                  <button
                    key={range.id}
                    onClick={() => setDateRange(range.id as any)}
                    className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                      dateRange === range.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Ledger Sorting & Grouping:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "customer", label: "By Customer" },
                  { id: "week", label: "By Week" },
                  { id: "month", label: "By Month" },
                  { id: "quarter", label: "By Quarter" },
                  { id: "fy", label: "By Fiscal Year" }
                ].map(group => (
                  <button
                    key={group.id}
                    onClick={() => setReportSortBy(group.id as any)}
                    className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                      reportSortBy === group.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Booked Gross Receipts:</span>
              <span className="text-3xl font-extrabold text-slate-900 block font-sans">${report.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-xs text-slate-500 leading-normal">
                Subtotal + GST on {report.orderCount} active wholesale invoices.
              </p>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Net Base Sales (ex. GST):</span>
              <span className="text-3xl font-extrabold text-slate-900 block font-sans">${report.totalSubtotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-xs text-slate-500 leading-normal">
                Taxable components volume before GST.
              </p>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full">
                BAS ACCRUAL
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">GST Liabilities (10%):</span>
              <span className="text-3xl font-extrabold text-blue-600 block font-sans">${report.totalGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-xs text-slate-500 leading-normal">
                GST collected representing 1/11th of gross wholesale sales.
              </p>
            </div>
          </div>

          {/* Table of sales by customer & Month */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Customer breakdowns */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Partner Customer Revenue Ledger
                </h3>
                <button
                  id="copy_bas_csv_btn"
                  onClick={handleCopyBasData}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  {basCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      BAS CSV Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Bookkeeping CSV
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-550 uppercase text-[9px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">
                        {reportSortBy === "customer" ? "Workshop Company Name" : "Reporting Period"}
                      </th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                      <th className="py-2.5 px-3 text-right">Net Sales (ex. GST)</th>
                      <th className="py-2.5 px-3 text-right">GST (10%)</th>
                      <th className="py-2.5 px-3 text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {Object.keys(report.ledger).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic font-medium">No sales recorded within selected window.</td>
                      </tr>
                    ) : (
                      Object.entries(report.ledger).map(([name, data], idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-3 font-semibold text-slate-900 uppercase text-xs tracking-tight">{name}</td>
                          <td className="py-3.5 px-3 text-center font-mono">{data.count}</td>
                          <td className="py-3.5 px-3 text-right font-mono">${data.subtotal.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-500">${data.gst.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-600">${data.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Monthly breakdown chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-4">
                Monthly Invoicing
              </h3>

              {Object.keys(report.byMonth).length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 text-slate-400 text-xs italic font-medium">
                  No monthly patterns.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(report.byMonth).map(([month, data], idx) => {
                    const maxVal = Math.max(...Object.values(report.byMonth).map(m => m.total));
                    const pct = maxVal > 0 ? (data.total / maxVal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-800 uppercase font-bold">{month}</span>
                          <span className="text-slate-500">Net: <strong className="text-slate-700">${data.subtotal.toFixed(0)}</strong> • GST: <strong className="text-blue-600">${data.gst.toFixed(0)}</strong></span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 text-[10px] text-slate-400 uppercase leading-normal font-medium">
                    * The above graph maps total monthly gross invoicing trends to visually assist in quarterly BAS tracking.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab Content 2: Customers CRM */}
      {activeSubTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="customers_crm_panel">
          
          {/* Left Column: Customers List */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-4">
              Wholesale Clients Ledger
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {customers
                .filter(c => c.email !== "lew@desmoproducts.com.au")
                .map((customer) => {
                  const isSelected = selectedCustomerId === customer.id;
                  return (
                    <div
                      key={customer.id}
                      id={`crm_card_${customer.id}`}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer text-xs ${
                        isSelected 
                          ? "bg-blue-50/50 border-blue-500 shadow-sm" 
                          : "bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 uppercase tracking-tight text-xs line-clamp-1">{customer.companyName}</h4>
                        {customer.status === "approved" ? (
                          <span className="bg-emerald-500 text-white text-[8px] font-mono uppercase px-2 py-0.5 rounded-full font-bold">Approved</span>
                        ) : customer.status === "rejected" ? (
                          <span className="bg-red-500 text-white text-[8px] font-mono uppercase px-2 py-0.5 rounded-full font-bold">Rejected</span>
                        ) : (
                          <span className="bg-amber-500 text-white text-[8px] font-mono uppercase px-2 py-0.5 rounded-full font-bold animate-pulse">Pending</span>
                        )}
                      </div>
                      <p className="text-slate-500 font-mono mt-1 text-[10px] truncate">{customer.email}</p>
                      
                      {customer.status === "approved" && (
                        <div className="flex gap-3 text-[9px] text-slate-400 font-mono mt-3 border-t border-slate-100 pt-2 uppercase font-medium">
                          <span>Overrides: <strong className="text-blue-600">{Object.keys(customer.customPricing || {}).length}</strong></span>
                          <span>Parts: <strong className="text-blue-600">{customer.allowedProducts?.length || 0}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Columns: Customer details/custom pricing configuration */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedCustomer ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs uppercase tracking-wider font-semibold shadow-sm leading-relaxed">
                Select a wholesale customer profile on the left to approve registration, define contract pricing lists, or map restricted items.
              </div>
            ) : (
              <div className="space-y-6" id="customer_detail_crm_editor">
                {/* Status & Approvals */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold uppercase text-slate-900 tracking-tight">{selectedCustomer.companyName}</h3>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{selectedCustomer.email} • Registered {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      {selectedCustomer.status !== "approved" && (
                        <button
                          id="crm_approve_btn"
                          onClick={() => approveCustomer(selectedCustomer.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase tracking-wider text-[10px] py-2 px-4 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                        >
                          <Check className="w-4 h-4" />
                          Approve Partner
                        </button>
                      )}

                      {selectedCustomer.status !== "rejected" && (
                        <button
                          id="crm_reject_btn"
                          onClick={() => {
                            rejectCustomer(selectedCustomer.id);
                            setSelectedCustomerId(null);
                          }}
                          className="bg-white hover:bg-slate-50 text-red-650 border border-slate-200 font-semibold uppercase tracking-wider text-[10px] py-2 px-4 rounded-lg shadow-sm transition flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Reject / Deny
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Approved partner accounts can access wholesale portal prices and submit order drafts. Denied accounts are barred. 
                  </p>
                </div>

                {/* PricingOverrides and Products Assignment (Only for Approved users) */}
                {selectedCustomer.status === "approved" && (
                  <>
                    {/* Custom override sheet */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Partner Pricing Override Sheet
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Enter customer-specific wholesale contract prices. These override baseline wholesale pricing. Leave blank or remove to default to standard wholesale.
                      </p>

                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left font-sans">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase border-b border-slate-200 font-semibold">
                              <th className="px-4 py-2.5">Component & SKU</th>
                              <th className="px-4 py-2.5 text-right">Standard Wholesale</th>
                              <th className="px-4 py-2.5 text-right w-36">Contract Override</th>
                              <th className="px-4 py-2.5 text-center w-28">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                            {products.map((p) => {
                              const hasOverride = selectedCustomer.customPricing && selectedCustomer.customPricing[p.id] !== undefined;
                              const currentOverride = hasOverride ? selectedCustomer.customPricing?.[p.id] : "";
                              
                              const valKey = `${selectedCustomer.id}_${p.id}`;
                              const inputVal = pricingInputValues[valKey] !== undefined ? pricingInputValues[valKey] : "";

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3.5 font-sans">
                                    <p className="font-bold text-slate-900 uppercase tracking-tight text-xs">{p.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1 font-medium">{p.sku}</p>
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-bold font-mono text-slate-800">${p.baseWholesalePrice.toFixed(2)}</td>
                                  <td className="px-4 py-3.5 text-right">
                                    <div className="flex items-center bg-white border border-slate-250 rounded-lg p-1.5 w-full max-w-[120px] ml-auto focus-within:border-blue-500 transition">
                                      <span className="text-[10px] text-slate-400 font-mono font-medium">$</span>
                                      <input
                                        id={`crm_price_override_${selectedCustomer.id}_${p.id}`}
                                        type="number"
                                        placeholder={hasOverride ? currentOverride?.toFixed(2) : "None"}
                                        value={inputVal}
                                        onChange={(e) => setPricingInputValues(prev => ({ ...prev, [valKey]: e.target.value }))}
                                        className="w-full text-right bg-transparent border-none text-xs font-bold text-slate-900 py-0 px-1 outline-none focus:ring-0"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <div className="inline-flex gap-1.5">
                                      <button
                                        id={`save_override_${selectedCustomer.id}_${p.id}`}
                                        onClick={() => handleUpdatePriceOverride(selectedCustomer.id, p.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-sans rounded-lg p-1.5 transition shadow-sm"
                                        title="Save price override"
                                      >
                                        <Check className="w-4 h-4 text-white" />
                                      </button>
                                      {hasOverride && (
                                        <button
                                          id={`delete_override_${selectedCustomer.id}_${p.id}`}
                                          onClick={() => {
                                            removeCustomerPricing(selectedCustomer.id, p.id);
                                            alert("Override removed!");
                                          }}
                                          className="bg-white hover:bg-slate-50 text-red-650 rounded-lg p-1.5 border border-slate-200 transition shadow-sm"
                                          title="Remove override"
                                        >
                                          <X className="w-4 h-4 text-red-650" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Restricted product mappings */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Restricted Parts Mapping Visibility
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Certain high-end/racing parts are hidden from the public and standard customer accounts. Toggle below to authorize this customer to view and buy these restricted parts:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products
                          .filter(p => p.isRestricted)
                          .map((p) => {
                            const isAllowed = selectedCustomer.allowedProducts?.includes(p.id) || false;
                            return (
                              <div
                                key={p.id}
                                id={`crm_restrict_item_${p.id}`}
                                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/50 text-xs shadow-sm"
                              >
                                <div className="space-y-0.5 max-w-[180px]">
                                  <p className="font-bold text-slate-800 uppercase tracking-tight truncate text-xs">{p.name}</p>
                                  <p className="text-[10px] text-slate-500 font-mono font-medium truncate">{p.sku}</p>
                                </div>

                                <button
                                  id={`toggle_access_${selectedCustomer.id}_${p.id}`}
                                  onClick={() => toggleRestrictedProductAccess(selectedCustomer.id, p.id)}
                                  className={`px-3 py-1.5 border rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition shadow-sm ${
                                    isAllowed 
                                      ? "bg-blue-600 border-blue-600 text-white" 
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {isAllowed ? "✓ Authorized" : "✕ Blocked"}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Products coordination */}
      {activeSubTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="products_coord_panel">
          
          {/* Left Column: Create new Product */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 space-y-4 h-fit shadow-sm">
            <h3 className="text-xs font-semibold font-mono text-slate-650 uppercase tracking-wider border-b border-slate-200 pb-3">
              Add New Wholesale Equipment
            </h3>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 text-xs font-semibold font-mono">
              <div className="space-y-1">
                <label htmlFor="new_prod_name" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Component Name:</label>
                <input
                  id="new_prod_name"
                  type="text"
                  required
                  placeholder="E.g., True RMS Digital Multimeter"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new_prod_sku" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">SKU Code:</label>
                  <input
                    id="new_prod_sku"
                    type="text"
                    required
                    placeholder="DP-DMM-401"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="new_prod_price" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Base Price (ex. GST):</label>
                  <input
                    id="new_prod_price"
                    type="number"
                    required
                    min="1"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new_prod_stock" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Qty in Stock:</label>
                  <input
                    id="new_prod_stock"
                    type="number"
                    required
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="new_prod_category" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Category:</label>
                  <div className="flex items-center gap-2">
                    <select
                      id="new_prod_category"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      className="flex-1 bg-white border border-slate-250 rounded-lg p-2.5 text-slate-850 focus:outline-none focus:border-blue-500 transition text-xs font-semibold"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if(window.confirm(`Delete category "${newProdCategory}"?`)) {
                          deleteCategory(newProdCategory);
                          if(categories.length > 0) setNewProdCategory(categories[0]);
                        }
                      }}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                      title="Delete selected category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="New Category"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-white border border-slate-250 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          addCategory(newCategoryName.trim());
                          setNewProdCategory(newCategoryName.trim());
                          setNewCategoryName("");
                        }
                      }}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="new_prod_desc" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Description:</label>
                <textarea
                  id="new_prod_desc"
                  placeholder="Detail accuracy specs, measurement ranges, safety standards..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Product Image:</label>
                <div className="flex items-center gap-3">
                  <label className="border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-3.5 text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition flex items-center justify-center font-mono">
                    Upload Local File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                  {imagePreviewUrl ? (
                    <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-sm flex-shrink-0">
                      <img src={imagePreviewUrl} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        type="button" 
                        onClick={() => { setNewProdImg(""); setImagePreviewUrl(null); }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-650 transition"
                        style={{ fontSize: '8px', lineHeight: 1 }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">No file chosen</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 tracking-tight text-xs">Allow Backorders?</span>
                    <p className="text-[8px] text-slate-500 leading-tight uppercase font-semibold font-mono">Sell beyond stock limit</p>
                  </div>
                  <input
                    id="new_prod_allow_backorders"
                    type="checkbox"
                    checked={newProdAllowBackorders}
                    onChange={(e) => setNewProdAllowBackorders(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 border border-slate-350 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 tracking-tight text-xs">Restricted Access?</span>
                    <p className="text-[8px] text-slate-500 leading-tight uppercase font-semibold font-mono">Hidden until authorized</p>
                  </div>
                  <input
                    id="new_prod_restricted"
                    type="checkbox"
                    checked={newProdRestricted}
                    onChange={(e) => setNewProdRestricted(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 border border-slate-350 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 tracking-tight text-xs">Auto Approve?</span>
                    <p className="text-[8px] text-slate-500 leading-tight uppercase font-semibold font-mono">Auto-approve orders</p>
                  </div>
                  <input
                    id="new_prod_auto_approve"
                    type="checkbox"
                    checked={newProdAutoApprove}
                    onChange={(e) => setNewProdAutoApprove(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 border border-slate-350 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Quantity break rules creator */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">Add Quantity Break:</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 col-span-1">
                    <span className="text-[9px] text-slate-450 font-mono px-1 font-semibold">MIN:</span>
                    <input
                      id="new_prod_qb_qty"
                      type="number"
                      min="2"
                      value={newProdQbQty}
                      onChange={(e) => setNewProdQbQty(parseInt(e.target.value) || 2)}
                      className="w-full bg-transparent border-none text-xs font-bold text-slate-700 py-0 px-1 text-right outline-none focus:ring-0"
                    />
                  </div>

                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 col-span-1">
                    <select
                      id="new_prod_qb_val_type"
                      value={newProdQbValueType}
                      onChange={(e) => setNewProdQbValueType(e.target.value as any)}
                      className="w-full bg-transparent border-none text-[9px] font-bold text-slate-750 py-0 outline-none focus:ring-0 font-mono"
                    >
                      <option value="percentage">% Disc</option>
                      <option value="fixed">Fixed $</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 col-span-1">
                    <span className="text-[9px] text-slate-450 font-mono px-1 font-semibold">VAL:</span>
                    <input
                      id="new_prod_qb_value"
                      type="number"
                      min="1"
                      value={newProdQbValue}
                      onChange={(e) => setNewProdQbValue(parseFloat(e.target.value) || 1)}
                      className="w-full bg-transparent border-none text-xs font-bold text-slate-700 py-0 px-1 text-right outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <button
                  id="add_qb_break_btn"
                  type="button"
                  onClick={handleAddQtyBreak}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-2 border border-slate-800 rounded-lg text-[10px] uppercase tracking-wider transition shadow-sm font-mono"
                >
                  Confirm Break Tier
                </button>

                {newProdQtyBreaks.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-3 text-[10px] font-mono font-bold text-slate-650 uppercase">
                    {newProdQtyBreaks.map((qb, i) => (
                      <div key={i} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg">
                        <span>
                          Buy {qb.minQty}+ units gets{" "}
                          {qb.discountType === "fixed" ? `$${qb.discountValue.toFixed(2)} fixed` : `-${qb.discountValue}%`}
                        </span>
                        <button 
                          id={`delete_qb_break_${i}`}
                          onClick={() => handleRemoveQtyBreak(i)} 
                          className="text-red-650 hover:text-red-500 px-1 font-bold"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                id="create_product_submit_btn"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg border border-blue-600 shadow-sm uppercase tracking-wider text-xs transition"
              >
                Create Wholesale Product
              </button>
            </form>
          </div>

          {/* Right Columns: Current catalog details editing */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold font-mono text-slate-650 uppercase tracking-wider border-b border-slate-200 pb-3">
              Master Inventory Index & Price Coordinator
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono text-[9px] uppercase font-semibold">
                    <th className="px-3 py-2.5">Equipment Details</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-right">Wholesale Price (ex. GST)</th>
                    <th className="px-3 py-2.5 text-center">Restricted</th>
                    <th className="px-3 py-2.5 text-center">Breaks</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-sans">
                        <p className="font-bold text-slate-800 tracking-tight text-xs">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 font-medium">{p.sku}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-sans uppercase text-[11px] font-medium">{p.category || "General"}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-blue-600 font-mono">${p.baseWholesalePrice.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-full ${
                          p.isRestricted 
                            ? "bg-red-50 text-red-650 border border-red-200" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {p.isRestricted ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500 font-semibold uppercase text-[10px]">
                        {p.quantityBreaks?.length || 0} breaks
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            if(window.confirm(`Are you sure you want to delete ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition inline-flex items-center justify-center"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
