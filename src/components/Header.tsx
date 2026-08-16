import React, { useState } from "react";
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
  Shield,
} from "lucide-react";
import { Button } from "./ui/Button";
import { AdminGuideModal } from "./AdminGuideModal";
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
  onOpenTemplates,
}) => {
  const [showAdminGuide, setShowAdminGuide] = useState(false);
  const {
    currentUser,
    isAdmin,
    cart,
    logout,
    isActualAdmin,
    adminViewMode,
    setAdminViewMode,
    orders,
  } = usePortal();
  const adminWaitingQuotes = isAdmin
    ? orders.filter(
        (o) =>
          o.documentType === "QUOTE" &&
          (o.status === "quote_requested" || o.status === "pending_approval"),
      )
    : [];
  const customerWaitingQuotes =
    !isAdmin && currentUser
      ? orders.filter(
          (o) =>
            o.customerId === currentUser.id &&
            o.documentType === "QUOTE" &&
            o.status === "quote_finalized",
        )
      : [];
  const formatTime = () => {
    return new Date().toLocaleDateString("en-AU", {
      timeZone: "Australia/Perth",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  return (
    <header
      className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-sm"
      id="header_container"
    >
      {" "}
      {/* Top Bar */}{" "}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-1.5 text-xs flex flex-nowrap sm:flex-wrap overflow-x-auto scrollbar-none items-center justify-between gap-4">
          {" "}
          <div className="flex items-center gap-3 font-mono whitespace-nowrap">
            {" "}
            <div className="flex items-center gap-1.5 text-slate-500">
              {" "}
              <Clock className="w-3.5 h-3.5 text-blue-600 " />{" "}
              <span>
                Perth:{" "}
                <strong className="text-slate-800 font-semibold">
                  {formatTime()}
                </strong>
              </span>{" "}
            </div>{" "}
            {isAdmin && (
              <>
                <span className="text-slate-300 ">|</span>{" "}
                <button 
                  onClick={() => setShowAdminGuide(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer uppercase tracking-wider"
                >
                  How-To Guide
                </button>
              </>
            )}
            <span className="text-slate-300 ">|</span>{" "}
            <span className="text-slate-600 ">
              {" "}
              Official B2B Wholesale Portal{" "}
            </span>{" "}
            {currentUser && !isAdmin && (
              <>
                {" "}
                <span className="text-slate-300 ">|</span>{" "}
                <span className="inline-flex items-center gap-1 bg-emerald-50 /60 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono">
                  {" "}
                  <Shield className="w-3 h-3 text-emerald-600" /> Approved Account
                  • Net 30 Terms{" "}
                </span>{" "}
              </>
            )}{" "}
          </div>{" "}
        {onOpenQuickOrder && currentUser && (
          <div className="flex items-center gap-2 whitespace-nowrap ml-auto sm:ml-0">
            {" "}
            <button
              onClick={onOpenQuickOrder}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              {" "}
              <Zap className="w-3 h-3" /> Quick Order (Bulk SKU){" "}
            </button>{" "}
            {onOpenTemplates && (
              <>
                {" "}
                <span className="text-slate-300 ">|</span>{" "}
                <button
                  onClick={onOpenTemplates}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:underline cursor-pointer"
                >
                  {" "}
                  <Bookmark className="w-3 h-3" /> Order Templates{" "}
                </button>{" "}
              </>
            )}{" "}
            {isActualAdmin && currentUser && (
              <>
                {" "}
                <span className="text-slate-300 ">|</span>{" "}
                <div
                  className="flex items-center gap-1.5"
                  id="admin_persona_switcher"
                >
                  {" "}
                  <select
                    id="admin_view_mode_select"
                    value={adminViewMode}
                    onChange={(e) => setAdminViewMode(e.target.value as any)}
                    className="text-[10px] font-bold font-mono bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer uppercase"
                  >
                    {" "}
                    <option value="admin">Admin View</option>{" "}
                    <option value="customer">Customer View</option>{" "}
                  </select>{" "}
                </div>{" "}
              </>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
      </div>{" "}
      {/* Main Header navigation */}{" "}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {" "}
        {/* Brand */}{" "}
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => {
            setActiveTab("catalog");
            onOpenProductDetail(null);
          }}
        >
          {" "}
          <img
            src="https://desmoproducts.com.au/wp-content/uploads/2021/04/logo.png"
            alt="Desmo Products - Electrical Testing Equipment"
            className="h-10 sm:h-12 w-auto object-contain"
          />{" "}
        </div>{" "}
        {/* Navigation Tabs */}{" "}
        {currentUser && (
          <nav
            className="flex flex-nowrap sm:flex-wrap items-center overflow-x-auto scrollbar-none w-full md:w-auto bg-slate-100/60 p-1 border border-slate-200 rounded-xl shadow-inner gap-1"
            id="main_navigation"
          >
            {" "}
            <button
              id="nav_catalog"
              onClick={() => {
                setActiveTab("catalog");
                onOpenProductDetail(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "catalog" ? "bg-amber-400 text-slate-950 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-200/60 :bg-slate-700"}`}
            >
              {" "}
              <Wrench className="w-4 h-4" /> Catalog{" "}
            </button>{" "}
            {(isActualAdmin || currentUser.status === "approved") && (
              <button
                id="nav_cart"
                onClick={() => {
                  setActiveTab("cart");
                  onOpenProductDetail(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === "cart" ? "bg-amber-400 text-slate-950 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-200/60 :bg-slate-700"}`}
              >
                {" "}
                <ShoppingCart className="w-4 h-4" /> Cart{" "}
                {cart.length > 0 && (
                  <span className="bg-slate-900 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-white ">
                    {" "}
                    {cart.reduce((sum, i) => sum + i.qty, 0)}{" "}
                  </span>
                )}{" "}
              </button>
            )}{" "}
            <button
              id="nav_orders"
              onClick={() => {
                setActiveTab("orders");
                onOpenProductDetail(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "orders" ? "bg-amber-400 text-slate-950 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-200/60 :bg-slate-700"}`}
            >
              {" "}
              <FileText className="w-4 h-4" />{" "}
              {isAdmin ? "Orders & Invoices" : "Quotes & Invoices"}{" "}
            </button>{" "}
            {currentUser.status === "approved" && !isAdmin && (
              <button
                id="nav_warranties"
                onClick={() => {
                  setActiveTab("warranties");
                  onOpenProductDetail(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "warranties" ? "bg-amber-400 text-slate-950 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-200/60 :bg-slate-700"}`}
              >
                {" "}
                <Shield className="w-4 h-4" /> Warranties{" "}
              </button>
            )}{" "}
            {isAdmin && (
              <button
                id="nav_admin"
                onClick={() => {
                  setActiveTab("admin");
                  onOpenProductDetail(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "admin" ? "bg-amber-400 text-slate-950 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-200/60 :bg-slate-700"}`}
              >
                {" "}
                <TrendingUp className="w-4 h-4" /> GST & Admin{" "}
              </button>
            )}{" "}
          </nav>
        )}{" "}
        {currentUser && (
          <form
            className="w-full md:w-[160px] lg:w-[180px] shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
          >
            {" "}
            <label className="sr-only" htmlFor="header_ledger_search">
              Search Quotes and Invoices
            </label>{" "}
            <div className="relative">
              {" "}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />{" "}
              <input
                id="header_ledger_search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search quotes & invoices..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />{" "}
            </div>{" "}
          </form>
        )}{" "}
        {/* Login status */}{" "}
        <div className="flex items-center gap-3">
          {" "}
          {currentUser ? (
            <div className="flex items-center gap-3">
              {" "}
              <div className="hidden sm:flex flex-col items-end">
                {" "}
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Logged In As
                </span>{" "}
                <span className="text-xs font-semibold text-slate-700 ">
                  {currentUser.email}
                </span>{" "}
              </div>{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                {" "}
                Log Out{" "}
              </Button>{" "}
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab("login")}
              leftIcon={<User className="w-4 h-4" />}
            >
              {" "}
              Log In{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Quote Waiting Highlight Banner */}{" "}
      {(adminWaitingQuotes.length > 0 || customerWaitingQuotes.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-md flex items-center justify-between border-t border-amber-400/30">
          {" "}
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            {" "}
            <div className="flex items-center gap-2.5">
              {" "}
              <span className="bg-white text-orange-600 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1 animate-pulse">
                {" "}
                <span>⚠️</span> Quote Waiting{" "}
              </span>{" "}
              <span className="font-bold tracking-wide">
                {" "}
                {isAdmin
                  ? `Attention Required: ${adminWaitingQuotes.length} new quote request${adminWaitingQuotes.length > 1 ? "s" : ""} awaiting finalization & freight pricing!`
                  : `Action Required: You have ${customerWaitingQuotes.length} finalized quote${customerWaitingQuotes.length > 1 ? "s" : ""} ready for review!`}{" "}
              </span>{" "}
            </div>{" "}
            <button
              onClick={() => {
                if (isAdmin) {
                  setActiveTab("admin");
                  setTimeout(
                    () =>
                      window.dispatchEvent(
                        new CustomEvent("open-admin-quotes"),
                      ),
                    10,
                  );
                } else {
                  setActiveTab("orders");
                }
                onOpenProductDetail(null);
              }}
              className="bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {" "}
              View Quotes →{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {showAdminGuide && <AdminGuideModal onClose={() => setShowAdminGuide(false)} />}
    </header>
  );
};
