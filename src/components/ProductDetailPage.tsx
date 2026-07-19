import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { ArrowLeft, ShoppingCart, Check, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { ProductPlaceholderImage } from "./ProductPlaceholderImage";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, onBack }) => {
  const { 
    products, 
    currentUser, 
    addToCart, 
    isAdmin 
  } = usePortal();

  const [qty, setQty] = useState(1);
  const [calcQty, setCalcQty] = useState(10);
  const [justAdded, setJustAdded] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="text-center py-16 bg-slate-950 rounded-xl border border-slate-900" id="detail_not_found">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-slate-200 font-bold">Product Not Found</h3>
        <p className="text-slate-400 text-xs mt-2">The requested part could not be loaded or doesn't exist.</p>
        <button onClick={onBack} className="mt-4 bg-slate-900 text-slate-300 text-xs py-2 px-4 rounded border border-slate-800 hover:bg-slate-800 transition">
          Return to Catalog
        </button>
      </div>
    );
  }

  const isApproved = currentUser?.status === "approved";
  const isPending = currentUser?.status === "pending";
  const isGuest = !currentUser;

  // Security Access Guard for restricted products:
  if (product.isRestricted) {
    const isAllowed = isAdmin || (isApproved && currentUser?.allowedProducts?.includes(product.id));
    if (!isAllowed) {
      return (
        <div className="bg-slate-950 rounded-xl border border-red-950/40 p-12 text-center max-w-lg mx-auto space-y-4" id="detail_access_denied">
          <div className="bg-red-500/10 text-red-500 p-3 rounded-full inline-block">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Restricted Wholesale Part</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Access to this component is limited to authorized dealer accounts. 
            If your workshop requires this part, please contact lew@desmoproducts.com.au to enable restricted product mapping on your profile.
          </p>
          <button onClick={onBack} className="bg-slate-900 text-slate-300 text-xs py-2 px-4 rounded border border-slate-800 hover:bg-slate-800 transition">
            Back to Catalog
          </button>
        </div>
      );
    }
  }

  // Determine standard wholesale price vs custom price
  const hasCustomPricing = isApproved && currentUser?.customPricing && currentUser.customPricing[product.id] !== undefined;
  const customPrice = hasCustomPricing ? currentUser.customPricing[product.id] : null;
  const activePrice = customPrice !== null ? customPrice : product.baseWholesalePrice;

  // Qty breaks calculations helper
  const getPriceForQty = (quantity: number) => {
    let discountPercent = 0;
    if (product.quantityBreaks && product.quantityBreaks.length > 0) {
      const matchedBreak = [...product.quantityBreaks]
        .sort((a,b) => b.minQty - a.minQty)
        .find(qb => quantity >= qb.minQty);
      if (matchedBreak) {
        discountPercent = matchedBreak.discountPercent;
      }
    }
    const unitPrice = activePrice * (1 - discountPercent / 100);
    const lineSubtotal = unitPrice * quantity;
    const gst = lineSubtotal * 0.10;
    return {
      discountPercent,
      unitPrice: Number(unitPrice.toFixed(2)),
      subtotal: Number(lineSubtotal.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      total: Number((lineSubtotal + gst).toFixed(2))
    };
  };

  const handleAddToCart = () => {
    addToCart(product, qty, product.colors ? selectedColors : undefined);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const currentPricingInfo = getPriceForQty(qty);
  const estimateInfo = getPriceForQty(calcQty);

  return (
    <div className="space-y-8" id="product_detail_container">
      {/* Top Breadcrumb */}
      <div>
        <button 
          onClick={onBack}
          id="detail_back_btn"
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Back to Catalog
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10">
          
          {/* Left Side: Image */}
          <div className="space-y-4">
            <div className="aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
              <ProductPlaceholderImage
                sku={product.sku}
                name={product.name}
                category={product.category}
              />
              {product.isRestricted && (
                <div className="absolute top-4 right-4 bg-blue-600 text-white font-mono text-[10px] px-3 py-1.5 font-semibold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-white" />
                  RESTRICTED EQUIPMENT
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between text-xs font-mono font-medium text-slate-700">
              <span className="text-slate-550 uppercase">Instrument SKU</span>
              <span className="font-bold text-slate-900">{product.sku}</span>
            </div>
          </div>

          {/* Right Side: Details */}
          <div className="flex flex-col justify-between space-y-6">
            
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono block">
                  {product.category || "Electrical Instrument"}
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {product.name}
                </h2>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {product.description}
              </p>

              {/* Dynamic Pricing block */}
              {isGuest || isPending ? (
                <div className="bg-slate-50 border border-slate-200 p-6 text-center rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold block mb-2">Pricing Restricted</span>
                  <p className="text-sm text-blue-600 font-bold uppercase">Rates hidden for unapproved guests</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                    Wholesale pricing breaks are only visible to logged-in, approved dealer accounts. Please request an account or log in.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider block mb-1">Contract Base Rate (AUD):</span>
                      <div className="flex items-baseline gap-2">
                        {hasCustomPricing && (
                          <span className="text-xs text-slate-400 line-through font-mono">
                            ${product.baseWholesalePrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xl font-bold text-blue-600 font-mono">
                          ${activePrice.toFixed(2)} <span className="text-[10px] text-slate-500 font-medium uppercase ml-1">ex. GST</span>
                        </span>
                      </div>
                    </div>

                    {hasCustomPricing && (
                      <span className="bg-emerald-550 text-emerald-800 bg-emerald-50 border border-emerald-250 font-mono text-[9px] px-2.5 py-1 font-semibold uppercase tracking-wider rounded-md">
                        ★ Custom partner rate active
                      </span>
                    )}
                  </div>

                  {/* Quantity breaks pricing tier table */}
                  {product.quantityBreaks && product.quantityBreaks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Bulk Wholesale Tiered Rates:</span>
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs bg-white">
                        <table className="w-full text-left font-mono">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-250 text-[10px] uppercase">
                              <th className="px-3 py-2 font-semibold">Quantity Bracket</th>
                              <th className="px-3 py-2 text-right font-semibold">Discount</th>
                              <th className="px-3 py-2 text-right font-semibold">Unit Rate (ex. GST)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">1 - {(product.quantityBreaks[0].minQty - 1)}</td>
                              <td className="px-3 py-2 text-right text-slate-400">0%</td>
                              <td className="px-3 py-2 text-right font-medium">${activePrice.toFixed(2)}</td>
                            </tr>
                            {product.quantityBreaks.map((qb, i) => {
                              const discPrice = activePrice * (1 - qb.discountPercent / 100);
                              const nextQb = product.quantityBreaks?.[i + 1];
                              const maxQtyStr = nextQb ? ` - ${(nextQb.minQty - 1)}` : "+";
                              return (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-medium">{qb.minQty}{maxQtyStr} units</td>
                                  <td className="px-3 py-2 text-right text-emerald-600 font-bold">-{qb.discountPercent}%</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-900">${discPrice.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Interactive Cart insertion */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg shadow-sm">
                      <span className="text-[10px] font-semibold text-slate-500 px-2.5 uppercase font-mono">Qty:</span>
                      <input
                        id="detail_qty_input"
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 text-center bg-transparent border-none text-xs font-semibold text-slate-700 py-2 outline-none focus:ring-0 font-mono"
                      />
                    </div>

                    <div className="flex-1 flex flex-col font-mono">
                      <button
                        id="detail_add_to_cart_btn"
                        onClick={handleAddToCart}
                        className={`w-full font-semibold uppercase tracking-wider text-xs py-3 px-4 border transition flex items-center justify-center gap-1.5 rounded-lg shadow-sm ${
                          justAdded 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {justAdded ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            Added to Wholesale Order!
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 text-white" />
                            Add to Order • ${(currentPricingInfo.unitPrice * qty).toFixed(2)} AUD
                          </>
                        )}
                      </button>
                      {qty > 1 && currentPricingInfo.discountPercent > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-700 text-center mt-1.5 uppercase tracking-wide">
                          ✓ Applied {currentPricingInfo.discountPercent}% Volume Discount (saving ${(activePrice * qty - currentPricingInfo.subtotal).toFixed(2)} AUD)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Estimator Calculator for approved users */}
            {isApproved && (
              <div className="bg-slate-55/60 border border-slate-200 p-5 space-y-3 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-widest flex items-center gap-1">
                    <span>Estimator Desk Calculator</span>
                  </h4>
                  <div className="flex items-center bg-white border border-slate-250 rounded-lg p-1">
                    <span className="text-[9px] font-bold text-slate-500 px-1.5 font-mono uppercase">Units:</span>
                    <input
                      id="detail_calc_qty"
                      type="number"
                      min="1"
                      value={calcQty}
                      onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center bg-transparent border-none text-xs font-semibold text-slate-700 py-0.5 outline-none focus:ring-0 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Unit Cost:</span>
                    <span className="font-bold">${estimateInfo.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Discount:</span>
                    <span className="text-emerald-600 font-bold">-{estimateInfo.discountPercent}%</span>
                  </div>
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">GST (10%):</span>
                    <span className="font-bold">${estimateInfo.gst.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Total Cost:</span>
                    <span className="text-blue-600 font-bold">${estimateInfo.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};
