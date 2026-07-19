import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Product } from "../types";
import { Search, Eye, ShieldAlert, ShoppingCart, HelpCircle, Check, Sparkles } from "lucide-react";
import { ProductPlaceholderImage } from "./ProductPlaceholderImage";

interface CatalogViewProps {
  onOpenProductDetail: (prodId: string) => void;
  onOpenRegistration: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onOpenProductDetail, onOpenRegistration }) => {
  const { 
    products, 
    currentUser, 
    addToCart, 
    isAdmin 
  } = usePortal();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qtyPicker, setQtyPicker] = useState<{ [productId: string]: number }>({});
  const [justAdded, setJustAdded] = useState<{ [productId: string]: boolean }>({});
  const [selectedColorsState, setSelectedColorsState] = useState<{ [productId: string]: string[] }>({});

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category || "General"))) as string[]];

  // Determine user permission levels
  const isApproved = currentUser?.status === "approved";
  const isPending = currentUser?.status === "pending";
  const isGuest = !currentUser;

  // Filter products based on user access
  const visibleProducts = products.filter(product => {
    // Search match
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.sku.toLowerCase().includes(search.toLowerCase()) ||
                          product.description.toLowerCase().includes(search.toLowerCase());
    
    // Category match
    const matchesCategory = selectedCategory === "All" || (product.category || "General") === selectedCategory;

    if (!matchesSearch || !matchesCategory) return false;

    // Restricted product checks:
    // If a product is restricted, it must only show to:
    // 1. Admins
    // 2. Approved customers whose allowedProducts contains the product ID
    if (product.isRestricted) {
      if (isAdmin) return true;
      if (isApproved && currentUser?.allowedProducts?.includes(product.id)) {
        return true;
      }
      return false; // Hide from guests, pending users, and unallowed approved customers
    }

    return true; // Public products are visible to all (pricing is hidden for guests/pending though)
  });

  const handleQtyChange = (productId: string, val: number) => {
    if (val < 1) val = 1;
    setQtyPicker(prev => ({ ...prev, [productId]: val }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = qtyPicker[product.id] || 1;
    const colors = product.colors ? (selectedColorsState[product.id] || []) : undefined;
    addToCart(product, qty, colors);
    
    // Trigger animation feedback
    setJustAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setJustAdded(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-10" id="catalog_view_container">
      {/* Customer Status Banner */}
      {isGuest && (
        <div className="bg-white border border-slate-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm rounded-xl" id="guest_welcome_banner">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-slate-900">
              Desmo Products Wholesale Portal
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed font-medium">
              We wholesale high-precision electrical testing equipment exclusively to approved commercial accounts. 
              Register below to apply for a custom pricing profile and gain placing order credentials.
            </p>
          </div>
          <button
            id="register_now_btn"
            onClick={onOpenRegistration}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition shadow-sm whitespace-nowrap"
          >
            Create Wholesale Account
          </button>
        </div>
      )}

      {isPending && (
        <div className="bg-amber-50/50 border border-amber-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl shadow-sm" id="pending_approval_banner">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-full">
              Pending Approval
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Registration Received for <span className="text-blue-600 font-semibold">{currentUser?.companyName}</span>
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Your account is currently under review by lew@desmoproducts.com.au. Once approved, you will be sent your welcome credentials, see your customized dealer pricing, and can place orders. Standard catalog browsing is enabled below without wholesale rates.
            </p>
          </div>
          <div className="text-xs font-semibold text-amber-800 bg-amber-100/50 px-4 py-2 border border-amber-200 rounded-lg uppercase tracking-wider whitespace-nowrap">
            Awaiting Admin Review
          </div>
        </div>
      )}

      {isApproved && (
        <div className="bg-emerald-50/50 border border-emerald-200 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl shadow-sm" id="approved_customer_banner">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-full">
              Wholesale Partner
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, <span className="text-blue-600 font-semibold">{currentUser?.companyName}</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your customized wholesale pricing structures and bulk quantity discounts are active below.
            </p>
          </div>
          <div className="flex flex-col items-end text-xs bg-emerald-100/50 p-4 border border-emerald-200 rounded-lg">
            <span className="text-slate-500 uppercase font-semibold text-[10px]">Account ID:</span>
            <span className="text-emerald-800 font-bold text-sm">{currentUser?.id}</span>
          </div>
        </div>
      )}

      {/* Catalog Search & Filter Controls */}
      <div className="bg-white border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm rounded-xl" id="catalog_filters">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="search_catalog_input"
            type="text"
            placeholder="Search equipment by name, SKU or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 text-slate-850 text-xs font-medium rounded-lg placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Categories Tab Pill List */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`cat_filter_${cat.toLowerCase().replace(/\s+/g, '_')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 border text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {visibleProducts.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-xl shadow-md w-full" id="no_products_found">
          <ShieldAlert className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tighter text-black">No Wholesale Parts Found</h3>
          <p className="text-slate-600 text-xs font-mono mt-2 uppercase font-bold tracking-wide">No components match your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="products_grid">
          {visibleProducts.map((product) => {
            // Determine price to show to customer
            const hasCustomPricing = isApproved && currentUser?.customPricing && currentUser.customPricing[product.id] !== undefined;
            const customPrice = hasCustomPricing ? currentUser.customPricing[product.id] : null;
            const activePrice = customPrice !== null ? customPrice : product.baseWholesalePrice;

            const qty = qtyPicker[product.id] || 1;

            // Calculate current discount and unit price for selected quantity
            let activeDiscountPercent = 0;
            let discountedPrice = activePrice;
            let isFixedDiscount = false;

            if (product.quantityBreaks && product.quantityBreaks.length > 0) {
              const matchedBreak = [...product.quantityBreaks]
                .sort((a,b) => b.minQty - a.minQty)
                .find(qb => qty >= qb.minQty);
              if (matchedBreak) {
                if (matchedBreak.discountType === "fixed") {
                  discountedPrice = matchedBreak.discountValue;
                  isFixedDiscount = true;
                } else if (matchedBreak.discountType === "percentage") {
                  activeDiscountPercent = matchedBreak.discountValue;
                  discountedPrice = Number((activePrice * (1 - activeDiscountPercent / 100)).toFixed(2));
                } else if (matchedBreak.discountPercent !== undefined) {
                  activeDiscountPercent = matchedBreak.discountPercent;
                  discountedPrice = Number((activePrice * (1 - activeDiscountPercent / 100)).toFixed(2));
                }
              }
            }

            const stock = product.stock ?? 0;
            const allowBackorders = product.allowBackorders ?? true;
            const isOutOfStock = stock <= 0 && !allowBackorders;
            const isBackorderOnly = stock <= 0 && allowBackorders;

            return (
              <div 
                key={product.id} 
                id={`product_card_${product.id}`}
                className="bg-white border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md rounded-xl shadow-sm"
              >
                {/* Image Section with restricted indicator */}
                <div className="relative aspect-video bg-slate-900 border-b border-slate-200 overflow-hidden group">
                  {product.imageUrl && product.imageUrl.startsWith("data:image") ? (
                    <img 
                      src={product.imageUrl} 
                      className="w-full h-full object-cover" 
                      alt={product.name} 
                    />
                  ) : (
                    <ProductPlaceholderImage
                      sku={product.sku}
                      name={product.name}
                      category={product.category}
                    />
                  )}
                  {product.isRestricted && (
                    <div className="absolute top-3 right-3 bg-blue-600 text-white font-mono text-[9px] px-2.5 py-1 font-semibold uppercase tracking-wider rounded-md shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-white" />
                      RESTRICTED EQUIPMENT
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[10px] font-mono px-2.5 py-1 font-semibold uppercase tracking-widest rounded border border-slate-700">
                    {product.sku}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 text-base tracking-tight leading-tight hover:text-blue-600 transition">
                        {product.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                      {product.description}
                    </p>
                    
                    {/* Stock level indicators */}
                    <div className="pt-1.5">
                      {isOutOfStock ? (
                        <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-0.5 uppercase">
                          Out of Stock (0)
                        </span>
                      ) : isBackorderOnly ? (
                        <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 uppercase">
                          Available on Backorder
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 uppercase">
                          In Stock {stock < 5 ? `(${stock})` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Matrix (Strict visibility checks) */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg space-y-2">
                    {isGuest || isPending ? (
                      <div className="text-center py-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-black block">Pricing Structure</span>
                        <p className="text-xs text-orange-600 font-bold uppercase mt-1.5 leading-snug">Rates hidden. Sign in or register for rates.</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-660 uppercase font-bold tracking-wider">Dealer Rate:</span>
                          <div className="flex flex-col items-end font-mono">
                            {hasCustomPricing && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ${product.baseWholesalePrice.toFixed(2)} AUD
                              </span>
                            )}
                             <span className="text-base font-bold text-blue-600">
                              ${activePrice.toFixed(2)} AUD
                            </span>
                          </div>
                        </div>

                        {/* If custom contract price active, show badge */}
                        {hasCustomPricing && (
                          <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider font-mono text-right mt-1">
                            ★ Custom Partner Rate Active
                          </div>
                        )}

                        {/* Current calculation including selected qty breaks */}
                        {qty > 1 && (activeDiscountPercent > 0 || isFixedDiscount) && (
                          <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-650 uppercase font-semibold">
                              {isFixedDiscount ? "Fixed Break Rate:" : `Qty Discount (${activeDiscountPercent}%):`}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              ${discountedPrice.toFixed(2)} AUD /ea
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Breaks details list if present and visible */}
                  {isApproved && product.quantityBreaks && product.quantityBreaks.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Volume Discounts:</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        {product.quantityBreaks.map((qb, idx) => (
                          <div key={idx} className="bg-slate-50 text-slate-700 px-2.5 py-1.5 border border-slate-200 flex justify-between font-medium rounded-lg">
                            <span>Buy {qb.minQty}+</span>
                            <span className="text-emerald-600 font-bold font-mono">
                              {qb.discountType === "fixed" ? `$${qb.discountValue.toFixed(0)} ea` : `-${qb.discountValue}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors selector if available */}
                  {isApproved && product.colors && product.colors.length > 0 && (
                    <div className="space-y-2 border-t border-slate-150 pt-3">
                      <span className="text-[9px] font-bold text-slate-505 uppercase tracking-widest font-mono block">Select Colors (Sold by Pack):</span>
                      <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto border border-slate-200 p-2 rounded-lg bg-slate-50/50">
                        {product.colors.map(color => {
                          const isSelected = (selectedColorsState[product.id] || []).includes(color);
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                const current = selectedColorsState[product.id] || [];
                                const updated = isSelected 
                                  ? current.filter(c => c !== color) 
                                  : [...current, color];
                                setSelectedColorsState(prev => ({ ...prev, [product.id]: updated }));
                              }}
                              className={`text-[9px] px-1.5 py-0.5 font-bold uppercase border rounded transition ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {color}
                            </button>
                          );
                        })}
                      </div>
                      {(selectedColorsState[product.id] || []).length === 0 && (
                        <p className="text-[9px] text-amber-600 font-bold uppercase font-mono animate-pulse">* Please select at least one colour pack.</p>
                      )}
                    </div>
                  )}

                  {/* Bottom interactions (Details page click and Add to Cart) */}
                  <div className="pt-4 flex items-center gap-2 border-t border-slate-100 font-mono">
                    <button
                      id={`view_details_${product.id}`}
                      onClick={() => onOpenProductDetail(product.id)}
                      className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold uppercase text-xs tracking-wider transition rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 flex-1 shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-slate-550" />
                      View
                    </button>

                    {isApproved && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg shadow-sm">
                          <input
                            id={`qty_input_${product.id}`}
                            type="number"
                            min="1"
                            max={!allowBackorders ? stock : undefined}
                            disabled={isOutOfStock}
                            value={qty}
                            onChange={(e) => handleQtyChange(product.id, parseInt(e.target.value) || 1)}
                            className="w-10 text-center bg-transparent border-none text-xs font-semibold text-slate-700 py-2 outline-none focus:ring-0 font-mono disabled:opacity-50"
                          />
                        </div>

                        <button
                          id={`add_to_cart_btn_${product.id}`}
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock || (product.colors && (selectedColorsState[product.id] || []).length === 0)}
                          className={`flex-1 font-semibold text-xs py-2.5 px-3 uppercase tracking-wider border transition flex items-center justify-center gap-1.5 rounded-lg shadow-sm disabled:opacity-50 ${
                            justAdded[product.id] 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : (isOutOfStock || (product.colors && (selectedColorsState[product.id] || []).length === 0))
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {justAdded[product.id] ? (
                            <>
                              <Check className="w-4 h-4" />
                              Added
                            </>
                          ) : isOutOfStock ? (
                            "Sold Out"
                          ) : (product.colors && (selectedColorsState[product.id] || []).length === 0) ? (
                            "Pick Color"
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
