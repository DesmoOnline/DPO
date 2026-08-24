import { Firestore, doc, updateDoc, getDoc } from "firebase/firestore";

export const customerService = {
  async approveCustomer(db: Firestore, customerId: string): Promise<void> {
    await updateDoc(doc(db, "users", customerId), {
      status: "approved",
      approvedAt: new Date().toISOString()
    });
  },

  async rejectCustomer(db: Firestore, customerId: string): Promise<void> {
    await updateDoc(doc(db, "users", customerId), {
      status: "declined"
    });
  },

  async updateCustomerPricing(db: Firestore, customerId: string, productId: string, price: number): Promise<void> {
    const key = `customPricing.${productId}`;
    await updateDoc(doc(db, "users", customerId), {
      [key]: price
    });
  },

  async removeCustomerPricing(db: Firestore, customerId: string, productId: string): Promise<void> {
    const key = `customPricing.${productId}`;
    const { deleteField } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", customerId), {
      [key]: deleteField()
    });
  },

  async updateCustomerRole(db: Firestore, customerId: string, role: "customer" | "admin" | "staff"): Promise<void> {
    await updateDoc(doc(db, "users", customerId), { role });
  },

  async updateCustomerAllowedProducts(db: Firestore, customerId: string, productIds: string[]): Promise<void> {
    await updateDoc(doc(db, "users", customerId), { allowedProducts: productIds });
  },

  async assignPricingTier(db: Firestore, customerId: string, tierId: string | null): Promise<void> {
    await updateDoc(doc(db, "users", customerId), { pricingTierId: tierId });
  },

  async updateProductRateBreakAlignment(db: Firestore, customerId: string, productId: string, rateBreakId: string | null): Promise<void> {
    const customerRef = doc(db, "users", customerId);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
      const productRateBreakAlignments = snap.data().productRateBreakAlignments || {};
      if (rateBreakId) {
        productRateBreakAlignments[productId] = rateBreakId;
      } else {
        delete productRateBreakAlignments[productId];
      }
      await updateDoc(customerRef, { productRateBreakAlignments });
    }
  },

  async toggleRestrictedProductAccess(db: Firestore, customerId: string, productId: string): Promise<void> {
    const customerRef = doc(db, "users", customerId);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
      const allowedProducts = snap.data().allowedProducts || [];
      const index = allowedProducts.indexOf(productId);
      if (index > -1) {
        allowedProducts.splice(index, 1);
      } else {
        allowedProducts.push(productId);
      }
      await updateDoc(customerRef, { allowedProducts });
    }
  }
};
