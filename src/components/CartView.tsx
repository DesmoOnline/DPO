import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Trash2, ShoppingCart, ShoppingBag, ArrowRight, FileText, CheckCircle, Users, UserPlus, Truck } from "lucide-react";
import { ProductPlaceholderImage } from "./ProductPlaceholderImage";

interface CartViewProps {
  onOrderCompleted: (orderId: string) => void;
  onNavigateToCatalog: () => void;
}

export const CartView: React.FC<CartViewProps> = ({ onOrderCompleted, onNavigateToCatalog }) => {
  const { 
    cart, 
    currentUser, 
    updateCartQty, 
    removeFromCart, 
    placeOrder,
    isActualAdmin,
    customers
  } = usePortal();

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownTransport, setOwnTransport] = useState(false);

  // Admin on-behalf-of state
  const [orderForMode, setOrderForMode] = useState<"self" | "registered" | "manual">("self");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCompany, setManualCompany] = useState("");

  // Approved customers for the dropdown (exclude the admin themselves)
  const approvedCustomers = customers.filter(
    c => c.status === "approved" && c.id !== currentUser?.id
  );

  if (!currentUser || (!isActualAdmin && currentUser.status !== "approved")) {
    return (
      <div className="bg-white border border-slate-200 p-10 text-center shadow-sm rounded-xl" id="cart_unauthorized">
        <ShoppingCart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-slate-800 font-bold text-xl tracking-tight">Access Denied</h3>
        <p className="text-slate-500 text-xs mt-2 uppercase font-mono font-semibold tracking-wide">Only approved wholesale customers can access the shopping cart.</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 shadow-sm rounded-xl" id="cart_empty">
        <ShoppingBag className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce" />
        <h3 className="text-slate-850 font-bold text-lg tracking-tight">Wholesale Cart is Empty</h3>
        <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto leading-relaxed font-semibold">
          Add precision multimeters, safety compliance testers, digital oscilloscopes, or high-voltage diagnostics equipment from the catalog to build your order list.
        </p>
        <button 
          onClick={onNavigateToCatalog} 
          className="mt-6 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wider transition rounded-lg py-3 px-6 shadow-sm"
        >
          Browse Equipment Catalog
        </button>
      </div>
    );
  }

  // Calculate cart metrics matching placeOrder formulas to ensure visual fidelity
  const processedItems = cart.map(item => {
    const prod = item.product;
    const originalPrice = (currentUser.customPricing && currentUser.customPricing[prod.id] !== undefined)
      ? currentUser.customPricing[prod.id]
      : prod.baseWholesalePrice;
    
    let discountPercent = 0;
    let finalPricePerUnit = originalPrice;
    let isFixedDiscount = false;

    if (prod.quantityBreaks && prod.quantityBreaks.length > 0) {
      const matchedBreak = [...prod.quantityBreaks]
        .sort((a,b) => b.minQty - a.minQty)
        .find(qb => item.qty >= qb.minQty);
      if (matchedBreak) {
        if (matchedBreak.discountType === "fixed") {
          finalPricePerUnit = matchedBreak.discountValue;
          isFixedDiscount = true;
        } else if (matchedBreak.discountType === "percentage") {
          discountPercent = matchedBreak.discountValue;
          finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
        } else if (matchedBreak.discountPercent !== undefined) {
          discountPercent = matchedBreak.discountPercent;
          finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
        }
      }
    }

    const totalLineAmount = Number((finalPricePerUnit * item.qty).toFixed(2));

    return {
      product: prod,
      qty: item.qty,
      originalPrice,
      discountPercent,
      isFixedDiscount,
      finalPricePerUnit,
      totalLineAmount,
      selectedColors: item.selectedColors
    };
  });

  const subtotal = Number(processedItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
  const gstAmount = Number((subtotal * 0.10).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  // Build the onBehalfOf parameter for admin orders
  const getOnBehalfOf = () => {
    if (!isActualAdmin || orderForMode === "self") return undefined;

    if (orderForMode === "registered" && selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (!cust) return undefined;
      return {
        customerId: cust.id,
        customerEmail: cust.email,
        companyName: cust.companyName,
        customPricing: cust.customPricing
      };
    }

    if (orderForMode === "manual" && manualEmail.trim() && manualCompany.trim()) {
      return {
        customerId: `walk-in-${Date.now()}`,
        customerEmail: manualEmail.trim(),
        companyName: manualCompany.trim()
      };
    }

    return undefined;
  };

  const canSubmit = () => {
    if (!isActualAdmin) return true;
    if (orderForMode === "self") return true;
    if (orderForMode === "registered") return !!selectedCustomerId;
    if (orderForMode === "manual") return !!(manualEmail.trim() && manualCompany.trim());
    return false;
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const onBehalfOf = getOnBehalfOf();
      const order = await placeOrder(notes, onBehalfOf, ownTransport);
      onOrderCompleted(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place wholesale order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8" id="cart_view_container">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review Wholesale Order</h2>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Verify quantities, contract pricing rates, and quantity breaks prior to submission.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 overflow-hidden shadow-sm rounded-xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
              <span>Wholesale Instruments ({cart.length})</span>
              <span>Quantities & Tier pricing</span>
            </div>

            <div className="divide-y divide-slate-100">
              {processedItems.map((item, idx) => (
                <div key={item.product.id + "-" + idx} id={`cart_item_${item.product.id}`} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition">
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 rounded-lg">
                      {item.product.imageUrl && (item.product.imageUrl.startsWith("data:") || item.product.imageUrl.startsWith("http")) ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" />
                      ) : (
                        <ProductPlaceholderImage name={item.product.name} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono font-semibold uppercase mt-0.5">SKU: {item.product.sku}</p>
                      {item.selectedColors && item.selectedColors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.selectedColors.map(c => (
                            <span key={c} className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Qty & Price */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg shadow-sm">
                      <button
                        className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition text-sm font-bold"
                        onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                      >−</button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-transparent border-none text-xs font-semibold text-slate-700 py-1.5 outline-none focus:ring-0 font-mono"
                      />
                      <button
                        className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition text-sm font-bold"
                        onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                      >+</button>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase block">
                        ${item.finalPricePerUnit.toFixed(2)} /ea
                      </span>
                      {(item.discountPercent > 0 || item.isFixedDiscount) && (
                        <span className="text-[9px] font-mono text-emerald-600 font-semibold uppercase block">
                          {item.isFixedDiscount ? "Fixed Rate" : `${item.discountPercent}% Break`}
                        </span>
                      )}
                      <span className="text-blue-600 text-xs font-bold block mt-0.5">
                        ${item.totalLineAmount.toFixed(2)} AUD
                      </span>
                    </div>

                    {/* Delete button */}
                    <button 
                      id={`cart_item_delete_${item.product.id}`}
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-650 hover:border-red-200 transition rounded-lg shadow-sm"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Billing Guidelines notes */}
          <div className="bg-slate-50 border border-slate-200 p-6 space-y-3 rounded-xl shadow-sm">
            <label htmlFor="order_notes" className="text-xs font-bold text-slate-700 font-mono uppercase tracking-widest block">
              Shipping & Custom Delivery Notes (Optional):
            </label>
            <textarea
              id="order_notes"
              placeholder="E.g., Please drop at back loading dock, require tail lift delivery, or reference purchase order code PO-992..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition min-h-[90px] font-medium"
            />

            {/* Own Transport Checkbox */}
            <div className="flex items-center gap-3 mt-4 bg-white border border-slate-200 rounded-lg p-3">
              <input
                id="own_transport_chk"
                type="checkbox"
                checked={ownTransport}
                onChange={(e) => setOwnTransport(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="own_transport_chk" className="flex items-center gap-2 cursor-pointer select-none">
                <Truck className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Own Transport</span>
                <span className="text-[10px] text-slate-500 font-medium">— Customer will arrange their own pickup / delivery</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Summary */}
        <div className="space-y-4">
          {/* Admin: Order For selector */}
          {isActualAdmin && (
            <div className="bg-white border border-blue-200 p-5 space-y-4 shadow-sm rounded-xl" id="admin_order_for_panel">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">Place Order For</h3>
              </div>

              {/* Mode selector tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                {([
                  { value: "self" as const, label: "Myself" },
                  { value: "registered" as const, label: "Customer" },
                  { value: "manual" as const, label: "New Contact" }
                ]).map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setOrderForMode(tab.value)}
                    className={`text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition ${
                      orderForMode === tab.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Self mode info */}
              {orderForMode === "self" && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] font-mono text-slate-600">
                  Order will be placed under <strong>{currentUser.companyName}</strong> ({currentUser.email})
                </div>
              )}

              {/* Registered customer dropdown */}
              {orderForMode === "registered" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">Select Approved Customer:</label>
                  <select
                    id="admin_customer_select"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  >
                    <option value="">— Choose a customer —</option>
                    {approvedCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.email})
                      </option>
                    ))}
                  </select>
                  {selectedCustomerId && (() => {
                    const sc = customers.find(c => c.id === selectedCustomerId);
                    return sc ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] font-mono text-blue-800 space-y-0.5">
                        <p><strong>Company:</strong> {sc.companyName}</p>
                        <p><strong>Email:</strong> {sc.email}</p>
                        <p><strong>Status:</strong> <span className="text-emerald-700">{sc.status}</span></p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Manual entry for non-registered */}
              {orderForMode === "manual" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold uppercase font-mono">
                    <UserPlus className="w-3.5 h-3.5" />
                    Enter customer details manually
                  </div>
                  <input
                    id="manual_company"
                    type="text"
                    placeholder="Company / Contact Name *"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
                  />
                  <input
                    id="manual_email"
                    type="email"
                    placeholder="Email Address *"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
                  />
                  <input
                    id="manual_name"
                    type="text"
                    placeholder="Contact Person Name (Optional)"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
                  />
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-slate-200 p-6 space-y-6 shadow-sm rounded-xl">
            <h3 className="text-sm font-semibold text-slate-800 font-mono uppercase tracking-wider border-b border-slate-200 pb-3">
              Wholesale Invoice Summary
            </h3>

            <div className="space-y-3.5 text-xs font-mono text-slate-550 font-bold uppercase">
              <div className="flex justify-between">
                <span>Subtotal (ex. GST):</span>
                <span className="text-slate-900 font-bold">${subtotal.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between">
                <span>GST (Tax 10%):</span>
                <span className="text-slate-900 font-bold">${gstAmount.toFixed(2)} AUD</span>
              </div>
              
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-sm font-sans">
                <span className="text-slate-800 font-semibold uppercase tracking-tight">Total Invoice Value:</span>
                <span className="text-blue-600 font-bold text-xl font-mono">
                  ${totalAmount.toFixed(2)} AUD
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-650 text-red-650 p-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wide" id="cart_submission_error">
                {error}
              </div>
            )}

            <button
              id="submit_wholesale_order_btn"
              onClick={handleSubmitOrder}
              disabled={isSubmitting || !canSubmit()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-widest text-xs py-3.5 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing Invoice...
                </>
              ) : !canSubmit() ? (
                "Select Customer First"
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {isActualAdmin && orderForMode !== "self" ? "Submit On Behalf Of" : "Submit & Generate Invoice"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-[10px] text-slate-550 space-y-2 leading-normal font-semibold uppercase">
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Submitting generates an official invoice for payment and an equipment packing slip instantly.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>GST reports are logged to your administrator account for quarterly tax and BAS filings.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
