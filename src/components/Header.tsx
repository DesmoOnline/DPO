import React from "react";
import { usePortal } from "../context/PortalContext";
import { 
  Wrench, 
  User, 
  ShoppingCart, 
  FileText, 
  TrendingUp, 
  LogOut, 
  Database, 
  AlertCircle,
  HelpCircle,
  Clock
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProductDetail: (prodId: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenProductDetail }) => {
  const { 
    currentUser, 
    isAdmin, 
    cart, 
    logout, 
    isFirebase, 
    isFirebaseConfigured, 
    setPortalMode,
    resetDemoData,
    customers,
    isActualAdmin,
    adminViewMode,
    setAdminViewMode
  } = usePortal();

  // Persona switcher has been replaced by LoginView

  // Helper UTC clock for Australian Western Standard Time (AWST)
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
    <header className="bg-white border-b border-slate-200 text-slate-800" id="header_container">
      {/* Upper bar: Mode selections and helper credentials info */}
      <div className="bg-slate-50 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5 text-slate-555">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Perth: <strong className="text-slate-800 font-semibold">{formatTime()}</strong></span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-slate-700">
            Account: <strong className="text-black font-bold">lew@desmoproducts.com.au</strong>
          </span>
        </div>

      </div>

      {/* Main Header navigation */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setActiveTab("catalog"); onOpenProductDetail(null); }}>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-[0.8] text-blue-600">
              Desmo<br/>
              <span className="text-slate-800">Products</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 mt-2 tracking-[0.25em] uppercase font-mono">
              HIGH-PRECISION ELECTRICAL TESTING EQUIPMENT
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {currentUser && (
          <nav className="flex flex-wrap items-center bg-slate-100 p-1 border border-slate-200 rounded-lg shadow-sm" id="main_navigation">
            <button
              id="nav_catalog"
              onClick={() => { setActiveTab("catalog"); onOpenProductDetail(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "catalog"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Catalog
            </button>

            {currentUser.status === "approved" && !isAdmin && (
              <button
                id="nav_cart"
                onClick={() => { setActiveTab("cart"); onOpenProductDetail(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition relative ${
                  activeTab === "cart"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cart.length > 0 && (
                  <span className="bg-slate-800 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center">
                    {cart.reduce((sum, i) => sum + i.qty, 0)}
                  </span>
                )}
              </button>
            )}

            <button
              id="nav_orders"
              onClick={() => { setActiveTab("orders"); onOpenProductDetail(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              {isAdmin ? "Orders & Invoices" : "My Invoices"}
            </button>

            {isAdmin && (
              <button
                id="nav_admin"
                onClick={() => { setActiveTab("admin"); onOpenProductDetail(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === "admin"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                GST & Admin
              </button>
            )}
          </nav>
        )}

        {/* Login status */}
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Logged In As:</span>
                  <span className="text-xs font-semibold text-slate-700">{currentUser.email}</span>
                </div>
                <button
                  id="header_logout_btn"
                  onClick={logout}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-900 border border-slate-200 transition rounded-lg shadow-sm flex items-center gap-1.5"
                  title="Log Out Current Session"
                >
                  <LogOut className="w-4 h-4 font-bold" />
                  <span className="text-xs font-bold uppercase">Log Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab("login")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white transition rounded-lg shadow-sm flex items-center gap-2 font-bold uppercase tracking-wider text-xs"
              >
                <User className="w-4 h-4" />
                Log In
              </button>
            )}
          </div>
          {isActualAdmin && currentUser && (
            <div className="flex items-center gap-1.5" id="admin_persona_switcher">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">View As:</span>
              <select
                id="admin_view_mode_select"
                value={adminViewMode}
                onChange={(e) => setAdminViewMode(e.target.value as any)}
                className="text-[10px] font-bold font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer uppercase"
              >
                <option value="admin">Admin (Lew)</option>
                <option value="customer">Customer View</option>
              </select>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};
