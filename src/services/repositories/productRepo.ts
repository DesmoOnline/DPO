import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, checkFirebaseReady } from '../firebase/client';
import { Product } from '../../types';

export class ProductRepository {
  private collectionName = 'products';

  async getAllProducts(): Promise<Product[]> {
    if (!checkFirebaseReady() || !db) return [];
    try {
      const snap = await getDocs(collection(db, this.collectionName));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (err) {
      console.error("Error in ProductRepository.getAllProducts:", err);
      return [];
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!checkFirebaseReady() || !db) return null;
    try {
      const docRef = doc(db, this.collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Product;
      }
      return null;
    } catch (err) {
      console.error(`Error in ProductRepository.getProductById(${id}):`, err);
      return null;
    }
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    if (!checkFirebaseReady() || !db) return false;
    try {
      const docRef = doc(db, this.collectionName, productId);
      await updateDoc(docRef, { stock: newStock });
      return true;
    } catch (err) {
      console.error(`Error updating stock for ${productId}:`, err);
      return false;
    }
  }

  async saveProduct(product: Product): Promise<boolean> {
    if (!checkFirebaseReady() || !db) return false;
    try {
      const docRef = doc(db, this.collectionName, product.id);
      await setDoc(docRef, product, { merge: true });
      return true;
    } catch (err) {
      console.error(`Error saving product ${product.id}:`, err);
      return false;
    }
  }
}

export const productRepository = new ProductRepository();
