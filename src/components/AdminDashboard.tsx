import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Product, CustomerProfile, Order, GSTReportData } from "../types";
import { 
  Users, 
  Wrench, 
  TrendingUp, 
  Clipboard, 
  Plus, 
  Check, 
  X, 
  Edit3, 
  Percent, 
  ShieldAlert, 
  FileSpreadsheet, 
  ArrowRight,
  Shield,
  HelpCircle,
  Copy
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
    updateProduct,
    updateOrderStatus
  } = usePortal();

  const [activeSubTab, setActiveSubTab] = useState<"accounting" | "customers" | "products">("accounting");

  // Filter ranges for tax data
  const [dateRange, setDateRange] = useState<"30days" | "3months" | "fy">("fy");

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
  const [newProdQbQty, setNewProdQbQty] = useState(10);
  const [newProdQbDisc, setNewProdQbDisc] = useState(5);
  const [newProdQtyBreaks, setNewProdQtyBreaks] = useState<{ minQty: number; discountPercent: number }[]>([]);

  // Feedback states
  const [pricingInputValues, setPricingInputValues] = useState<{ [customerId_productId: string]: string }>({});
  const [basCopied, setBasCopied] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Compute accounting metrics based on date range
  const getFilteredOrders = (): Order[] => {
    const now = new Date();
    return orders.filter(order => {
      // Exclude cancelled invoices
      if (order.status === "cancelled") return false;
      
      const orderDate = new Date(order.createdAt);
      if (dateRange === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      } else if (dateRange === "3months") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return orderDate >= threeMonthsAgo;
      }
      return true; // Full Fiscal Year
    });
  };

  const currentFilteredOrders = getFilteredOrders();

  const calculateGSTReport = (): GSTReportData => {
    let totalRevenue = 0;
    let totalGST = 0;
    let totalSubtotal = 0;
    let paidOrderCount = 0;
    let pendingOrderCount = 0;

    const byCustomer: { [companyName: string]: { subtotal: number; gst: number; total: number; count: number } } = {};
    const byMonth: { [month: string]: { subtotal: number; gst: number; total: number } } = {};

    currentFilteredOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      totalGST += order.gstAmount;
      totalSubtotal += order.subtotal;

      if (order.status === "paid" || order.status === "shipped") paidOrderCount++;
      else if (order.status === "pending_payment") pendingOrderCount++;

      // Breakdown by customer
      if (!byCustomer[order.companyName]) {
        byCustomer[order.companyName] = { subtotal: 0, gst: 0, total: 0, count: 0 };
      }
      byCustomer[order.companyName].subtotal += order.subtotal;
      byCustomer[order.companyName].gst += order.gstAmount;
      byCustomer[order.companyName].total += order.totalAmount;
      byCustomer[order.companyName].count += 1;

      // Breakdown by month
      const date = new Date(order.createdAt);
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
      byCustomer,
      byMonth
    };
  };

  const report = calculateGSTReport();

  // Export BAS CSV Data to Clipboard
  const handleCopyBasData = () => {
    // Generate simple readable CSV for bookkeeping pasting
    let csv = "Invoice Number,Date,Customer,Subtotal (ex. GST),GST Collected (10%),Gross Total (AUD),Status\n";
    currentFilteredOrders.forEach(o => {
      csv += `${o.id},${new Date(o.createdAt).toLocaleDateString('en-AU')},"${o.companyName}",${o.subtotal.toFixed(2)},${o.gstAmount.toFixed(2)},${o.totalAmount.toFixed(2)},${o.status.toUpperCase()}\n`;
    });

    csv += `\nSUMMARY,Net Sales Total,GST Liability (1/11),Gross Receipts\n`;
    csv += `,${report.totalSubtotal.toFixed(2)},${report.totalGST.toFixed(2)},${report.totalRevenue.toFixed(2)}\n`;

    navigator.clipboard.writeText(csv);
    setBasCopied(true);
    setTimeout(() => setBasCopied(false), 2000);
  };

  const handleAddQtyBreak = () => {
    if (newProdQbQty <= 1 || newProdQbDisc < 1) return;
    setNewProdQtyBreaks(prev => [
      ...prev, 
      { minQty: newProdQbQty, discountPercent: newProdQbDisc }
    ].sort((a,b) => a.minQty - b.minQty));
    setNewProdQbQty(10);
    setNewProdQbDisc(5);
  };

  const handleRemoveQtyBreak = (index: number) => {
    setNewProdQtyBreaks(prev => prev.filter((_, i) => i !== index));
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
      category: newProdCategory,
      quantityBreaks: newProdQtyBreaks,
      stock: 50
    });

    // Reset states
    setNewProdName("");
    setNewProdSku("");
    setNewProdDesc("");
    setNewProdImg("");
    setNewProdPrice(100);
    setNewProdRestricted(false);
    setNewProdQtyBreaks([]);
    alert("Wholesale equipment created successfully!");
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
      <div className="bg-orange-50 border-4 border-black p-6 rounded-none flex items-center justify-between brutalist-shadow-lg">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-black text-white text-[10px] font-mono px-3 py-1 uppercase tracking-widest font-black border border-black">
            Owner Console Secure
          </div>
          <h2 className="text-2xl font-black text-black mt-2 uppercase tracking-tight">Desmo Products Administrator</h2>
          <p className="text-xs text-slate-700 font-mono font-bold uppercase mt-1">
            Manage custom dealer accounts, establish contract pricing structures, and evaluate monthly GST liabilities.
          </p>
        </div>
        <Shield className="w-10 h-10 text-orange-600 hidden sm:block" />
      </div>

      {/* Segment Selector tabs */}
      <div className="flex border-b-4 border-black gap-2" id="admin_tab_selector">
        <button
          id="admin_tab_accounting"
          onClick={() => { setActiveSubTab("accounting"); setSelectedCustomerId(null); }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black font-mono transition-all border-2 border-b-0 uppercase tracking-wider ${
            activeSubTab === "accounting"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Bookkeeping & GST
        </button>

        <button
          id="admin_tab_customers"
          onClick={() => setActiveSubTab("customers")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black font-mono transition-all border-2 border-b-0 uppercase tracking-wider ${
            activeSubTab === "customers"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          Dealers ({customers.filter(c => c.email !== "lew@desmoproducts.com.au").length})
        </button>

        <button
          id="admin_tab_products"
          onClick={() => { setActiveSubTab("products"); setSelectedCustomerId(null); }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-black font-mono transition-all border-2 border-b-0 uppercase tracking-wider ${
            activeSubTab === "products"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black hover:bg-slate-50"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Part Coordinator
        </button>
      </div>

      {/* Tab Content 1: Accounting */}
      {activeSubTab === "accounting" && (
        <div className="space-y-8" id="accounting_sub_panel">
          {/* Ranges Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 border-4 border-black rounded-none brutalist-shadow">
            <span className="text-xs font-mono text-black font-black uppercase tracking-widest">Reporting Window:</span>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn_range_30d"
                onClick={() => setDateRange("30days")}
                className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition ${
                  dateRange === "30days" ? "bg-orange-600 text-white" : "bg-white text-black"
                }`}
              >
                Last 30 Days
              </button>
              <button
                id="btn_range_3m"
                onClick={() => setDateRange("3months")}
                className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition ${
                  dateRange === "3months" ? "bg-orange-600 text-white" : "bg-white text-black"
                }`}
              >
                Last Quarter
              </button>
              <button
                id="btn_range_fy"
                onClick={() => setDateRange("fy")}
                className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition ${
                  dateRange === "fy" ? "bg-orange-600 text-white" : "bg-white text-black"
                }`}
              >
                Financial Year / Full history
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 border-4 border-black rounded-none brutalist-shadow-lg space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-black">Booked Gross Receipts:</span>
              <span className="text-3xl font-black font-mono text-black">${report.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-[10px] text-slate-700 leading-normal font-mono font-bold uppercase">
                Subtotal + GST on {report.orderCount} active wholesale invoices.
              </p>
            </div>

            <div className="bg-white p-5 border-4 border-black rounded-none brutalist-shadow-lg space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-black">Net Base Sales (ex. GST):</span>
              <span className="text-3xl font-black font-mono text-black">${report.totalSubtotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-[10px] text-slate-700 leading-normal font-mono font-bold uppercase">
                Taxable components volume before GST.
              </p>
            </div>

            <div className="bg-white p-5 border-4 border-black rounded-none brutalist-shadow-lg space-y-2 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-orange-600 text-white border-2 border-black px-2 py-0.5 text-[8px] font-black uppercase tracking-widest font-mono">
                BAS ACCRUAL
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-black">GST Liabilities (10%):</span>
              <span className="text-3xl font-black font-mono text-orange-600">${report.totalGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              <p className="text-[10px] text-slate-700 leading-normal font-mono font-bold uppercase">
                GST collected representing 1/11th of gross wholesale sales.
              </p>
            </div>
          </div>

          {/* Table of sales by customer & Month */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Customer breakdowns */}
            <div className="lg:col-span-2 bg-white border-4 border-black rounded-none p-5 space-y-4 brutalist-shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-3">
                <h3 className="text-sm font-black font-mono text-black uppercase tracking-tight">
                  Partner Customer Revenue Ledger
                </h3>
                <button
                  id="copy_bas_csv_btn"
                  onClick={handleCopyBasData}
                  className="bg-orange-600 hover:bg-orange-500 text-white border-2 border-black font-black font-mono text-[10px] py-1.5 px-3 uppercase tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center gap-1.5"
                >
                  {basCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      BAS CSV Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Bookkeeping CSV
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left font-mono font-bold">
                  <thead>
                    <tr className="border-b-2 border-black text-slate-500 uppercase text-[9px]">
                      <th className="py-2.5">Workshop Company Name</th>
                      <th className="py-2.5 text-center">Orders</th>
                      <th className="py-2.5 text-right">Net Sales (ex. GST)</th>
                      <th className="py-2.5 text-right">GST (10%)</th>
                      <th className="py-2.5 text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-black">
                    {Object.keys(report.byCustomer).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 text-xs font-mono uppercase italic font-bold">No sales recorded within selected window.</td>
                      </tr>
                    ) : (
                      Object.entries(report.byCustomer).map(([name, data], idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 font-sans font-black uppercase text-black text-xs tracking-tight">{name}</td>
                          <td className="py-3 text-center">{data.count}</td>
                          <td className="py-3 text-right">${data.subtotal.toFixed(2)}</td>
                          <td className="py-3 text-right text-slate-600">${data.gst.toFixed(2)}</td>
                          <td className="py-3 text-right font-black text-orange-600">${data.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Monthly breakdown chart (SVG visual) */}
            <div className="bg-white border-4 border-black rounded-none p-5 space-y-4 flex flex-col justify-between brutalist-shadow-lg">
              <h3 className="text-sm font-black font-mono text-black uppercase tracking-tight border-b-4 border-black pb-3">
                Monthly Invoicing
              </h3>

              {Object.keys(report.byMonth).length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 text-slate-500 text-xs font-mono uppercase italic font-bold">
                  No monthly patterns.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(report.byMonth).map(([month, data], idx) => {
                    const maxVal = Math.max(...Object.values(report.byMonth).map(m => m.total));
                    const pct = maxVal > 0 ? (data.total / maxVal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                          <span className="text-black uppercase font-black">{month}</span>
                          <span className="text-slate-600">Net: <strong className="text-black">${data.subtotal.toFixed(0)}</strong> • GST: <strong className="text-orange-600">${data.gst.toFixed(0)}</strong></span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-none overflow-hidden border-2 border-black">
                          <div 
                            className="bg-orange-600 h-full rounded-none transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 text-[9px] text-slate-500 font-mono font-bold uppercase leading-normal">
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
          <div className="lg:col-span-1 bg-white border-4 border-black rounded-none p-5 space-y-4 h-fit brutalist-shadow-lg">
            <h3 className="text-sm font-black font-mono text-black uppercase tracking-tight border-b-4 border-black pb-3">
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
                      className={`p-3.5 rounded-none border-2 transition cursor-pointer text-xs ${
                        isSelected 
                          ? "bg-orange-50 border-orange-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                          : "bg-white border-black hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-black text-black uppercase tracking-tight text-xs line-clamp-1">{customer.companyName}</h4>
                        {customer.status === "approved" ? (
                          <span className="bg-emerald-600 text-white text-[8px] font-mono uppercase px-1.5 py-0.5 border border-black font-black">Approved</span>
                        ) : customer.status === "rejected" ? (
                          <span className="bg-red-600 text-white text-[8px] font-mono uppercase px-1.5 py-0.5 border border-black font-black">Rejected</span>
                        ) : (
                          <span className="bg-orange-500 text-white text-[8px] font-mono uppercase px-1.5 py-0.5 border border-black font-black animate-pulse">Pending</span>
                        )}
                      </div>
                      <p className="text-slate-600 font-mono mt-1 text-[10px] font-bold truncate">{customer.email}</p>
                      
                      {/* Pricing / restricted counts brief info */}
                      {customer.status === "approved" && (
                        <div className="flex gap-3 text-[9px] text-slate-700 font-mono mt-2 border-t border-slate-200 pt-1.5 font-bold uppercase">
                          <span>Overrides: <strong className="text-orange-600">{Object.keys(customer.customPricing || {}).length}</strong></span>
                          <span>Parts: <strong className="text-orange-600">{customer.allowedProducts?.length || 0}</strong></span>
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
              <div className="bg-white border-4 border-black rounded-none p-12 text-center text-slate-700 text-xs font-mono font-bold uppercase tracking-wide brutalist-shadow-lg">
                Select a wholesale customer profile on the left to approve registration, define contract pricing lists, or map restricted items.
              </div>
            ) : (
              <div className="space-y-6" id="customer_detail_crm_editor">
                {/* Status & Approvals */}
                <div className="bg-white border-4 border-black rounded-none p-5 space-y-4 brutalist-shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-3">
                    <div>
                      <h3 className="text-lg font-black uppercase text-black tracking-tight">{selectedCustomer.companyName}</h3>
                      <p className="text-[10px] text-slate-600 font-mono font-black uppercase tracking-wider mt-0.5">{selectedCustomer.email} • Registered {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      {selectedCustomer.status !== "approved" && (
                        <button
                          id="crm_approve_btn"
                          onClick={() => approveCustomer(selectedCustomer.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black font-black uppercase tracking-wider text-[11px] py-1.5 px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center gap-1.5 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Partner Access
                        </button>
                      )}

                      {selectedCustomer.status !== "rejected" && (
                        <button
                          id="crm_reject_btn"
                          onClick={() => {
                            rejectCustomer(selectedCustomer.id);
                            setSelectedCustomerId(null);
                          }}
                          className="bg-white hover:bg-red-50 text-red-600 border-2 border-black font-black uppercase tracking-wider text-[11px] py-1.5 px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject / Deny
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-mono font-bold uppercase leading-normal">
                    Approved partner accounts can access wholesale portal prices and submit order drafts. Denied accounts are barred. 
                  </p>
                </div>

                {/* PricingOverrides and Products Assignment (Only for Approved users) */}
                {selectedCustomer.status === "approved" && (
                  <>
                    {/* Custom override sheet */}
                    <div className="bg-white border-4 border-black rounded-none p-5 space-y-4 brutalist-shadow-lg">
                      <h4 className="text-xs font-black font-mono text-black uppercase tracking-wider border-b-2 border-black pb-2">
                        Partner Pricing Override Sheet
                      </h4>
                      <p className="text-xs text-slate-700 font-mono font-bold uppercase leading-normal">
                        Enter customer-specific wholesale contract prices. These override baseline wholesale pricing. Leave blank or remove to default to standard wholesale.
                      </p>

                      <div className="border-2 border-black rounded-none overflow-hidden text-xs">
                        <table className="w-full text-left font-sans font-bold">
                          <thead>
                            <tr className="bg-black text-white font-mono text-[9px] uppercase border-b-2 border-black">
                              <th className="px-3 py-2.5">Component & SKU</th>
                              <th className="px-3 py-2.5 text-right">Standard Wholesale</th>
                              <th className="px-3 py-2.5 text-right w-36">Contract Override</th>
                              <th className="px-3 py-2.5 text-center w-28">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-black font-mono">
                            {products.map((p) => {
                              const hasOverride = selectedCustomer.customPricing && selectedCustomer.customPricing[p.id] !== undefined;
                              const currentOverride = hasOverride ? selectedCustomer.customPricing?.[p.id] : "";
                              
                              const valKey = `${selectedCustomer.id}_${p.id}`;
                              const inputVal = pricingInputValues[valKey] !== undefined ? pricingInputValues[valKey] : "";

                              return (
                                <tr key={p.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2.5 font-sans">
                                    <p className="font-black text-black uppercase tracking-tight text-xs">{p.name}</p>
                                    <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold">{p.sku}</p>
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-bold">${p.baseWholesalePrice.toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center bg-white border-2 border-black rounded-none p-1 w-full max-w-[120px] ml-auto">
                                      <span className="text-[10px] text-black font-bold font-mono">$</span>
                                      <input
                                        id={`crm_price_override_${selectedCustomer.id}_${p.id}`}
                                        type="number"
                                        placeholder={hasOverride ? currentOverride?.toFixed(2) : "None"}
                                        value={inputVal}
                                        onChange={(e) => setPricingInputValues(prev => ({ ...prev, [valKey]: e.target.value }))}
                                        className="w-full text-right bg-transparent border-none text-xs font-black text-black py-0 px-1 outline-none focus:ring-0"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <div className="inline-flex gap-1.5">
                                      <button
                                        id={`save_override_${selectedCustomer.id}_${p.id}`}
                                        onClick={() => handleUpdatePriceOverride(selectedCustomer.id, p.id)}
                                        className="bg-black hover:bg-slate-900 text-white font-sans font-bold p-1 border-2 border-black transition"
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
                                          className="bg-white hover:bg-slate-50 text-red-600 font-sans font-bold p-1 border-2 border-black transition"
                                          title="Remove override"
                                        >
                                          <X className="w-4 h-4 text-red-600" />
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
                    <div className="bg-white border-4 border-black rounded-none p-5 space-y-4 brutalist-shadow-lg">
                      <h4 className="text-xs font-black font-mono text-black uppercase tracking-wider border-b-2 border-black pb-2">
                        Restricted Parts Mapping Visibility
                      </h4>
                      <p className="text-xs text-slate-700 font-mono font-bold uppercase leading-normal">
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
                                className="flex items-center justify-between p-3 border-2 border-black bg-slate-50 text-xs"
                              >
                                <div className="space-y-0.5 max-w-[180px]">
                                  <p className="font-black text-black uppercase tracking-tight truncate text-xs">{p.name}</p>
                                  <p className="text-[10px] text-slate-600 font-mono font-bold truncate">{p.sku}</p>
                                </div>

                                <button
                                  id={`toggle_access_${selectedCustomer.id}_${p.id}`}
                                  onClick={() => toggleRestrictedProductAccess(selectedCustomer.id, p.id)}
                                  className={`px-3 py-1 border-2 border-black rounded-none font-mono text-[10px] font-black uppercase tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
                                    isAllowed 
                                      ? "bg-orange-600 text-white" 
                                      : "bg-white text-black"
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
                <label htmlFor="new_prod_img" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Product Image URL:</label>
                <input
                  id="new_prod_img"
                  type="text"
                  placeholder="https://..."
                  value={newProdImg}
                  onChange={(e) => setNewProdImg(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 tracking-tight text-xs">Restricted Access?</span>
                  <p className="text-[9px] text-slate-500 font-mono leading-tight uppercase font-semibold">If checked, equipment is hidden until authorized.</p>
                </div>
                <input
                  id="new_prod_restricted"
                  type="checkbox"
                  checked={newProdRestricted}
                  onChange={(e) => setNewProdRestricted(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 border border-slate-350 rounded cursor-pointer"
                />
              </div>

              {/* Quantity break rules creator */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">Add Quantity Break:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                    <span className="text-[9px] text-slate-400 font-mono px-1 font-semibold">MIN QTY:</span>
                    <input
                      id="new_prod_qb_qty"
                      type="number"
                      min="2"
                      value={newProdQbQty}
                      onChange={(e) => setNewProdQbQty(parseInt(e.target.value) || 2)}
                      className="w-full bg-transparent border-none text-xs font-bold text-slate-700 py-0 px-1 text-right outline-none focus:ring-0"
                    />
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                    <span className="text-[9px] text-slate-400 font-mono px-1 font-semibold">DISC %:</span>
                    <input
                      id="new_prod_qb_disc"
                      type="number"
                      min="1"
                      value={newProdQbDisc}
                      onChange={(e) => setNewProdQbDisc(parseInt(e.target.value) || 1)}
                      className="w-full bg-transparent border-none text-xs font-bold text-slate-700 py-0 px-1 text-right outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <button
                  id="add_qb_break_btn"
                  type="button"
                  onClick={handleAddQtyBreak}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-2 border border-slate-800 rounded-lg text-[10px] uppercase tracking-wider transition shadow-sm"
                >
                  Confirm Break Tier
                </button>

                {newProdQtyBreaks.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-3 text-[10px] font-mono font-bold text-slate-650 uppercase">
                    {newProdQtyBreaks.map((qb, i) => (
                      <div key={i} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg">
                        <span>Buy {qb.minQty}+ units gets -{qb.discountPercent}%</span>
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
              <table className="w-full text-left font-sans font-bold">
                <thead>
                  <tr className="bg-slate-50 text-slate-605 border-b border-slate-200 font-mono text-[9px] uppercase">
                    <th className="px-3 py-2.5">Equipment Details</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-right">Wholesale Price (ex. GST)</th>
                    <th className="px-3 py-2.5 text-center">Restricted</th>
                    <th className="px-3 py-2.5 text-center">Breaks</th>
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
                      <td className="px-3 py-2.5 text-right font-bold text-blue-600">${p.baseWholesalePrice.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded ${
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
