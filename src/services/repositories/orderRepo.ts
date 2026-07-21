import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, checkFirebaseReady } from '../firebase/client';
import { Order, DocumentStatus } from '../../types';

export class OrderRepository {
  private collectionName = 'orders';

  async getAllOrders(): Promise<Order[]> {
    if (!checkFirebaseReady() || !db) return [];
    try {
      const snap = await getDocs(collection(db, this.collectionName));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    } catch (err) {
      console.error("Error in OrderRepository.getAllOrders:", err);
      return [];
    }
  }

  async saveOrder(order: Order): Promise<boolean> {
    if (!checkFirebaseReady() || !db) return false;
    try {
      const docRef = doc(db, this.collectionName, order.id);
      await setDoc(docRef, order, { merge: true });
      return true;
    } catch (err) {
      console.error(`Error saving order ${order.id}:`, err);
      return false;
    }
  }

  async updateOrderStatus(orderId: string, status: DocumentStatus): Promise<boolean> {
    if (!checkFirebaseReady() || !db) return false;
    try {
      const docRef = doc(db, this.collectionName, orderId);
      await updateDoc(docRef, { status });
      return true;
    } catch (err) {
      console.error(`Error updating status for order ${orderId}:`, err);
      return false;
    }
  }

  async deleteOrder(orderId: string): Promise<boolean> {
    if (!checkFirebaseReady() || !db) return false;
    try {
      const docRef = doc(db, this.collectionName, orderId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error(`Error deleting order ${orderId}:`, err);
      return false;
    }
  }
}

export const orderRepository = new OrderRepository();
