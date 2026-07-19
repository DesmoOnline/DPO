import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
} from "firebase/firestore";
import { WeightBreakTemplate, QuantityBreak } from "../types";

const WEIGHT_BREAKS_COLLECTION = "weightBreakTemplates";

/**
 * Create a new weight break template
 */
export async function createWeightBreakTemplate(
  templateData: Omit<WeightBreakTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">,
  userId: string
): Promise<string> {
  const now = new Date().toISOString();
  const templateRef = doc(collection(db, WEIGHT_BREAKS_COLLECTION));
  const newTemplate: WeightBreakTemplate = {
    id: templateRef.id,
    ...templateData,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  await setDoc(templateRef, newTemplate);
  return templateRef.id;
}

/**
 * Get a single weight break template by ID
 */
export async function getWeightBreakTemplate(
  templateId: string
): Promise<WeightBreakTemplate | null> {
  const docRef = doc(db, WEIGHT_BREAKS_COLLECTION, templateId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as WeightBreakTemplate;
}

/**
 * Get all weight break templates
 */
export async function getAllWeightBreakTemplates(): Promise<WeightBreakTemplate[]> {
  const q = query(collection(db, WEIGHT_BREAKS_COLLECTION));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as WeightBreakTemplate);
}

/**
 * Update a weight break template
 */
export async function updateWeightBreakTemplate(
  templateId: string,
  updates: Partial<Omit<WeightBreakTemplate, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  const docRef = doc(db, WEIGHT_BREAKS_COLLECTION, templateId);
  const now = new Date().toISOString();

  await updateDoc(docRef, {
    ...updates,
    updatedAt: now,
  });
}

/**
 * Delete a weight break template
 */
export async function deleteWeightBreakTemplate(templateId: string): Promise<void> {
  const docRef = doc(db, WEIGHT_BREAKS_COLLECTION, templateId);
  await deleteDoc(docRef);
}

/**
 * Get weight break templates assigned to a customer for a specific product
 */
export async function getCustomerWeightBreaksForProduct(
  weightBreakIds: string[] | undefined,
  productId: string
): Promise<WeightBreakTemplate[]> {
  if (!weightBreakIds || weightBreakIds.length === 0) {
    return [];
  }

  const templates: WeightBreakTemplate[] = [];
  for (const id of weightBreakIds) {
    const template = await getWeightBreakTemplate(id);
    if (template) {
      templates.push(template);
    }
  }
  return templates;
}

/**
 * Calculate price using weight break templates
 * If multiple templates assigned, use the one with the best discount
 */
export function calculatePriceWithWeightBreaks(
  basePrice: number,
  quantity: number,
  weightTemplates: WeightBreakTemplate[]
): { finalPrice: number; appliedTemplate?: WeightBreakTemplate; discountPercent: number } {
  if (weightTemplates.length === 0) {
    return { finalPrice: basePrice, discountPercent: 0 };
  }

  let bestPrice = basePrice;
  let bestTemplate: WeightBreakTemplate | undefined;
  let bestDiscount = 0;

  // Try each weight break template and pick the best price
  for (const template of weightTemplates) {
    const applicableBreak = template.quantityBreaks
      .sort((a, b) => b.minQty - a.minQty)
      .find((b) => quantity >= b.minQty);

    if (applicableBreak) {
      let price = basePrice;
      
      if (applicableBreak.discountType === "percentage") {
        price = basePrice * (1 - applicableBreak.discountValue / 100);
      } else {
        price = Math.max(0, basePrice - applicableBreak.discountValue);
      }

      // Use this template if it gives a better price
      if (price < bestPrice) {
        bestPrice = price;
        bestTemplate = template;
        bestDiscount = applicableBreak.discountType === "percentage" 
          ? applicableBreak.discountValue 
          : ((basePrice - price) / basePrice) * 100;
      }
    }
  }

  return {
    finalPrice: bestPrice,
    appliedTemplate: bestTemplate,
    discountPercent: bestDiscount,
  };
}
