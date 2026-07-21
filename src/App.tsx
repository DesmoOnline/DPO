import React, { useState } from "react";
import { PortalProvider, usePortal } from "./context/PortalContext";
import { Header } from "./components/Header";
import { CatalogView } from "./components/CatalogView";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { CartView } from "./components/CartView";
import { InvoiceDetail } from "./components/InvoiceDetail";
import { PackingSlipDetail } from "./components/PackingSlipDetail";
import { OrdersListView } from "./components/OrdersListView";
import { AdminDashboard } from "./components/AdminDashboard";
import { RegistrationForm } from "./components/RegistrationForm";
import { LoginView } from "./components/LoginView";
import { WarrantyView } from "./components/WarrantyView";
import { ToastProvider } from "./components/ui/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QuickOrderModal } from "./components/QuickOrderModal";
import { OrderTemplateModal } from "./components/OrderTemplateModal";
import { EditProductModal } from "./components/EditProductModal";
import { ShieldCheck, Wrench } from "lucide-react";

function AppContent() {
  const { currentUser, isAdmin, products, cart, addToCart, replaceCart } = usePortal();
  
  const [activeTab, setActiveTab] = useState<string>("catalog");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPackingSlipId, setSelectedPackingSlipId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const handleOpenProductDetail = (prodId: string | null) => {
    setSelectedProductId(prodId);
    setSelectedInvoiceId(null);
    setSelectedPackingSlipId(null);
    if (prodId) {
      setActiveTab("catalog");
    }
  };

  const handleOpenInvoice = (orderId: string) => {
    setSelectedInvoiceId(orderId);
    setSelectedPackingSlipId(null);
    setSelectedProductId(null);
    setActiveTab("orders");
  };

  const handleOpenPackingSlip = (orderId: string) => {
    setSelectedPackingSlipId(orderId);
    setSelectedInvoiceId(null);
    setSelectedProductId(null);
    setActiveTab("orders");
  };

  const handleSearchSubmit = () => {
    setSelectedPackingSlipId(null);
    setSelectedInvoiceId(null);
    setSelectedProductId(null);
    setActiveTab("orders");
  };

  const handleRegistrationCompleted = () => {
    setActiveTab("catalog");
    setSelectedProductId(null);
  };

  const renderMainContent = () => {
    if (activeTab === "registration") {
      return (
        <RegistrationForm
          onSuccess={handleRegistrationCompleted}
          onCancel={() => setActiveTab("catalog")}
        />
      );
    }

    if (activeTab === "login") {
      return (
        <LoginView 
          onSuccess={() => setActiveTab("catalog")}
          onCancel={() => setActiveTab("catalog")}
        />
      );
    }

    if (activeTab === "orders" && selectedPackingSlipId) {
      return (
        <PackingSlipDetail
          orderId={selectedPackingSlipId}
          onBack={() => setSelectedPackingSlipId(null)}
          onViewInvoice={handleOpenInvoice}
        />
      );
    }

    if (activeTab === "orders" && selectedInvoiceId) {
      return (
        <InvoiceDetail
          orderId={selectedInvoiceId}
          onBack={() => setSelectedInvoiceId(null)}
          onViewPackingSlip={handleOpenPackingSlip}
        />
      );
    }

    if (activeTab === "catalog" && selectedProductId) {
      return (
        <ProductDetailPage
          productId={selectedProductId}
          onBack={() => setSelectedProductId(null)}
        />
      );
    }

    switch (activeTab) {
      case "cart":
        return (
          <CartView
            onOrderCompleted={handleOpenInvoice}
            onNavigateToCatalog={() => setActiveTab("catalog")}
          />
        );
      case "warranties":
        return <WarrantyView />;
      case "orders":
        return (
          <OrdersListView
            onViewInvoice={handleOpenInvoice}
            onViewPackingSlip={handleOpenPackingSlip}
            searchQuery={ledgerSearchQuery}
            onSearchQueryChange={setLedgerSearchQuery}
          />
        );
      case "admin":
        if (isAdmin) {
          return <AdminDashboard />;
        }
        return (
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-8 text-center" id="app_admin_fallback">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-200 font-bold">Access Denied</h3>
            <p className="text-slate-400 text-xs mt-2">Administrative dashboard is locked. Switch persona to Lew to unlock bookkeeping metrics.</p>
          </div>
        );
      case "catalog":
      default:
        return (
          <CatalogView
            onOpenProductDetail={handleOpenProductDetail}
            onOpenRegistration={() => setActiveTab("registration")}
            onOpenQuickOrder={() => setIsQuickOrderOpen(true)}
            onEditProduct={setEditingProductId}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between" id="app_body_wrapper">
      <div className="space-y-0">
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenProductDetail={setSelectedProductId}
          searchQuery={ledgerSearchQuery}
          onSearchQueryChange={setLedgerSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onOpenQuickOrder={() => setIsQuickOrderOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
        />

        <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 min-h-[500px]">
          {renderMainContent()}
        </main>
      </div>

      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        products={products}
        onAddToCart={(prod, qty) => addToCart(prod, qty)}
      />

      <OrderTemplateModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        currentCartItems={cart}
        products={products}
        onLoadTemplate={(items) => {
          if (replaceCart) {
            replaceCart(items);
          }
        }}
      />

      {editingProductId && (
        <EditProductModal 
          product={products.find(p => p.id === editingProductId)!} 
          onClose={() => setEditingProductId(null)} 
        />
      )}

      <footer className="bg-slate-900 text-slate-300 py-8 px-6 text-xs font-mono border-t-4 border-blue-600" id="app_footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Wrench className="w-4 h-4 font-black" />
            </div>
            <span className="font-bold uppercase tracking-wider">© 2026 Desmo Products Pty Ltd • ALL RIGHTS RESERVED • WORLD-CLASS B2B PORTAL v3.0</span>
          </div>

          <div className="flex gap-4 font-bold uppercase tracking-wider">
            <a href="mailto:lew@desmoproducts.com.au" className="text-blue-400 hover:underline transition">Contact Lew (HQ)</a>
            <span>•</span>
            <span className="text-slate-400">10% AUSTRALIAN GST INCLUDED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PortalProvider>
          <AppContent />
        </PortalProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
