import React from "react";
import { usePortal } from "../context/PortalContext";
import { 
  Wrench, 
  User, 
  ShoppingCart, 
  FileText, 
  TrendingUp, 
  LogOut, 
  Clock,
  Search,
  Zap,
  Bookmark,
  Shield
} from "lucide-react";
import { Button } from "./ui/Button";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProductDetail: (prodId: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onOpenQuickOrder?: () => void;
  onOpenTemplates?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenProductDetail, 
  searchQuery, 
  onSearchQueryChange, 
  onSearchSubmit,
  onOpenQuickOrder,
  onOpenTemplates
}) => {
  const { 
    currentUser, 
    isAdmin, 
    cart, 
    logout, 
    isActualAdmin,
    adminViewMode,
    setAdminViewMode,
    orders
  } = usePortal();

  const adminWaitingQuotes = isAdmin ? orders.filter(
    (o) => o.documentType === "QUOTE" && (o.status === "quote_requested" || o.status === "pending_approval")
  ) : [];

  const customerWaitingQuotes = (!isAdmin && currentUser) ? orders.filter(
    (o) => o.customerId === currentUser.id && o.documentType === "QUOTE" && o.status === "quote_finalized"
  ) : [];

  const formatTime = () => {
    return new Date().toLocaleDateString('en-AU', {
      timeZone: 'Australia/Perth',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-40 shadow-sm" id="header_container">
      {/* Upper bar: AWST Clock & User status */}
      <div className="bg-slate-50 dark:bg-slate-950 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Perth: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{formatTime()}</strong></span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400">
            Official B2B Wholesale Portal
          </span>
        </div>

        {onOpenQuickOrder && currentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQuickOrder}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <Zap className="w-3 h-3" /> Quick Order (Bulk SKU)
            </button>
            {onOpenTemplates && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={onOpenTemplates}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  <Bookmark className="w-3 h-3" /> Order Templates
                </button>
              </>
            )}

            {isActualAdmin && currentUser && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-1.5" id="admin_persona_switcher">
                  <select
                    id="admin_view_mode_select"
                    value={adminViewMode}
                    onChange={(e) => setAdminViewMode(e.target.value as any)}
                    className="text-[10px] font-bold font-mono bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer uppercase"
                  >
                    <option value="admin">Admin View</option>
                    <option value="customer">Customer View</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Header navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setActiveTab("catalog"); onOpenProductDetail(null); }}>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-blue-600 dark:text-blue-500">
              Desmo <span className="text-slate-900 dark:text-white">Products</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 tracking-[0.25em] uppercase font-mono">
              ELECTRICAL TESTING EQUIPMENT
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {currentUser && (
          <nav className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-inner" id="main_navigation">
            <button
              id="nav_catalog"
              onClick={() => { setActiveTab("catalog"); onOpenProductDetail(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "catalog"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Catalog
            </button>

            {(isActualAdmin || currentUser.status === "approved") && (
              <button
                id="nav_cart"
                onClick={() => { setActiveTab("cart"); onOpenProductDetail(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative ${
                  activeTab === "cart"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cart.length > 0 && (
                  <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-white dark:border-slate-900">
                    {cart.reduce((sum, i) => sum + i.qty, 0)}
                  </span>
                )}
              </button>
            )}

            <button
              id="nav_orders"
              onClick={() => { setActiveTab("orders"); onOpenProductDetail(null); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              {isAdmin ? "Orders & Invoices" : "Quotes & Invoices"}
            </button>

            {currentUser.status === "approved" && !isAdmin && (
              <button
                id="nav_warranties"
                onClick={() => { setActiveTab("warranties"); onOpenProductDetail(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "warranties"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
                }`}
              >
                <Shield className="w-4 h-4" />
                Warranties
              </button>
            )}

            {isAdmin && (
              <button
                id="nav_admin"
                onClick={() => { setActiveTab("admin"); onOpenProductDetail(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "admin"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                GST & Admin
              </button>
            )}
          </nav>
        )}

        {currentUser && (
          <form
            className="w-full md:w-[160px] lg:w-[180px] shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
          >
            <label className="sr-only" htmlFor="header_ledger_search">Search Quotes and Invoices</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="header_ledger_search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search quotes & invoices..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </form>
        )}

        {/* Login status */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Logged In As</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{currentUser.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Log Out
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab("login")}
              leftIcon={<User className="w-4 h-4" />}
            >
              Log In
            </Button>
          )}

        </div>
      </div>

      {/* Quote Waiting Highlight Banner */}
      {(adminWaitingQuotes.length > 0 || customerWaitingQuotes.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-md flex items-center justify-between border-t border-amber-400/30">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-white text-orange-600 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1 animate-pulse">
                <span>⚠️</span> Quote Waiting
              </span>
              <span className="font-bold tracking-wide">
                {isAdmin
                  ? `Attention Required: ${adminWaitingQuotes.length} new quote request${adminWaitingQuotes.length > 1 ? 's' : ''} awaiting finalization & freight pricing!`
                  : `Action Required: You have ${customerWaitingQuotes.length} finalized quote${customerWaitingQuotes.length > 1 ? 's' : ''} ready for review!`
                }
              </span>
            </div>
            <button
              onClick={() => {
                if (isAdmin) {
                  setActiveTab("admin");
                } else {
                  setActiveTab("orders");
                }
                onOpenProductDetail(null);
              }}
              className="bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
            >
              View Quotes →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
