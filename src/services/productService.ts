import { Firestore, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Product } from "../types";

export const productService = {
  async createProduct(db: Firestore, product: Omit<Product, "id">): Promise<string> {
    const newId = `prod-${Math.random().toString(36).substr(2, 9)}`;
    await setDoc(doc(db, "products", newId), product);
    return newId;
  },

  async updateProduct(db: Firestore, productId: string, updatedFields: Partial<Product>): Promise<void> {
    const productRef = doc(db, "products", productId);
    await setDoc(productRef, updatedFields, { merge: true });
  },

  async deleteProduct(db: Firestore, productId: string): Promise<void> {
    await deleteDoc(doc(db, "products", productId));
  }
};
