import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Trash2, ShoppingCart, ShoppingBag, ArrowRight, FileText, CheckCircle } from "lucide-react";
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
    placeOrder 
  } = usePortal();

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser || currentUser.status !== "approved") {
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
    if (prod.quantityBreaks && prod.quantityBreaks.length > 0) {
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
      product: prod,
      qty: item.qty,
      originalPrice,
      discountPercent,
      finalPricePerUnit,
      totalLineAmount
    };
  });

  const subtotal = Number(processedItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
  const gstAmount = Number((subtotal * 0.10).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const order = await placeOrder(notes);
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
              {processedItems.map((item) => (
                <div key={item.product.id} id={`cart_item_${item.product.id}`} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition">
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative flex-shrink-0">
                      <ProductPlaceholderImage
                        sku={item.product.sku}
                        name={item.product.name}
                        category={item.product.category}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-800 hover:text-blue-600 tracking-tight">{item.product.name}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 uppercase font-semibold rounded">
                          {item.product.sku}
                        </span>
                        {item.discountPercent > 0 && (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold px-2 py-0.5 uppercase border border-emerald-200 rounded">
                            ★ -{item.discountPercent}% bulk tier
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity picker and price calculation */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg shadow-sm font-mono">
                      <button 
                        id={`cart_qty_dec_${item.product.id}`}
                        onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                        className="px-3 text-slate-700 hover:bg-slate-200/50 font-bold transition text-sm py-1 border-r border-slate-200"
                      >
                        -
                      </button>
                      <input 
                        id={`cart_qty_input_${item.product.id}`}
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-10 text-center bg-transparent border-none text-xs font-semibold text-slate-700 outline-none focus:ring-0"
                      />
                      <button 
                        id={`cart_qty_inc_${item.product.id}`}
                        onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                        className="px-3 text-slate-700 hover:bg-slate-200/50 font-bold transition text-sm py-1 border-l border-slate-200"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit & Line totals */}
                    <div className="text-right font-mono min-w-[120px]">
                      <span className="text-[9px] text-slate-400 block uppercase font-semibold">Unit price:</span>
                      <div className="flex items-center justify-end gap-1.5">
                        {item.discountPercent > 0 && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ${item.originalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-slate-800 text-xs font-bold">
                          ${item.finalPricePerUnit.toFixed(2)}
                        </span>
                      </div>
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
          </div>
        </div>

        {/* Right 1 Column: Summary */}
        <div className="space-y-4">
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
              disabled={isSubmitting}
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
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Submit & Generate Invoice
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
