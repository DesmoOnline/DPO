import { Firestore, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Order, OrderItem, DocumentType, Product } from "../types";

export const orderService = {
  async placeOrder(
    cart: { product: Product; qty: number; selectedColors?: string[] }[],
    currentUser: { id: string; status: string },
    isActualAdmin: boolean,
    notes?: string,
    onBehalfOf?: { customerId: string; customerEmail: string; companyName: string; customPricing?: { [productId: string]: number } },
    ownTransport?: boolean,
    deliveryAddress?: string,
    documentMode: DocumentType = "INVOICE"
  ): Promise<Order> {
    if (!currentUser) throw new Error("Authentication required to place orders");
    if (!isActualAdmin && currentUser.status !== "approved") throw new Error("Your account must be approved to order");
    if (cart.length === 0) throw new Error("Your cart is empty");

    const effectiveCustomerId = onBehalfOf ? onBehalfOf.customerId : currentUser.id;

    const payload = {
      customerId: effectiveCustomerId,
      cartItems: cart.map(item => ({
        productId: item.product.id,
        qty: item.qty,
        ...(item.selectedColors && item.selectedColors.length > 0 ? { selectedColors: item.selectedColors } : {})
      })),
      documentType: documentMode,
      notes,
      deliveryAddress,
      ownTransport
    };

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Checkout failed");
    }

    return data.order;
  },

  async editOrder(
    db: Firestore,
    orders: Order[],
    orderId: string,
    updatedItems: OrderItem[],
    newDeliveryAddress?: string
  ): Promise<Partial<Order>> {
    const existingOrder = orders.find(o => o.id === orderId);
    const shippingCharge = existingOrder?.shippingCharge || 0;
    
    const subtotal = Number(updatedItems.reduce((acc, item) => acc + item.totalLineAmount, 0).toFixed(2));
    const gstAmount = Number(((subtotal + shippingCharge) * 0.10).toFixed(2));
    const totalAmount = Number((subtotal + shippingCharge + gstAmount).toFixed(2));

    const updates: Partial<Order> = {
      items: updatedItems,
      subtotal,
      gstAmount,
      totalAmount,
    };
    if (newDeliveryAddress !== undefined) {
      updates.deliveryAddress = newDeliveryAddress;
    }

    await updateDoc(doc(db, "orders", orderId), updates as any);
    return updates;
  },

  async replicateOrder(db: Firestore, orders: Order[], orderId: string): Promise<string> {
    const src = orders.find(o => o.id === orderId);
    if (!src) throw new Error("Source order/quote not found");

    const isQuote = src.documentType === "QUOTE";
    const prefix = isQuote ? "QTE" : "INV";
    const nextId = `${prefix}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;

    const {
      approvedAt,
      paidAt,
      shippedAt,
      packingStatus,
      consignmentNote,
      freightCompany,
      ...rest
    } = src;

    const newOrder: Order = {
      ...rest,
      id: nextId,
      status: isQuote ? "quote_finalized" : "pending_approval",
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "orders", nextId), newOrder);
    return nextId;
  },

  async approveOrder(db: Firestore, orderId: string): Promise<void> {
    await updateDoc(doc(db, "orders", orderId), {
      status: "approved",
      approvedAt: new Date().toISOString()
    });
  },

  async declineOrder(db: Firestore, orderId: string): Promise<void> {
    await updateDoc(doc(db, "orders", orderId), {
      status: "declined"
    });
  },

  async deleteOrder(db: Firestore, orderId: string): Promise<void> {
    await deleteDoc(doc(db, "orders", orderId));
  },

  async addShippingCharge(db: Firestore, orderId: string, shippingCharge: number, creditAdjustment: number = 0): Promise<void> {
    const res = await fetch(`/api/orders/${orderId}/shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingCharge, creditAdjustment })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to update shipping charge");
    }
  },

  async updateOrderStatus(db: Firestore, orderId: string, status: Order["status"]): Promise<Partial<Order>> {
    const updates: Partial<Order> = { status };
    if (status === "paid") {
      updates.paidAt = new Date().toISOString();
    } else if (status === "shipped") {
      updates.shippedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, "orders", orderId), updates as any);
    return updates;
  },

  async updateOrderDispatch(
    db: Firestore,
    orderId: string,
    dispatch: { freightCompany: string; consignmentNote: string; packingStatus: "Packed" | "Hold" }
  ): Promise<void> {
    await updateDoc(doc(db, "orders", orderId), {
      freightCompany: dispatch.freightCompany,
      consignmentNote: dispatch.consignmentNote,
      packingStatus: dispatch.packingStatus
    });
  }
};
