import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Product } from "../types";
import { Search, Eye, ShieldAlert, ShoppingCart, HelpCircle, Check, Sparkles, Zap, Pencil } from "lucide-react";
import { ProductPlaceholderImage } from "./ProductPlaceholderImage";
import { useToast } from "./ui/ToastContext";
import { Button } from "./ui/Button";

interface CatalogViewProps {
  onOpenProductDetail: (prodId: string) => void;
  onOpenRegistration: () => void;
  onOpenQuickOrder?: () => void;
  onEditProduct?: (productId: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ 
  onOpenProductDetail, 
  onOpenRegistration,
  onOpenQuickOrder,
  onEditProduct
}) => {
  const { 
    products, 
    currentUser, 
    addToCart, 
    isAdmin 
  } = usePortal();

  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qtyPicker, setQtyPicker] = useState<{ [productId: string]: number }>({});
  const [justAdded, setJustAdded] = useState<{ [productId: string]: boolean }>({});
  const [selectedColorsState, setSelectedColorsState] = useState<{ [productId: string]: string[] }>({});

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category || "General"))) as string[]];

  const isApproved = currentUser?.status === "approved";
  const isPending = currentUser?.status === "pending";
  const isGuest = !currentUser;

  const visibleProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.sku.toLowerCase().includes(search.toLowerCase()) ||
                          product.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || (product.category || "General") === selectedCategory;

    if (!matchesSearch || !matchesCategory) return false;

    if (product.isRestricted) {
      if (isAdmin || currentUser?.email === "lew@desmoproducts.com.au" || currentUser?.email === "1@1.com") return true;
      if (isApproved && currentUser?.allowedProducts?.includes(product.id)) {
        return true;
      }
      return false;
    }

    return true;
  });

  const handleQtyChange = (productId: string, val: number) => {
    if (val < 1) val = 1;
    setQtyPicker(prev => ({ ...prev, [productId]: val }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = qtyPicker[product.id] || 1;
    const colors = product.colors ? (selectedColorsState[product.id] || []) : undefined;
    addToCart(product, qty, colors);
    
    showToast('Added to Cart', `${qty}x ${product.name} added to cart.`, 'success');

    setJustAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setJustAdded(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-10" id="catalog_view_container">
      {/* Welcome Banners */}
      {isGuest && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm rounded-2xl" id="guest_welcome_banner">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-slate-100">
              Desmo Products Wholesale Portal
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
              We wholesale high-precision electrical testing equipment exclusively to approved commercial accounts. 
              Register below to apply for a custom pricing profile and gain placing order credentials.
            </p>
          </div>
          <Button
            id="register_now_btn"
            onClick={onOpenRegistration}
            variant="primary"
            size="lg"
          >
            Create Wholesale Account
          </Button>
        </div>
      )}

      {isPending && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl shadow-sm" id="pending_approval_banner">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-full">
              Pending Approval
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Registration Received for <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentUser?.companyName}</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Your account is currently under review by lew@desmoproducts.com.au. Once approved, you will be sent your welcome credentials, see your customized dealer pricing, and can place orders. Standard catalog browsing is enabled below without wholesale rates.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Authorized Wholesale Account
            </div>
            <h3 className="text-xl font-bold">Welcome back, {currentUser.companyName}</h3>
            <p className="text-xs text-blue-100 mt-1">Tier & Volume Rate Breaks automatically applied at checkout.</p>
          </div>
          {onOpenQuickOrder && (
            <Button
              onClick={onOpenQuickOrder}
              variant="secondary"
              leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            >
              Quick Order (Bulk SKU)
            </Button>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, name..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="product_grid">
        {visibleProducts.map((product) => {
          const qty = qtyPicker[product.id] || 1;
          const isAdded = justAdded[product.id];

          return (
            <div
              key={product.id}
              className="group flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Image Placeholder */}
                <div
                  className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => onOpenProductDetail(product.id)}
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ProductPlaceholderImage name={product.name} category={product.category} />
                  )}
                  <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {product.sku}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {product.category || "General"}
                  </span>
                  <div className="flex items-center justify-between gap-2 group/title">
                    <h4
                      className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 cursor-pointer hover:text-blue-600"
                      onClick={() => onOpenProductDetail(product.id)}
                    >
                      {product.name}
                    </h4>
                    {isAdmin && onEditProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct(product.id);
                        }}
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0"
                        title="Edit Product Details"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Wholesale Base</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {isApproved || isAdmin ? `$${product.baseWholesalePrice.toFixed(2)}` : 'Log in for price'}
                  </span>
                </div>

                {isApproved && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => handleQtyChange(product.id, parseInt(e.target.value, 10))}
                      className="w-14 px-2 py-1.5 text-xs text-center border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      variant={isAdded ? 'secondary' : 'primary'}
                      leftIcon={isAdded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                    >
                      {isAdded ? 'Added' : 'Add'}
                    </Button>
                  </div>
                )}

                {!isApproved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenProductDetail(product.id)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
