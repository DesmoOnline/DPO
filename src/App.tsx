/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { 
  ShieldCheck, 
  Settings, 
  HelpCircle, 
  Info,
  Wrench,
  WrenchIcon
} from "lucide-react";

function AppContent() {
  const { currentUser, isAdmin } = usePortal();
  
  // Navigation tabs: "catalog" | "cart" | "orders" | "admin" | "registration"
  const [activeTab, setActiveTab] = useState<string>("catalog");
  
  // Sub-detail view states
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPackingSlipId, setSelectedPackingSlipId] = useState<string | null>(null);

  // Helper callbacks to jump between detailed views
  const handleOpenProductDetail = (prodId: string | null) => {
    setSelectedProductId(prodId);
    setSelectedInvoiceId(null);
    setSelectedPackingSlipId(null);
    if (prodId) {
      setActiveTab("catalog"); // Details is nested in catalog
    }
  };

  const handleOpenInvoice = (orderId: string) => {
    setSelectedInvoiceId(orderId);
    setSelectedPackingSlipId(null);
    setSelectedProductId(null);
    setActiveTab("orders"); // Invoices is nested under orders
  };

  const handleOpenPackingSlip = (orderId: string) => {
    setSelectedPackingSlipId(orderId);
    setSelectedInvoiceId(null);
    setSelectedProductId(null);
    setActiveTab("orders");
  };

  const handleRegistrationCompleted = () => {
    setActiveTab("catalog");
    setSelectedProductId(null);
  };

  // Main Page View Switcher
  const renderMainContent = () => {
    // 1. If currently registering
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

    // 2. If viewing a specific Packing Slip Detail
    if (activeTab === "orders" && selectedPackingSlipId) {
      return (
        <PackingSlipDetail
          orderId={selectedPackingSlipId}
          onBack={() => setSelectedPackingSlipId(null)}
          onViewInvoice={handleOpenInvoice}
        />
      );
    }

    // 3. If viewing a specific Invoice Detail
    if (activeTab === "orders" && selectedInvoiceId) {
      return (
        <InvoiceDetail
          orderId={selectedInvoiceId}
          onBack={() => setSelectedInvoiceId(null)}
          onViewPackingSlip={handleOpenPackingSlip}
        />
      );
    }

    // 4. If viewing a Product Detail page
    if (activeTab === "catalog" && selectedProductId) {
      return (
        <ProductDetailPage
          productId={selectedProductId}
          onBack={() => setSelectedProductId(null)}
        />
      );
    }

    // Standard tab navigations
    switch (activeTab) {
      case "cart":
        return (
          <CartView
            onOrderCompleted={handleOpenInvoice}
            onNavigateToCatalog={() => setActiveTab("catalog")}
          />
        );
      case "orders":
        return (
          <OrdersListView
            onViewInvoice={handleOpenInvoice}
            onViewPackingSlip={handleOpenPackingSlip}
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
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-black font-sans flex flex-col justify-between" id="app_body_wrapper">
      <div className="space-y-0">
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenProductDetail={setSelectedProductId}
        />

        <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-1 min-h-[500px]">
          {renderMainContent()}
        </main>
      </div>

      {/* Corporate Info Footer */}
      <footer className="bg-black text-white py-10 px-6 text-xs font-mono border-t-8 border-orange-600" id="app_footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 text-white p-1 rounded-none">
              <Wrench className="w-4 h-4 text-black font-black" />
            </div>
            <span className="font-bold uppercase tracking-wider">© 2026 Desmo Products Pty Ltd • ALL RIGHTS RESERVED • WHOLESALE PORTAL v2.1</span>
          </div>

          <div className="flex gap-4 font-bold uppercase tracking-wider">
            <a href="mailto:lew@desmoproducts.com.au" className="text-orange-600 hover:underline transition">Contact Lew (HQ)</a>
            <span>•</span>
            <span className="text-slate-400">AES-256 SECURED • 10% AUSTRALIAN GST INCLUDED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PortalProvider>
      <AppContent />
    </PortalProvider>
  );
}
