import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Product, CustomerProfile, Order, GSTReportData, QuantityBreak } from "../types";
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
  Download,
  Building,
  Upload,
  DollarSign,
  Scale,
  FileText,
  Truck,
  Pencil
} from "lucide-react";
import RateBreakProfileManager from "./RateBreakProfileManager";

export const AdminDashboard: React.FC = () => {
  const { 
    customers, 
    products, 
    orders, 
    approveCustomer, 
    rejectCustomer, 
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
    addShippingCharge,
    updateOrderDispatch,
    deleteOrder,
    companySettings,
    updateCompanySettings
  } = usePortal();

  const [activeSubTab, setActiveSubTab] = useState<"accounting" | "customers" | "products" | "company" | "quotes" | "rateBreaks">("accounting");

  // Company Settings State
  const [csForm, setCsForm] = useState({ ...companySettings });
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  const [companySettingsSaved, setCompanySettingsSaved] = useState(false);

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
  
  const [newProdQbQty, setNewProdQbQty] = useState(10);
  const [newProdQbValueType, setNewProdQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [newProdQbValue, setNewProdQbValue] = useState(5);
  const [newProdQtyBreaks, setNewProdQtyBreaks] = useState<QuantityBreak[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Product edit modal state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProdForm, setEditProdForm] = useState<Omit<Product, "id">>({
    name: "",
    sku: "",
    description: "",
    imageUrl: "placeholder",
    baseWholesalePrice: 0,
    isRestricted: false,
    autoApprove: false,
    quantityBreaks: [],
    category: "General",
    stock: 0,
    allowBackorders: true,
    colors: [],
    rateBreaks: [],
  });
  const [editProdPreviewUrl, setEditProdPreviewUrl] = useState<string | null>(null);
  const [editProdQbQty, setEditProdQbQty] = useState(10);
  const [editProdQbValueType, setEditProdQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [editProdQbValue, setEditProdQbValue] = useState(5);
  const [editProdColorInput, setEditProdColorInput] = useState("");
  const [isSavingEditedProduct, setIsSavingEditedProduct] = useState(false);

  // Product edit modal rate breaks states
  const [selectedRateBreakIndex, setSelectedRateBreakIndex] = useState<number | null>(null);
  const [rateBreakName, setRateBreakName] = useState("");
  const [rateBreakQbQty, setRateBreakQbQty] = useState(10);
  const [rateBreakQbValueType, setRateBreakQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [rateBreakQbValue, setRateBreakQbValue] = useState(5);
  const [rateBreakQuantityBreaks, setRateBreakQuantityBreaks] = useState<QuantityBreak[]>([]);

  // Preview loaded local files
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Quote shipping / finalization state
  const [quoteShippingOrderId, setQuoteShippingOrderId] = useState<string | null>(null);
  const [quoteShippingCost, setQuoteShippingCost] = useState("");
  const [quoteShippingMethod, setQuoteShippingMethod] = useState("Standard Freight");
  const [quoteShippingNotes, setQuoteShippingNotes] = useState("");
  const [quoteShippingSubmitting, setQuoteShippingSubmitting] = useState(false);

  // Invoice deletion by reference state
  const [deleteInvoiceRef, setDeleteInvoiceRef] = useState("");
  const [deleteInvoiceConfirm, setDeleteInvoiceConfirm] = useState("");
  const [deleteInvoiceSubmitting, setDeleteInvoiceSubmitting] = useState(false);

  // Feedback states
  const [pricingInputValues, setPricingInputValues] = useState<{ [customerId_productId: string]: string }>({});
  const [basCopied, setBasCopied] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const invoiceToDelete = orders.find(order => order.id.toLowerCase() === deleteInvoiceRef.trim().toLowerCase());

  // Compute accounting metrics based on date range
  const getFilteredOrders = (): Order[] => {
    const now = new Date();
    return orders.filter(order => {
      // ONLY include confirmed orders (approved, paid, shipped)
      if (
        order.status === "pending_approval" || 
        order.status === "declined" || 
        order.status === "cancelled" ||
        order.status === "quote_requested" ||
        order.status === "quote_finalized"
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

  const openEditProductModal = (product: Product) => {
    setEditingProductId(product.id);
    setEditProdForm({
      name: product.name,
      sku: product.sku,
      description: product.description,
      imageUrl: product.imageUrl,
      baseWholesalePrice: product.baseWholesalePrice,
      isRestricted: product.isRestricted,
      autoApprove: product.autoApprove ?? false,
      quantityBreaks: product.quantityBreaks ? [...product.quantityBreaks] : [],
      category: product.category || "General",
      stock: product.stock ?? 0,
      allowBackorders: product.allowBackorders ?? true,
      colors: product.colors ? [...product.colors] : [],
      rateBreaks: product.rateBreaks ? [...product.rateBreaks] : [],
    });
    setEditProdPreviewUrl(product.imageUrl && product.imageUrl !== "placeholder" ? product.imageUrl : null);
    setEditProdQbQty(10);
    setEditProdQbValueType("percentage");
    setEditProdQbValue(5);
    setEditProdColorInput("");
    setSelectedRateBreakIndex(null);
    setRateBreakName("");
    setRateBreakQuantityBreaks([]);
    setIsEditingProduct(true);
  };

  const closeEditProductModal = () => {
    setIsEditingProduct(false);
    setEditingProductId(null);
    setEditProdForm({
      name: "",
      sku: "",
      description: "",
      imageUrl: "placeholder",
      baseWholesalePrice: 0,
      isRestricted: false,
      autoApprove: false,
      quantityBreaks: [],
      category: "General",
      stock: 0,
      allowBackorders: true,
      colors: [],
      rateBreaks: [],
    });
    setEditProdPreviewUrl(null);
    setEditProdQbQty(10);
    setEditProdQbValueType("percentage");
    setEditProdQbValue(5);
    setEditProdColorInput("");
    setSelectedRateBreakIndex(null);
    setRateBreakName("");
    setRateBreakQuantityBreaks([]);
    setIsSavingEditedProduct(false);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setEditProdForm(prev => ({ ...prev, imageUrl: result }));
      setEditProdPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddEditQtyBreak = () => {
    if (editProdQbQty <= 1 || editProdQbValue < 0) return;
    setEditProdForm(prev => ({
      ...prev,
      quantityBreaks: [...(prev.quantityBreaks || []), {
        minQty: editProdQbQty,
        discountType: editProdQbValueType,
        discountValue: editProdQbValue,
      }].sort((a, b) => a.minQty - b.minQty)
    }));
    setEditProdQbQty(10);
    setEditProdQbValue(5);
  };

  const handleRemoveEditQtyBreak = (index: number) => {
    setEditProdForm(prev => ({
      ...prev,
      quantityBreaks: (prev.quantityBreaks || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddEditColor = () => {
    const nextColor = editProdColorInput.trim();
    if (!nextColor) return;
    setEditProdForm(prev => ({
      ...prev,
      colors: Array.from(new Set([...(prev.colors || []), nextColor]))
    }));
    setEditProdColorInput("");
  };

  const handleRemoveEditColor = (color: string) => {
    setEditProdForm(prev => ({
      ...prev,
      colors: (prev.colors || []).filter(existing => existing !== color)
    }));
  };

  const handleSaveEditedProduct = async () => {
    if (!editingProductId) return;
    if (!editProdForm.name.trim() || !editProdForm.sku.trim()) return;

    setIsSavingEditedProduct(true);
    try {
      await updateProduct(editingProductId, {
        ...editProdForm,
        quantityBreaks: editProdForm.quantityBreaks && editProdForm.quantityBreaks.length > 0 ? [...editProdForm.quantityBreaks] : [],
        colors: editProdForm.colors && editProdForm.colors.length > 0 ? [...editProdForm.colors] : [],
        rateBreaks: editProdForm.rateBreaks && editProdForm.rateBreaks.length > 0 ? [...editProdForm.rateBreaks] : [],
      });
      closeEditProductModal();
    } finally {
      setIsSavingEditedProduct(false);
    }
  };

  const handleAddRateBreakQtyBreak = () => {
    setRateBreakQuantityBreaks(prev => [
      ...prev,
      {
        minQty: rateBreakQbQty,
        discountType: rateBreakQbValueType,
        discountValue: rateBreakQbValue
      }
    ].sort((a, b) => a.minQty - b.minQty));
    setRateBreakQbQty(10);
    setRateBreakQbValue(5);
  };

  const handleRemoveRateBreakQtyBreak = (idx: number) => {
    setRateBreakQuantityBreaks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRateBreak = () => {
    if (!rateBreakName.trim()) return;
    const updatedRateBreaks = [...(editProdForm.rateBreaks || [])];
    const newRateBreak = {
      id: selectedRateBreakIndex === -1 ? `prb_${Math.random().toString(36).substr(2, 9)}` : (updatedRateBreaks[selectedRateBreakIndex!]?.id || `prb_${Math.random().toString(36).substr(2, 9)}`),
      name: rateBreakName,
      quantityBreaks: rateBreakQuantityBreaks
    };

    if (selectedRateBreakIndex === -1) {
      updatedRateBreaks.push(newRateBreak);
    } else if (selectedRateBreakIndex !== null) {
      updatedRateBreaks[selectedRateBreakIndex] = newRateBreak;
    }

    setEditProdForm(prev => ({
      ...prev,
      rateBreaks: updatedRateBreaks
    }));
    setSelectedRateBreakIndex(null);
    setRateBreakName("");
    setRateBreakQuantityBreaks([]);
  };

  const handleDeleteRateBreak = (index: number) => {
    setEditProdForm(prev => ({
      ...prev,
      rateBreaks: (prev.rateBreaks || []).filter((_, i) => i !== index)
    }));
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

  const handleFinalizeQuote = async () => {
    if (!quoteShippingOrderId || !quoteShippingCost) return;
    const shipping = parseFloat(quoteShippingCost);
    if (Number.isNaN(shipping) || shipping < 0) return;

    setQuoteShippingSubmitting(true);
    try {
      await addShippingCharge(quoteShippingOrderId, shipping);
      await updateOrderDispatch(quoteShippingOrderId, {
        freightCompany: quoteShippingMethod,
        consignmentNote: quoteShippingNotes,
        packingStatus: "Hold"
      });
      setQuoteShippingOrderId(null);
      setQuoteShippingCost("");
      setQuoteShippingNotes("");
    } finally {
      setQuoteShippingSubmitting(false);
    }
  };

  const handleDeleteInvoiceByReference = async () => {
    if (!invoiceToDelete) return;
    if (deleteInvoiceConfirm.trim().toUpperCase() !== "DELETE") return;

    setDeleteInvoiceSubmitting(true);
    try {
      await deleteOrder(invoiceToDelete.id);
      setDeleteInvoiceRef("");
      setDeleteInvoiceConfirm("");
    } finally {
      setDeleteInvoiceSubmitting(false);
    }
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
        {(["accounting", "company", "customers", "products", "quotes", "rateBreaks"] as const).map((tab) => {
          const label = tab === "accounting" 
            ? "Bookkeeping & GST" 
            : tab === "company"
              ? "Company Details"
              : tab === "customers" 
                ? `Customers (${customers.filter(c => !["lew@desmoproducts.com.au", "1@1.com"].includes(c.email)).length})` 
                : tab === "products"
                  ? "Products"
                  : tab === "quotes"
                    ? `Quotes (${orders.filter(o => o.documentType === "QUOTE").length})`
                    : "Rate Break Profiles";
          const icon = tab === "accounting" 
            ? <TrendingUp className="w-4 h-4" /> 
            : tab === "company"
              ? <Building className="w-4 h-4" />
              : tab === "customers" 
                ? <Users className="w-4 h-4" /> 
                : tab === "products"
                  ? <Wrench className="w-4 h-4" />
                  : tab === "quotes"
                    ? <FileText className="w-4 h-4" />
                    : <DollarSign className="w-4 h-4" />;
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

          {/* Invoice deletion safeguard */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-rose-200 pb-4">
              <div>
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Delete Invoice / Quote by Number</h3>
                <p className="text-xs text-rose-700 mt-1">Type the exact invoice number to look it up, then confirm with the word DELETE. This removes the document from the Master Wholesale Ledger, including shipped documents.</p>
              </div>
              <Shield className="w-8 h-8 text-rose-700 flex-shrink-0" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-rose-700 uppercase font-semibold">Invoice / Quote Number</label>
                <input
                  type="text"
                  value={deleteInvoiceRef}
                  onChange={(e) => {
                    setDeleteInvoiceRef(e.target.value);
                    setDeleteInvoiceConfirm("");
                  }}
                  placeholder="e.g. INV-1003 or QTE-1234"
                  className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-rose-700 uppercase font-semibold">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteInvoiceConfirm}
                  onChange={(e) => setDeleteInvoiceConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={handleDeleteInvoiceByReference}
                disabled={!invoiceToDelete || deleteInvoiceConfirm.trim().toUpperCase() !== "DELETE" || deleteInvoiceSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg px-4 py-3 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteInvoiceSubmitting ? "Deleting..." : "Delete from Ledger"}
              </button>
            </div>

            {deleteInvoiceRef.trim() !== "" && (
              <div className="bg-white border border-rose-200 rounded-lg p-4 text-xs text-slate-700 space-y-2">
                {invoiceToDelete ? (
                  <>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold text-slate-900">{invoiceToDelete.id}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${invoiceToDelete.status === "shipped" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {invoiceToDelete.documentType === "QUOTE" ? "Quote" : "Invoice"}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${invoiceToDelete.status === "shipped" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                        {invoiceToDelete.status}
                      </span>
                    </div>
                    <p><strong>Company:</strong> {invoiceToDelete.companyName}</p>
                    <p><strong>Total:</strong> ${invoiceToDelete.totalAmount.toFixed(2)}</p>
                    <p><strong>Created:</strong> {new Date(invoiceToDelete.createdAt).toLocaleDateString('en-AU')}</p>
                    <p className="text-rose-700 font-semibold">This document can be removed once you type DELETE and click the button.</p>
                  </>
                ) : (
                  <p className="text-slate-500">No matching invoice or quote found in the ledger.</p>
                )}
              </div>
            )}
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

      {/* Tab Content: Company Details */}
      {activeSubTab === "company" && (
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm space-y-6" id="company_settings_panel">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Identity & Settings</h3>
              <p className="text-xs text-slate-500 uppercase font-mono mt-1">Configure invoice branding, bank details, and notification defaults.</p>
            </div>
            <button
              onClick={async () => {
                setIsSavingCompanySettings(true);
                try {
                  await updateCompanySettings(csForm);
                  setCompanySettingsSaved(true);
                  setTimeout(() => setCompanySettingsSaved(false), 3000);
                } finally {
                  setIsSavingCompanySettings(false);
                }
              }}
              disabled={isSavingCompanySettings}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {isSavingCompanySettings ? "Saving..." : companySettingsSaved ? <><Check className="w-4 h-4"/> Saved</> : "Save Settings"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase font-mono mb-4 text-blue-600">Company Information</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Trading Name</label>
                <input
                  type="text"
                  value={csForm.tradingName}
                  onChange={(e) => setCsForm(prev => ({ ...prev, tradingName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Legal Company Name</label>
                <input
                  type="text"
                  value={csForm.companyName}
                  onChange={(e) => setCsForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">ABN</label>
                <input
                  type="text"
                  value={csForm.abn}
                  onChange={(e) => setCsForm(prev => ({ ...prev, abn: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Address</label>
                <input
                  type="text"
                  value={csForm.address}
                  onChange={(e) => setCsForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Contact Email</label>
                <input
                  type="email"
                  value={csForm.email}
                  onChange={(e) => setCsForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Company Logo</label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setCsForm(prev => ({ ...prev, logoBase64: event.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Upload Logo"
                      />
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium flex items-center justify-center gap-2 hover:bg-slate-100 transition cursor-pointer">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-600">Click to upload logo (PNG/JPG)</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={csForm.logoBase64 || ""}
                      onChange={(e) => setCsForm(prev => ({ ...prev, logoBase64: e.target.value }))}
                      placeholder="...or paste Base64 / URL directly"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] text-slate-800 font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                  {csForm.logoBase64 && (
                    <div className="w-16 h-16 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 bg-white flex items-center justify-center p-1">
                      <img src={csForm.logoBase64} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase font-mono mb-4 text-emerald-600">Banking & Terms</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Payment Terms</label>
                <input
                  type="text"
                  value={csForm.paymentTerms}
                  onChange={(e) => setCsForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Bank Name</label>
                <input
                  type="text"
                  value={csForm.bankName}
                  onChange={(e) => setCsForm(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">BSB Number</label>
                  <input
                    type="text"
                    value={csForm.bsb}
                    onChange={(e) => setCsForm(prev => ({ ...prev, bsb: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Account Number</label>
                  <input
                    type="text"
                    value={csForm.accountNo}
                    onChange={(e) => setCsForm(prev => ({ ...prev, accountNo: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Account Name</label>
                <input
                  type="text"
                  value={csForm.accountName}
                  onChange={(e) => setCsForm(prev => ({ ...prev, accountName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none"
                />
              </div>

              <h4 className="text-sm font-bold text-slate-800 uppercase font-mono mb-4 text-purple-600 pt-4 border-t border-slate-100">Customer Messaging</h4>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Pending Order Notification Message</label>
                <textarea
                  value={csForm.orderPendingMessage}
                  onChange={(e) => setCsForm(prev => ({ ...prev, orderPendingMessage: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 outline-none min-h-[100px]"
                />
                <p className="text-[10px] text-slate-400">This message is displayed to customers immediately after they submit a new wholesale order.</p>
              </div>
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
                .filter(c => !["lew@desmoproducts.com.au", "1@1.com"].includes(c.email))
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

                {/* Rate Break Profile Assignment (Only for Approved users) */}
                {selectedCustomer.status === "approved" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Rate Break Profile Assignment
                    </h4>
                    <p className="text-xs text-slate-500 leading-normal">
                      Assign a rate break profile to apply quantity-based discounts to this customer. The profile will determine product-specific quantity breaks.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
                        Select Rate Break Profile
                      </label>
                      <select
                        id={`rate_break_profile_${selectedCustomer.id}`}
                        value={selectedCustomer.rateBreakProfileId || ""}
                        onChange={(e) => {
                          const profileId = e.target.value || undefined;
                          // This would need to be implemented in your context/backend
                          console.log(`Assigning rate break profile ${profileId} to customer ${selectedCustomer.id}`);
                          alert(`Rate break profile assignment feature requires backend integration. Selected: ${profileId || "None"}`);
                        }}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition text-xs"
                      >
                        <option value="">No Rate Break Profile</option>
                        <option value="rbp-wholesale" disabled>Wholesale Partner (Create in Rate Break Profiles tab)</option>
                        <option value="rbp-vip" disabled>VIP Partner (Create in Rate Break Profiles tab)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 italic">
                        📝 Note: Create rate break profiles in the "Rate Break Profiles" admin tab first, then they'll appear here.
                      </p>
                    </div>
                  </div>
                )}

                {/* Rate Break Assignment (Only for Approved users) */}
                {selectedCustomer.status === "approved" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Rate Break Assignments (Per Product)
                    </h4>
                    <p className="text-xs text-slate-500 leading-normal">
                      Align this customer to a specific rate break template defined on each product.
                      If "No Rate Break" is selected, the customer will pay the standard product price.
                    </p>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {products.map((product) => {
                        const alignedBreakId = selectedCustomer.productRateBreakAlignments?.[product.id] || "";
                        const availableBreaks = product.rateBreaks || [];
                        return (
                          <div key={product.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-semibold text-xs text-slate-800 uppercase tracking-tight">{product.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{product.sku}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={alignedBreakId}
                                onChange={(e) => {
                                  updateProductRateBreakAlignment(selectedCustomer.id, product.id, e.target.value || null);
                                }}
                                className="bg-white border border-slate-250 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition min-w-[200px]"
                              >
                                <option value="">Standard Price (No Rate Break)</option>
                                {availableBreaks.map((rb) => (
                                  <option key={rb.id} value={rb.id}>
                                    {rb.name} ({rb.quantityBreaks.length} tiers)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition inline-flex items-center justify-center"
                            title="Edit Product"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Quotes */}
      {activeSubTab === "quotes" && (
        <div className="space-y-6" id="admin_quotes_panel">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Quote Requests</h3>
              <p className="text-xs text-slate-500 uppercase font-mono mt-1">Finalize freight and release quote documents for customer approval.</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Quote ID</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.filter(o => o.documentType === "QUOTE").map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{order.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${order.status === "quote_finalized" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {order.status === "quote_finalized" ? "Finalized" : "Needs Shipping"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">${order.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setQuoteShippingOrderId(order.id);
                            setQuoteShippingCost(order.shippingCharge?.toFixed(2) || "");
                            setQuoteShippingMethod(order.freightCompany || "Standard Freight");
                            setQuoteShippingNotes(order.consignmentNote || "");
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Add Shipping
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

      {/* Tab Content: Rate Break Profiles */}
      {activeSubTab === "rateBreaks" && (
        <RateBreakProfileManager />
      )}



      {quoteShippingOrderId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setQuoteShippingOrderId(null)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-6 w-full max-w-md mx-4 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Finalize Quote</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">Shipping Amount (AUD ex. GST)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quoteShippingCost}
                onChange={(e) => setQuoteShippingCost(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono"
                placeholder="25.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">Shipping Method</label>
              <select
                value={quoteShippingMethod}
                onChange={(e) => setQuoteShippingMethod(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono"
              >
                <option>Standard Freight</option>
                <option>Express Freight</option>
                <option>Courier</option>
                <option>Pallet Delivery</option>
                <option>Own Transport (Pickup)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">Consignment Note / Notes</label>
              <textarea
                value={quoteShippingNotes}
                onChange={(e) => setQuoteShippingNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono h-20"
                placeholder="Estimated 2-3 business days..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setQuoteShippingOrderId(null)}
                className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeQuote}
                disabled={quoteShippingSubmitting || !quoteShippingCost || parseFloat(quoteShippingCost) < 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm disabled:opacity-50"
              >
                {quoteShippingSubmitting ? "Saving..." : "Finalize Quote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeEditProductModal}>
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Product</h3>
                <p className="text-xs text-slate-500 uppercase font-mono mt-1">Update all product fields in one place</p>
              </div>
              <button
                onClick={closeEditProductModal}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Product Name</label>
                      <input value={editProdForm.name} onChange={(e) => setEditProdForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">SKU</label>
                      <input value={editProdForm.sku} onChange={(e) => setEditProdForm(prev => ({ ...prev, sku: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Description</label>
                    <textarea value={editProdForm.description} onChange={(e) => setEditProdForm(prev => ({ ...prev, description: e.target.value }))} className="w-full min-h-28 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Base Wholesale Price</label>
                      <input type="number" min="0" step="0.01" value={editProdForm.baseWholesalePrice} onChange={(e) => setEditProdForm(prev => ({ ...prev, baseWholesalePrice: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Stock</label>
                      <input type="number" min="0" value={editProdForm.stock ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, stock: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Category</label>
                      <input value={editProdForm.category || ""} onChange={(e) => setEditProdForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Image</label>
                    <div className="flex flex-col md:flex-row gap-3 md:items-start">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium flex items-center justify-center gap-2 hover:bg-slate-100 transition cursor-pointer">
                            <Upload className="w-4 h-4 text-blue-600" />
                            <span className="text-slate-600">Upload image</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={editProdForm.imageUrl}
                          onChange={(e) => {
                            setEditProdForm(prev => ({ ...prev, imageUrl: e.target.value }));
                            setEditProdPreviewUrl(e.target.value);
                          }}
                          placeholder="Paste image URL or base64 data"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="w-28 h-28 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                        {editProdPreviewUrl && editProdPreviewUrl !== "placeholder" ? (
                          <img src={editProdPreviewUrl} alt="Product preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono uppercase text-center px-2">No image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Switches</p>
                    <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                      Restricted
                      <input type="checkbox" checked={editProdForm.isRestricted} onChange={(e) => setEditProdForm(prev => ({ ...prev, isRestricted: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                      Auto Approve
                      <input type="checkbox" checked={editProdForm.autoApprove ?? false} onChange={(e) => setEditProdForm(prev => ({ ...prev, autoApprove: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                      Allow Backorders
                      <input type="checkbox" checked={editProdForm.allowBackorders ?? true} onChange={(e) => setEditProdForm(prev => ({ ...prev, allowBackorders: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                    </label>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Colors</p>
                    <div className="flex gap-2">
                      <input
                        value={editProdColorInput}
                        onChange={(e) => setEditProdColorInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddEditColor();
                          }
                        }}
                        placeholder="Add color"
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <button type="button" onClick={handleAddEditColor} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(editProdForm.colors || []).length === 0 ? (
                        <span className="text-[10px] text-slate-400 font-mono uppercase">No colors set</span>
                      ) : (editProdForm.colors || []).map((color) => (
                        <button key={color} type="button" onClick={() => handleRemoveEditColor(color)} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:border-red-300 hover:text-red-700">
                          {color} ×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Quantity Breaks</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input type="number" min="2" value={editProdQbQty} onChange={(e) => setEditProdQbQty(Math.max(2, parseInt(e.target.value) || 2))} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500" />
                    <select value={editProdQbValueType} onChange={(e) => setEditProdQbValueType(e.target.value as "percentage" | "fixed")} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500">
                      <option value="percentage">% Off</option>
                      <option value="fixed">Fixed $</option>
                    </select>
                    <input type="number" min="0" step="0.01" value={editProdQbValue} onChange={(e) => setEditProdQbValue(Math.max(0, parseFloat(e.target.value) || 0))} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500" />
                    <button type="button" onClick={handleAddEditQtyBreak} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase">Add</button>
                  </div>
                  <div className="space-y-2">
                    {(editProdForm.quantityBreaks || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-mono uppercase">No quantity breaks set</p>
                    ) : (editProdForm.quantityBreaks || []).map((qb, index) => (
                      <div key={`${qb.minQty}-${index}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono">
                        <span>Qty {qb.minQty}+ {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off</span>
                        <button type="button" onClick={() => handleRemoveEditQtyBreak(index)} className="text-red-600 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-500 uppercase text-[10px] font-semibold">Category</p>
                      <p className="text-slate-800 font-bold mt-1">{editProdForm.category || "General"}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-500 uppercase text-[10px] font-semibold">Image Source</p>
                      <p className="text-slate-800 font-bold mt-1 truncate">{editProdForm.imageUrl ? "Set" : "None"}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-500 uppercase text-[10px] font-semibold">Backorders</p>
                      <p className="text-slate-800 font-bold mt-1">{editProdForm.allowBackorders ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="text-slate-500 uppercase text-[10px] font-semibold">Qty Breaks</p>
                      <p className="text-slate-800 font-bold mt-1">{editProdForm.quantityBreaks?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Breaks Editor Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider">Product-Specific Rate Breaks (Max 6)</p>
                  {selectedRateBreakIndex === null && (
                    <button
                      type="button"
                      disabled={(editProdForm.rateBreaks || []).length >= 6}
                      onClick={() => {
                        setSelectedRateBreakIndex(-1);
                        setRateBreakName("");
                        setRateBreakQuantityBreaks([]);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                      + Add Rate Break
                    </button>
                  )}
                </div>

                {selectedRateBreakIndex !== null ? (
                  <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        {selectedRateBreakIndex === -1 ? "New Custom Rate Break" : `Editing Rate Break #${selectedRateBreakIndex + 1}`}
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Rate Break Name</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP Tier 1"
                        value={rateBreakName}
                        onChange={(e) => setRateBreakName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Add Quantity Break Tier</label>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="number"
                          min="2"
                          value={rateBreakQbQty}
                          onChange={(e) => setRateBreakQbQty(Math.max(2, parseInt(e.target.value) || 2))}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                          placeholder="Min Qty"
                        />
                        <select
                          value={rateBreakQbValueType}
                          onChange={(e) => setRateBreakQbValueType(e.target.value as "percentage" | "fixed")}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                        >
                          <option value="percentage">% Off</option>
                          <option value="fixed">Fixed $</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rateBreakQbValue}
                          onChange={(e) => setRateBreakQbValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={handleAddRateBreakQtyBreak}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase"
                        >
                          Add Tier
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {rateBreakQuantityBreaks.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-mono uppercase">No quantity breaks added yet</p>
                      ) : (
                        rateBreakQuantityBreaks.map((qb, index) => (
                          <div key={`${qb.minQty}-${index}`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono">
                            <span>Qty {qb.minQty}+ {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRateBreakQtyBreak(index)}
                              className="text-red-600 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedRateBreakIndex(null)}
                        className="px-3 py-1.5 rounded border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRateBreak}
                        disabled={!rateBreakName.trim()}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 font-mono"
                      >
                        Save Rate Break
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(editProdForm.rateBreaks || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-mono uppercase py-2">No product-specific rate breaks configured</p>
                    ) : (
                      (editProdForm.rateBreaks || []).map((rb, index) => (
                        <div key={rb.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs font-mono">
                          <div>
                            <p className="font-bold text-slate-800">{rb.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{rb.quantityBreaks.length} quantity breaks</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRateBreakIndex(index);
                                setRateBreakName(rb.name);
                                setRateBreakQuantityBreaks(rb.quantityBreaks ? [...rb.quantityBreaks] : []);
                              }}
                              className="text-blue-600 font-bold hover:underline"
                            >
                              EDIT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRateBreak(index)}
                              className="text-red-650 font-bold hover:underline"
                            >
                              DELETE
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={closeEditProductModal} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveEditedProduct} disabled={isSavingEditedProduct || !editProdForm.name.trim() || !editProdForm.sku.trim()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50">
                  {isSavingEditedProduct ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
